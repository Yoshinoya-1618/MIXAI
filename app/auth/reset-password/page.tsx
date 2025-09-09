'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Header from '../../../components/common/Header'
import StyleTokens from '../../../components/common/StyleTokens'
import Footer from '../../../components/common/Footer'

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header />
      <Suspense fallback={<div className="flex justify-center items-center min-h-96">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
      <Footer />
    </main>
  )
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tokenValid, setTokenValid] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setTokenValid(true)
        } else {
          setError('パスワードリセットのリンクが無効または期限切れです。')
        }
      } catch (error) {
        setError('認証エラーが発生しました。')
      }
    }

    checkToken()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // パスワード確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      setLoading(false)
      return
    }

    // パスワード強度チェック
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setMessage('パスワードが正常に更新されました。')
      
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/auth/login?message=' + encodeURIComponent('パスワードが更新されました。新しいパスワードでログインしてください。'))
      }, 3000)

    } catch (error: any) {
      setError(error.message || 'パスワードリセットに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!tokenValid && !error) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
      </div>
    )
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">パスワードリセット</h1>
            <p className="mt-2 text-gray-600">
              新しいパスワードを設定してください
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          {tokenValid && !message && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上で入力"
                  className="input"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード（確認）
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="パスワードを再入力"
                  className="input"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'パスワード更新中...' : 'パスワードを更新'}
              </button>
            </form>
          )}

          {!tokenValid && error && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                パスワードリセットを再度行う場合は、ログインページからお試しください。
              </p>
              <a 
                href="/auth/login"
                className="btn-primary inline-block px-6 py-2"
              >
                ログインページに戻る
              </a>
            </div>
          )}

          {message && (
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                3秒後に自動的にログインページにリダイレクトされます...
              </p>
              <a 
                href="/auth/login"
                className="text-[var(--brand)] hover:underline text-sm font-medium"
              >
                今すぐログインページに移動
              </a>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            パスワードは定期的に変更し、他のサービスとは異なるものを使用することをお勧めします。
          </p>
        </div>
      </div>
    </section>
  )
}