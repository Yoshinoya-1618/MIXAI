"use client"
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '../web/api'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl p-6">読み込み中…</main>}>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const jobId = sp.get('job')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function onPay() {
    if (!jobId) return
    setBusy(true)
    setMsg('決済処理中…')
    try {
      const idem = crypto.randomUUID()
      const res = await apiFetch(`/api/v1/jobs/${jobId}/pay`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idem },
      })
      if (!res.ok) throw new Error('決済に失敗しました')
      await apiFetch(`/api/v1/jobs/${jobId}/render`, { method: 'POST' })
      router.push(`/status/${jobId}`)
    } catch (e: any) {
      setMsg(e?.message || 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6" aria-labelledby="checkout-title">
      <h1 id="checkout-title" className="text-xl font-semibold">決済</h1>
      <p>明細の確認と同意。二重送信を防止します。</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" aria-label="規約に同意" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>利用規約・プライバシー・権利ポリシーに同意します。</span>
      </label>
      <div aria-live="polite">{msg}</div>
      <button className="px-4 py-2 border rounded" onClick={onPay} disabled={!agree || busy} aria-disabled={!agree || busy}>
        支払って処理
      </button>
    </main>
  )
}
