'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Plan {
  code: string
  name: string
  price: number
  credits: number
  features: string[]
  recommended?: boolean
}

const plans: Plan[] = [
  {
    code: 'lite',
    name: 'Lite',
    price: 1280,
    credits: 3,
    features: [
      '月3曲までMIX可能',
      '基本的なMIX機能',
      '7日間保存',
      'MP3出力'
    ]
  },
  {
    code: 'standard',
    name: 'Standard',
    price: 2980,
    credits: 6,
    features: [
      '月6曲までMIX可能',
      'AIピッチ・タイミング補正',
      '15日間保存',
      'WAV/FLAC出力対応'
    ],
    recommended: true
  },
  {
    code: 'creator',
    name: 'Creator',
    price: 5980,
    credits: 10,
    features: [
      '月10曲までMIX可能',
      '全機能解放',
      '30日間保存',
      '優先処理'
    ]
  }
]

export default function TrialPlanSelector({ onClose }: { onClose?: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState('standard')
  const [loading, setLoading] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)

  const handleStartTrial = async () => {
    setLoading(true)
    
    try {
      // Checkout セッションを作成（7日間トライアル付き）
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode: selectedPlan,
          trial: true,
          trialDays: 7
        })
      })

      const { sessionId, error } = await response.json()
      
      if (error) {
        alert(error)
        setLoading(false)
        return
      }

      // Stripe Checkout へリダイレクト
      const stripe = await stripePromise
      if (!stripe) {
        alert('Stripe の読み込みに失敗しました')
        setLoading(false)
        return
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId })
      if (stripeError) {
        alert(stripeError.message)
      }
    } catch (err) {
      console.error('Trial start error:', err)
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getTrialEndDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">7日間無料トライアルを始める</h2>
                <p className="text-gray-600 mt-1">
                  7日後に自動的に選択したプランが開始されます
                </p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={loading}
                >
                  <XIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Creator Boost の案内 */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900">
                    Creator Boost 48時間付き！
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    開始から48時間は、どのプランを選んでもCreatorプランの全機能をお試しいただけます
                  </p>
                </div>
              </div>
            </div>

            {/* プラン選択 */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {plans.map((plan) => (
                <button
                  key={plan.code}
                  onClick={() => setSelectedPlan(plan.code)}
                  disabled={loading}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all
                    ${selectedPlan === plan.code 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                        おすすめ
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold">¥{plan.price.toLocaleString()}</span>
                      <span className="text-gray-600 text-sm">/月（税込）</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {/* 重要事項の説明 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h4 className="font-semibold mb-2">ご確認事項</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>
                    更新日は <strong>{getTrialEndDate()}</strong> です。
                    この日から選択したプラン（¥{plans.find(p => p.code === selectedPlan)?.price.toLocaleString()}/月・税込）が開始されます
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>期間中はいつでも解約可能です。解約時は料金は発生しません</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>クレジットカード情報は安全にStripeで管理されます</span>
                </li>
              </ul>
            </div>

            {/* CTAボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="flex-1 btn-primary px-6 py-3 font-semibold rounded-xl disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingIcon className="w-5 h-5 animate-spin" />
                    処理中...
                  </span>
                ) : (
                  `いま無料で開始（7日後 ¥${plans.find(p => p.code === selectedPlan)?.price.toLocaleString()}/月・税込）`
                )}
              </button>
              
              {onClose && (
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Creator Boost モーダル（成功後に表示） */}
      {showBoostModal && (
        <CreatorBoostModal onClose={() => setShowBoostModal(false)} />
      )}
    </>
  )
}

// Creator Boost開始モーダル
function CreatorBoostModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">
            Creator Boost を 48時間お試し！
          </h2>
          
          <p className="text-gray-600 mb-6">
            開始から48時間はCreator機能も解放されます。
            48時間後は選択プランの権限に戻ります。
          </p>
          
          <button
            onClick={onClose}
            className="btn-primary px-8 py-3 font-semibold rounded-xl w-full"
          >
            ダッシュボードへ
          </button>
        </div>
      </div>
    </div>
  )
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
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