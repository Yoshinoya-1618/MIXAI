'use client'
import React, { useState, useEffect } from 'react'

export interface ErrorInfo {
  title: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  autoHide?: number // ms
}

interface ErrorDisplayProps {
  error: ErrorInfo | null
  onDismiss?: () => void
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      if (error.autoHide && error.autoHide > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          setTimeout(() => onDismiss?.(), 300) // アニメーション後に削除
        }, error.autoHide)
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, onDismiss])

  if (!error) return null

  const dismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 300)
  }

  const typeStyles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }

  const iconMap = {
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }

  return (
    <div className={`
      transition-all duration-300 transform rounded-lg border p-4 
      ${typeStyles[error.type]}
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
    `}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {iconMap[error.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{error.title}</h3>
          <p className="mt-1 text-sm">{error.message}</p>
          {error.action && (
            <button
              onClick={error.action.onClick}
              className="mt-3 text-sm font-medium underline hover:no-underline focus:outline-none"
            >
              {error.action.label}
            </button>
          )}
        </div>
        {error.dismissible !== false && (
          <button
            onClick={dismiss}
            className="flex-shrink-0 ml-3 text-sm hover:opacity-70 focus:outline-none"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// エラーハンドリング用のカスタムフック
export function useErrorHandler() {
  const [error, setError] = useState<ErrorInfo | null>(null)

  const showError = (errorInfo: Partial<ErrorInfo> & { message: string }) => {
    setError({
      title: errorInfo.title || 'エラーが発生しました',
      type: errorInfo.type || 'error',
      dismissible: errorInfo.dismissible !== false,
      autoHide: errorInfo.autoHide,
      ...errorInfo
    } as ErrorInfo)
  }

  const showSuccess = (message: string, title = '完了', autoHide = 3000) => {
    setError({
      title,
      message,
      type: 'success',
      dismissible: true,
      autoHide
    })
  }

  const showWarning = (message: string, title = '注意') => {
    setError({
      title,
      message,
      type: 'warning',
      dismissible: true
    })
  }

  const showInfo = (message: string, title = 'お知らせ') => {
    setError({
      title,
      message,
      type: 'info',
      dismissible: true
    })
  }

  const clearError = () => setError(null)

  // ファイルバリデーション専用
  const validateFile = (file: File, maxMB = 20, maxSeconds = 60): string | null => {
    const mb = file.size / (1024 * 1024)
    if (mb > maxMB) {
      return `ファイルサイズが制限を超えています（${mb.toFixed(1)}MB > ${maxMB}MB）`
    }
    
    const extOk = /\.(wav|mp3)$/i.test(file.name)
    if (!extOk) {
      return 'サポートされていない形式です。WAVまたはMP3ファイルを選択してください。'
    }
    
    return null
  }

  // API エラー処理
  const handleApiError = (error: any, context = '') => {
    let message = 'サーバーエラーが発生しました。しばらくしてから再試行してください。'
    
    if (error?.status === 413) {
      message = 'ファイルサイズが大きすぎます。20MB以下のファイルを選択してください。'
    } else if (error?.status === 429) {
      message = 'リクエストが多すぎます。しばらくしてから再試行してください。'
    } else if (error?.status === 401) {
      message = 'ログインが必要です。再度ログインしてください。'
    } else if (error?.message) {
      message = error.message
    }

    showError({
      title: context ? `${context}でエラーが発生` : 'エラーが発生しました',
      message,
      action: {
        label: '再試行',
        onClick: () => window.location.reload()
      }
    })
  }

  return {
    error,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearError,
    validateFile,
    handleApiError
  }
}