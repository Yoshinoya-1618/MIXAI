"use client"
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '../web/api'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      <StyleTokens />
      <Header />
      <Suspense fallback={
        <div className="py-16 text-center">
          <div className="animate-pulse">読み込み中...</div>
        </div>
      }>
        <CheckoutContent />
      </Suspense>
      <Footer />
    </main>
  )
}

function CheckoutContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const jobId = sp.get('job')
  const planCode = sp.get('plan') // プランコードを取得
  const [jobDetails, setJobDetails] = useState<any>(null)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'onetime'>('credits')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (jobId) {
      loadJobDetails()
    } else if (planCode) {
      // プラン購入の場合
      loadPlanDetails()
    }
  }, [jobId, planCode])

  const loadPlanDetails = async () => {
    try {
      // プラン購入時はStripe Checkoutセッションを作成して直接リダイレクト
      setMsg('チェックアウトページへ移動しています...')
      
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_code: planCode,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }
      
      const { checkout_url } = await response.json()
      
      // Stripe Checkoutへリダイレクト
      window.location.href = checkout_url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setMsg('エラーが発生しました。もう一度お試しください。')
      setLoading(false)
    }
  }

  const loadJobDetails = async () => {
    try {
      const [jobRes, creditsRes] = await Promise.all([
        apiFetch(`/api/v1/jobs/${jobId}`),
        apiFetch('/api/v1/credits/balance')
      ])
      
      if (jobRes.ok) {
        const job = await jobRes.json()
        setJobDetails(job)
      }
      
      if (creditsRes.ok) {
        const credits = await creditsRes.json()
        setCreditBalance(credits.available_credits)
      }
    } catch (error) {
      setMsg('情報の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const calculateCost = () => {
    let cost = 1.0 // 基本MIX: 1.0C
    
    // ハモリのコスト（プランによって異なる）
    if (jobDetails?.harmony_mode === 'generate' || jobDetails?.harmony_path) {
      const planCode = jobDetails?.plan_code || 'lite'
      if (planCode === 'lite') {
        cost += 0.5 // Lite: +0.5C
      }
      // Standard/Creator: +0.0C
    }
    
    return cost
  }

  async function onPay() {
    if (!jobId) return
    setBusy(true)
    setMsg('決済処理中...')
    
    try {
      const idem = crypto.randomUUID()
      const res = await apiFetch(`/api/v1/jobs/${jobId}/pay`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idem },
        body: JSON.stringify({
          payment_method: paymentMethod
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || '決済に失敗しました')
      }
      
      // 決済成功後、レンダリング開始
      await apiFetch(`/api/v1/jobs/${jobId}/render`, { method: 'POST' })
      router.push(`/status/${jobId}`)
      
    } catch (e: any) {
      setMsg(e?.message || 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-pulse">
          {planCode ? 'チェックアウトページへ移動中...' : '明細を読み込み中...'}
        </div>
        {msg && <div className="mt-4 text-gray-600">{msg}</div>}
      </div>
    )
  }

  // プラン購入の場合はここには到達しない（リダイレクトされる）
  if (planCode && !jobDetails) {
    return (
      <div className="py-16 text-center">
        <div className="text-gray-600">チェックアウトページへ移動しています...</div>
      </div>
    )
  }

  if (!jobDetails) {
    return (
      <div className="py-16 text-center">
        <div className="text-red-600">ジョブが見つかりません</div>
        <button 
          className="mt-4 btn-secondary" 
          onClick={() => router.push('/upload')}
        >
          アップロードに戻る
        </button>
      </div>
    )
  }

  const cost = calculateCost()
  const hasEnoughCredits = creditBalance >= cost

  return (
    <div className="py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold">決済内容確認</h1>
          <p className="mt-4 text-gray-700">処理内容と料金をご確認の上、お支払いください</p>
        </div>

        {/* 処理内容 */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">処理内容</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>基本MIX処理</span>
              <span>1.0C</span>
            </div>
            {(jobDetails.harmony_mode === 'generate' || jobDetails.harmony_path) && (
              <div className="flex justify-between">
                <span>ハモリ適用</span>
                <span>
                  {jobDetails.plan_code === 'lite' ? '+0.5C' : '0C (無料)'}
                </span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-semibold text-lg">
              <span>合計</span>
              <span>{cost}C</span>
            </div>
          </div>
        </div>

        {/* 支払い方法選択 */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">支払い方法</h2>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="payment"
                value="credits"
                checked={paymentMethod === 'credits'}
                onChange={(e) => setPaymentMethod('credits' as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">クレジット払い</div>
                <div className="text-sm text-gray-600">
                  現在の残高: {creditBalance}C
                  {!hasEnoughCredits && (
                    <span className="text-red-600 ml-2">（残高不足）</span>
                  )}
                </div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="payment"
                value="onetime"
                checked={paymentMethod === 'onetime'}
                onChange={(e) => setPaymentMethod('onetime' as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">都度課金</div>
                <div className="text-sm text-gray-600">
                  ¥{Math.ceil(cost * 500)} (¥500/1C)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 利用規約同意 */}
        <div className="card p-6 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1"
            />
            <div className="text-sm">
              <a href="/legal/terms" className="text-blue-600 hover:underline">利用規約</a>、
              <a href="/legal/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</a>、
              <a href="/legal/rights" className="text-blue-600 hover:underline">権利ポリシー</a>
              に同意します。
            </div>
          </label>
        </div>

        {/* メッセージ */}
        {msg && (
          <div className={`mb-6 p-4 rounded-lg ${msg.includes('エラー') || msg.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {msg}
          </div>
        )}

        {/* アクション */}
        <div className="flex gap-4 justify-center">
          <button 
            className="btn-secondary px-8 py-3" 
            onClick={() => router.back()}
            disabled={busy}
          >
            戻る
          </button>
          <button 
            className="btn-primary px-8 py-3" 
            onClick={onPay} 
            disabled={!agree || busy || (paymentMethod === 'credits' && !hasEnoughCredits)}
          >
            {busy ? (
              <div className="flex items-center gap-2">
                <LoadingIcon className="w-5 h-5 animate-spin" />
                処理中...
              </div>
            ) : (
              '支払って処理開始'
            )}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        :root {
          --bg: ${COLORS.bg};
          --indigo: ${COLORS.indigo};
          --blue: ${COLORS.blue};
          --magenta: ${COLORS.magenta};
        }
        
        .card {
          @apply bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg rounded-2xl;
        }
        
        .btn-primary {
          @apply font-semibold rounded-xl text-white;
          background: linear-gradient(135deg, var(--indigo) 0%, var(--blue) 100%);
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 20px 40px -12px rgba(99, 102, 241, 0.4);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          @apply font-semibold rounded-xl text-gray-700 bg-white border border-gray-300 hover:bg-gray-50;
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  )
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
