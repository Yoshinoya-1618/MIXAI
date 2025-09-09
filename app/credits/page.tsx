'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'
import { createClient } from '../../lib/supabase'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

interface CreditPack {
  code: string
  name: string
  credits: number
  price: number
  pricePerCredit: number
  discount: number
  popular?: boolean
}

const creditPacks: CreditPack[] = [
  {
    code: 'single',
    name: '単品購入',
    credits: 1,
    price: 700,
    pricePerCredit: 700,
    discount: 0
  },
  {
    code: 'mini',
    name: 'ミニパック',
    credits: 2,
    price: 1380,
    pricePerCredit: 690,
    discount: 1.4
  },
  {
    code: 'small',
    name: 'お得パック',
    credits: 5,
    price: 3300,
    pricePerCredit: 660,
    discount: 5.7,
    popular: true
  },
  {
    code: 'medium',
    name: '人気パック',
    credits: 10,
    price: 6500,
    pricePerCredit: 650,
    discount: 7.1
  },
  {
    code: 'large',
    name: '大量パック',
    credits: 20,
    price: 12000,
    pricePerCredit: 600,
    discount: 14.3
  }
]

export default function CreditsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [currentCredits, setCurrentCredits] = useState<number>(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndCredits()
  }, [])

  const checkUserAndCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user) {
      // Get current credit balance
      const { data: credits } = await supabase
        .from('user_credits')
        .select('total_credits')
        .eq('user_id', user.id)
        .single()
      
      if (credits) {
        setCurrentCredits(credits.total_credits)
      }
    }
  }

  const handlePurchase = async (packCode: string) => {
    if (!user) {
      router.push('/auth/login?callbackUrl=/credits')
      return
    }

    setLoading(packCode)

    try {
      // Create checkout session for credit pack
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packCode })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('エラーが発生しました。もう一度お試しください。')
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="credits" />
      <AuroraBackground />
      
      <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25] mb-4">
            クレジット購入
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-3">
            必要な分だけクレジットを購入。サブスクリプションなしでMIXAIをご利用いただけます
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
            <CheckIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              クレジットカード不要！コンビニ・銀行振込でもOK
            </span>
          </div>
          
          {user && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200">
              <span className="text-sm text-gray-600">現在の残高:</span>
              <span className="font-bold text-lg text-indigo-600">{currentCredits.toFixed(1)}クレジット</span>
            </div>
          )}
        </div>

        {/* 価格説明 */}
        <div className="glass-card p-6 mb-8">
          <h2 className="font-semibold text-xl mb-4 text-center">1クレジットでできること</h2>
          <p className="text-center text-gray-600 mb-6">
            1クレジット = 最大60秒のフルMIX＆マスタリング（Standard相当）
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <MusicIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="font-medium">基本MIX処理</span>
              <span className="text-gray-600">1.0クレジット</span>
              <span className="text-xs text-gray-500">6軸調整・ジャンル最適化</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                <HarmonyIcon className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-medium">ハモリ全編</span>
              <span className="text-green-600 font-semibold">0C無料</span>
              <span className="text-xs text-gray-500">全プラン共通</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <QualityIcon className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium">Creator機能</span>
              <span className="text-gray-600">+0.5クレジット</span>
              <span className="text-xs text-gray-500">7軸・超高精度・参照曲</span>
            </div>
          </div>
        </div>

        {/* クレジットパック */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {creditPacks.map((pack) => (
            <div 
              key={pack.code}
              className={`glass-card p-6 text-center relative ${
                pack.popular ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                  おすすめ
                </span>
              )}
              
              <h3 className="font-bold text-lg mb-2">{pack.name}</h3>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-indigo-600 mb-1">
                  {pack.credits}クレジット
                </div>
                <div className="text-sm text-gray-600">
                  {pack.credits}曲分のMIX
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl font-bold">
                  ¥{pack.price.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  税込
                </div>
              </div>
              
              <div className="mb-4 space-y-1">
                <div className="text-sm">
                  <span className="text-gray-600">1クレジットあたり</span>
                  <span className="font-semibold ml-1">¥{pack.pricePerCredit}</span>
                </div>
                {pack.discount > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    {pack.discount}%お得
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handlePurchase(pack.code)}
                disabled={loading === pack.code}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  pack.popular 
                    ? 'btn-primary' 
                    : 'btn-secondary'
                }`}
              >
                {loading === pack.code ? '処理中...' : '購入する'}
              </button>
            </div>
          ))}
        </div>

        {/* どんな人におすすめ？ */}
        <div className="glass-card p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-center">
            クレジット購入がおすすめの方
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">月1〜2曲の方</h3>
              <p className="text-sm text-gray-600">
                たまにMIXしたい時だけ使いたい方に最適
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCardIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">サブスクが苦手な方</h3>
              <p className="text-sm text-gray-600">
                月額課金なし、必要な時だけ購入したい方に
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShopIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">コンビニ払い希望の方</h3>
              <p className="text-sm text-gray-600">
                クレジットカードを使わずに支払いたい方に
              </p>
            </div>
          </div>
        </div>

        {/* サブスクリプションへの誘導 */}
        <div className="glass-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-3">
            月3曲以上ならサブスクがお得！
          </h2>
          <p className="text-gray-600 mb-6">
            定期的にMIXされる方は、サブスクリプションプランの方が割安です
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">Lite</div>
              <div className="text-sm text-gray-600">月3曲まで</div>
              <div className="text-lg font-bold text-indigo-600">約¥593/曲</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">Standard</div>
              <div className="text-sm text-gray-600">月6曲まで</div>
              <div className="text-lg font-bold text-indigo-600">約¥663/曲</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold">Creator</div>
              <div className="text-sm text-gray-600">月10曲まで</div>
              <div className="text-lg font-bold text-indigo-600">約¥738/曲</div>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/pricing')}
            className="btn-primary px-8 py-3"
          >
            サブスクリプションプランを見る
          </button>
        </div>
      </div>
      <Footer />
    </main>
  )
}

// Background component
function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.blue} 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.magenta} 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: `linear-gradient(135deg, ${COLORS.magenta} 0%, ${COLORS.indigo} 100%)` }} />
    </div>
  )
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  )
}

function ShopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  )
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  )
}

function HarmonyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
    </svg>
  )
}

function QualityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function NoiseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
  )
}