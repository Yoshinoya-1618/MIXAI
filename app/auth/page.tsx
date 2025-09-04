"use client"
import { useState } from 'react'
import { createBrowserSupabase } from '../../storage/supabaseClient'

export default function AuthPage() {
  const supabase = createBrowserSupabase()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSend() {
    setBusy(true)
    setMsg('送信中…')
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
      if (error) throw error
      setMsg('ログイン用のメールを送信しました。受信ボックスをご確認ください。')
    } catch (e: any) {
      setMsg(e?.message || '送信に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut()
    setMsg('サインアウトしました')
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6" aria-labelledby="auth-title">
      <h1 id="auth-title" className="text-xl font-semibold">ログイン</h1>
      <p className="text-sm text-neutral-600">メールリンクでログインします。</p>
      <label className="block space-y-2">
        <span className="text-sm">メールアドレス</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="you@example.com"
          aria-label="メールアドレス"
        />
      </label>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 border rounded" onClick={onSend} disabled={!email || busy} aria-disabled={!email || busy}>ログインリンクを送信</button>
        <button className="px-4 py-2 border rounded" onClick={onSignOut}>サインアウト</button>
      </div>
      <div aria-live="polite" className="text-sm">{msg}</div>
    </main>
  )
}

