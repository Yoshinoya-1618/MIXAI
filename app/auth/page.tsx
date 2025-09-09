'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

export default function AuthPage() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="auth" />
      <AuthForm />
      <Footer />
    </main>
  )
}

function AuthForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      setMessage('ログイン用のマジックリンクをメールで送信しました。受信ボックスをご確認ください。')
    } catch (error: any) {
      setError(error.message || 'マジックリンクの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setMessage('サインアウトしました')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'サインアウトに失敗しました')
    }
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">マジックリンクログイン</h1>
            <p className="mt-2 text-gray-600">
              メールアドレスを入力して、ワンクリックでログインできるリンクを受け取りましょう
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

          <form onSubmit={handleMagicLinkLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={!email || loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'マジックリンク送信中...' : 'マジックリンクを送信'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">または</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button 
                onClick={handleSignOut}
                className="btn-ghost w-full"
              >
                サインアウト
              </button>
            </div>
          </div>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-600">
              パスワードでログインしたい方は{' '}
              <a href="/auth/login" className="text-[var(--brand)] hover:text-[var(--brandAlt)] font-medium">
                こちら
              </a>
            </p>
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <a href="/auth/register" className="text-[var(--brand)] hover:text-[var(--brandAlt)] font-medium">
                新規登録
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            マジックリンクは10分間有効です。メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>
      </div>
    </section>
  )
}

