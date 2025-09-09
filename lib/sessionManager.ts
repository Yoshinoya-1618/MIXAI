/**
 * セッション管理強化ユーティリティ
 * セキュリティ、セッション監視、タイムアウト機能を提供
 */

import { supabase } from './supabase'

export interface SessionInfo {
  userId: string
  email: string
  lastActivity: number
  deviceInfo: string
  ipAddress?: string
  userAgent?: string
  sessionStart: number
}

export interface SecuritySettings {
  sessionTimeout: number // 分
  maxInactivePeriod: number // 分
  requireReauthForSensitive: boolean
  enableDeviceTracking: boolean
}

export class SessionManager {
  private static instance: SessionManager
  private sessionInfo: SessionInfo | null = null
  private settings: SecuritySettings
  private inactivityTimer: NodeJS.Timeout | null = null
  private warningTimer: NodeJS.Timeout | null = null
  private listeners: ((event: SessionEvent) => void)[] = []

  private constructor() {
    this.settings = {
      sessionTimeout: 60, // 60分
      maxInactivePeriod: 30, // 30分
      requireReauthForSensitive: true,
      enableDeviceTracking: true
    }

    this.initializeEventListeners()
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // セッション開始
  async startSession(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        this.sessionInfo = {
          userId: session.user.id,
          email: session.user.email || '',
          lastActivity: Date.now(),
          deviceInfo: this.getDeviceInfo(),
          userAgent: navigator.userAgent,
          sessionStart: Date.now()
        }

        // アクティビティ追跡を開始
        this.startActivityTracking()
        this.notifyListeners({ type: 'session_started', data: this.sessionInfo })

        // セッション情報をログに記録（開発時のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('Session started:', this.sessionInfo)
        }
      }
    } catch (error) {
      console.error('Failed to start session:', error)
      this.notifyListeners({ type: 'session_error', data: error })
    }
  }

  // セッション終了
  async endSession(): Promise<void> {
    this.clearTimers()
    
    if (this.sessionInfo) {
      const sessionDuration = Date.now() - this.sessionInfo.sessionStart
      this.notifyListeners({ 
        type: 'session_ended', 
        data: { ...this.sessionInfo, duration: sessionDuration }
      })
    }

    this.sessionInfo = null
    await supabase.auth.signOut()
  }

  // アクティビティ更新
  updateActivity(): void {
    if (this.sessionInfo) {
      this.sessionInfo.lastActivity = Date.now()
      this.resetInactivityTimer()
    }
  }

  // セッション情報取得
  getSessionInfo(): SessionInfo | null {
    return this.sessionInfo
  }

  // セッションの有効性チェック
  isSessionValid(): boolean {
    if (!this.sessionInfo) return false

    const now = Date.now()
    const timeSinceLastActivity = now - this.sessionInfo.lastActivity
    const maxInactivity = this.settings.maxInactivePeriod * 60 * 1000

    return timeSinceLastActivity < maxInactivity
  }

  // 設定更新
  updateSettings(newSettings: Partial<SecuritySettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.notifyListeners({ type: 'settings_updated', data: this.settings })
  }

  // イベントリスナー登録
  addEventListener(listener: (event: SessionEvent) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // 機密操作前の再認証チェック
  async requireReauthentication(): Promise<boolean> {
    if (!this.settings.requireReauthForSensitive) {
      return true
    }

    // 最後のアクティビティから5分以内なら再認証不要
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    if (this.sessionInfo && this.sessionInfo.lastActivity > fiveMinutesAgo) {
      return true
    }

    return this.showReauthenticationDialog()
  }

  private initializeEventListeners(): void {
    // ページの可視性変更を監視
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateActivity()
      }
    })

    // マウスとキーボードのアクティビティを監視
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.addEventListener(event, this.throttledActivityUpdate.bind(this))
    })

    // ページ離脱時の処理
    window.addEventListener('beforeunload', () => {
      if (this.sessionInfo) {
        // セッション終了をトラッキング（バックグラウンドで）
        navigator.sendBeacon('/api/session/end', JSON.stringify({
          userId: this.sessionInfo.userId,
          duration: Date.now() - this.sessionInfo.sessionStart
        }))
      }
    })
  }

  private startActivityTracking(): void {
    this.resetInactivityTimer()
  }

  private resetInactivityTimer(): void {
    this.clearTimers()

    const warningTime = (this.settings.maxInactivePeriod - 5) * 60 * 1000
    const timeoutTime = this.settings.maxInactivePeriod * 60 * 1000

    // 5分前に警告表示
    this.warningTimer = setTimeout(() => {
      this.notifyListeners({ 
        type: 'session_warning',
        data: { remainingTime: 5 * 60 * 1000 }
      })
    }, warningTime)

    // タイムアウトでセッション終了
    this.inactivityTimer = setTimeout(() => {
      this.notifyListeners({ type: 'session_timeout', data: null })
      this.endSession()
    }, timeoutTime)
  }

  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer)
      this.warningTimer = null
    }
  }

  private throttledActivityUpdate = this.throttle(() => {
    this.updateActivity()
  }, 30000) // 30秒に1回まで

  private throttle(func: Function, limit: number) {
    let inThrottle: boolean
    return (...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent
    
    if (/Mobi|Android/i.test(ua)) {
      return 'Mobile'
    } else if (/Tablet|iPad/i.test(ua)) {
      return 'Tablet'
    } else {
      return 'Desktop'
    }
  }

  private async showReauthenticationDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div')
      dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">セキュリティ確認</h3>
          <p class="text-gray-600 mb-4">
            セキュリティ保護のため、パスワードを再入力してください。
          </p>
          <input 
            type="password" 
            id="reauth-password" 
            placeholder="パスワード"
            class="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div class="flex justify-end gap-2">
            <button id="reauth-cancel" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
              キャンセル
            </button>
            <button id="reauth-confirm" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              確認
            </button>
          </div>
        </div>
      `

      document.body.appendChild(dialog)

      const passwordInput = dialog.querySelector('#reauth-password') as HTMLInputElement
      const cancelBtn = dialog.querySelector('#reauth-cancel') as HTMLButtonElement
      const confirmBtn = dialog.querySelector('#reauth-confirm') as HTMLButtonElement

      const cleanup = () => document.body.removeChild(dialog)

      cancelBtn.onclick = () => {
        cleanup()
        resolve(false)
      }

      confirmBtn.onclick = async () => {
        const password = passwordInput.value
        try {
          // 現在のユーザーのメールアドレスでサインイン試行
          if (this.sessionInfo) {
            const { error } = await supabase.auth.signInWithPassword({
              email: this.sessionInfo.email,
              password: password
            })
            
            if (!error) {
              cleanup()
              resolve(true)
            } else {
              passwordInput.value = ''
              passwordInput.placeholder = 'パスワードが正しくありません'
              passwordInput.classList.add('border-red-500')
            }
          }
        } catch (error) {
          console.error('Reauthentication failed:', error)
          cleanup()
          resolve(false)
        }
      }

      passwordInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click()
        }
      }

      passwordInput.focus()
    })
  }

  private notifyListeners(event: SessionEvent): void {
    this.listeners.forEach(listener => listener(event))
  }
}

export interface SessionEvent {
  type: 'session_started' | 'session_ended' | 'session_warning' | 'session_timeout' | 'session_error' | 'settings_updated'
  data: any
}

// セッション管理用React Hook
export function useSessionManager() {
  const sessionManager = SessionManager.getInstance()
  
  React.useEffect(() => {
    sessionManager.startSession()
    
    return () => {
      // クリーンアップ時にタイマーをクリア
    }
  }, [])

  return {
    updateActivity: () => sessionManager.updateActivity(),
    endSession: () => sessionManager.endSession(),
    getSessionInfo: () => sessionManager.getSessionInfo(),
    isSessionValid: () => sessionManager.isSessionValid(),
    requireReauth: () => sessionManager.requireReauthentication(),
    addEventListener: (listener: (event: SessionEvent) => void) => 
      sessionManager.addEventListener(listener)
  }
}

// セッション警告コンポーネント用のReactコンテキスト
import React from 'react'

export const SessionContext = React.createContext<{
  sessionManager: SessionManager
}>({
  sessionManager: SessionManager.getInstance()
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const sessionManager = SessionManager.getInstance()

  return (
    <SessionContext.Provider value={{ sessionManager }}>
      {children}
    </SessionContext.Provider>
  )
}