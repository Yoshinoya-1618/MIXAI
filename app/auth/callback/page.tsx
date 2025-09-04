'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLのハッシュフラグメントからセッション情報を取得
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Authentication error:', error)
          router.push('/auth/login?error=' + encodeURIComponent(error.message))
          return
        }

        if (data.session) {
          // ログイン成功
          router.push('/mypage')
        } else {
          // セッションがない場合は確認メールが必要な可能性
          const message = searchParams.get('message')
          if (message) {
            router.push('/auth/login?message=' + encodeURIComponent(message))
          } else {
            router.push('/auth/login')
          }
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        router.push('/auth/login?error=' + encodeURIComponent('認証処理でエラーが発生しました'))
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)] mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            認証中...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            お待ちください
          </p>
        </div>
      </div>
    </div>
  )
}