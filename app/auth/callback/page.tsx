'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Header from '../../../components/common/Header'
import StyleTokens from '../../../components/common/StyleTokens'
import Footer from '../../../components/common/Footer'

export default function AuthCallback() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header showMainNavigation={false} />
      <Suspense fallback={<div className="flex justify-center items-center min-h-96">Loading...</div>}>
        <AuthCallbackHandler />
      </Suspense>
      <Footer />
    </main>
  )
}

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/mypage'

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // まずURLパラメータでエラーやキャンセルを確認
        const error = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const errorDescription = searchParams.get('error_description')
        
        // Googleログインキャンセルの場合
        if (error === 'access_denied' || errorCode === '400') {
          console.log('OAuth login cancelled by user')
          router.push('/auth/login?message=' + encodeURIComponent('ログインがキャンセルされました'))
          return
        }
        
        // その他のOAuthエラー
        if (error || errorDescription) {
          console.error('OAuth error:', error, errorDescription)
          const errorMessage = errorDescription || error || '認証エラーが発生しました'
          router.push('/auth/login?error=' + encodeURIComponent(errorMessage))
          return
        }

        // Cookieパースエラーを回避するためのクリーンアップ
        try {
          // 不正なCookieがある場合はクリア
          if (typeof window !== 'undefined') {
            const cookies = document.cookie.split(';')
            cookies.forEach(cookie => {
              const eqPos = cookie.indexOf('=')
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
              // Supabase関連の不正なCookieをクリア
              if (name.includes('sb-') && name.includes('auth-token')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              }
            })
          }
        } catch (cookieError) {
          console.warn('Cookie cleanup error:', cookieError)
        }

        // URLハッシュからセッション情報を取得（OAuth後の処理）
        const { data, error: sessionError } = await supabase.auth.getSession()
        console.log('Callback session check:', { data, error: sessionError })

        if (sessionError) {
          console.error('Authentication error:', sessionError)
          // Cookieパースエラーの場合は特別な処理
          if (sessionError.message?.includes('Failed to parse cookie') || 
              sessionError.message?.includes('Unexpected token')) {
            router.push('/auth/login?error=' + encodeURIComponent('認証情報の取得に失敗しました。もう一度お試しください。'))
          } else {
            router.push('/auth/login?error=' + encodeURIComponent(sessionError.message))
          }
          return
        }

        if (data.session) {
          console.log('Session found, redirecting to', redirectTo)
          // ログイン成功 - 少し遅延を入れてセッションを確実に保存
          setTimeout(() => {
            router.push(redirectTo)
            router.refresh()
          }, 500)
        } else {
          // セッションがない場合はURLパラメータを確認
          const message = searchParams.get('message')
          
          if (message) {
            router.push('/auth/login?message=' + encodeURIComponent(message))
          } else {
            // セッションもパラメータもない場合はログインページへ
            router.push('/auth/login')
          }
        }
      } catch (error: any) {
        console.error('Callback handling error:', error)
        // エラーメッセージをより詳細に
        const errorMessage = error?.message || '認証処理でエラーが発生しました'
        router.push('/auth/login?error=' + encodeURIComponent(errorMessage))
      }
    }

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      if (event === 'SIGNED_IN' && session) {
        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 500)
      }
    })

    handleAuthCallback()

    return () => {
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)] mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            認証中...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            お待ちください。アカウント認証を処理しています。
          </p>
          <p className="mt-4 text-xs text-gray-500">
            しばらく待ってもページが変わらない場合は、
            <a href="/auth/login" className="text-[var(--brand)] hover:underline ml-1">
              ログインページ
            </a>
            からやり直してください。
          </p>
        </div>
      </div>
    </div>
  )
}