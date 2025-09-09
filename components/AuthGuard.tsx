'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export function AuthGuard({ children, fallback, redirectTo = '/auth/login' }: AuthGuardProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  // supabaseクライアントは既にインポート済み

  useEffect(() => {
    // 初期認証状態確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // ユーザーがいない場合は auth/login にリダイレクト
      if (!session?.user) {
        const currentPath = window.location.pathname
        // uploadページから来た場合はリダイレクト先を指定
        if (currentPath === '/upload') {
          router.push(`/auth/login?redirect=${encodeURIComponent('/upload')}`)
        } else {
          router.push('/auth/login')
        }
      }
    })

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
          </div>
          <p className="mt-2 text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // AuthGuardはもうリダイレクト処理を行うので、ここは表示しない
    return null
  }

  return <>{children}</>
}

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="form-container">
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-semibold text-slate-900 mb-2">ログインが必要です</h1>
          <p className="text-slate-600 mb-6">
            うた整音をご利用いただくには、アカウント登録（無料）が必要です。
            初回の音声処理は無料でお試しいただけます。
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={onLogin}
              className="btn-primary w-full"
            >
              ログイン・新規登録
            </button>
            
            <div className="text-xs text-slate-500">
              <p>メールアドレスでかんたん登録</p>
              <p>パスワード不要のワンクリック認証</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-2">登録のメリット</h3>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>✓ 初回処理無料</li>
              <li>✓ 処理履歴の保存</li>
              <li>✓ 安全なデータ管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // supabaseクライアントは既にインポート済み

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, loading, signOut: () => supabase.auth.signOut() }
}