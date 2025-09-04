"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../web/api'

interface Props { params: { id: string } }

export default function StatusPage({ params }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState('uploaded')
  const [failed, setFailed] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let stop = false
    async function poll() {
      try {
        const res = await apiFetch(`/api/v1/jobs/${params.id}`)
        if (res.ok) {
          const j = await res.json()
          setStatus(j.status)
          if (j.status === 'done') {
            if (!stop) router.push(`/result/${params.id}`)
            return
          }
          if (j.status === 'failed') setFailed(true)
        }
      } catch {}
      if (!stop) setTimeout(poll, 2000)
    }
    poll()
    return () => { stop = true }
  }, [params.id, router])

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6" aria-labelledby="status-title">
      <h1 id="status-title" className="text-xl font-semibold">処理状況</h1>
      <p>ジョブID: <code>{params.id}</code></p>
      <div role="status" aria-live="polite" data-testid="status">{status}</div>
      {failed && (
        <section aria-label="再試行" className="space-y-2">
          <label className="block">
            ±2000ms 頭出し微調整（失敗時の救済）
            <input type="range" min="-2000" max="2000" step="10" className="w-full" aria-label="オフセット調整" value={offset}
              onChange={(e) => setOffset(Number(e.target.value))} />
          </label>
          <button className="px-4 py-2 border rounded" aria-disabled>
            再試行（モック）
          </button>
        </section>
      )}
    </main>
  )
}

