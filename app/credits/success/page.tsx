'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../../../components/common/Header'
import StyleTokens from '../../../components/common/StyleTokens'
import { createClient } from '../../../lib/supabase'

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function CreditsSuccessContent() {
  const [loading, setLoading] = useState(true)
  const [creditsPurchased, setCreditsPurchased] = useState<number>(0)
  const [newBalance, setNewBalance] = useState<number>(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const supabase = createClient()

  useEffect(() => {
    if (sessionId) {
      processCreditsSuccess()
    }
  }, [sessionId])

  const processCreditsSuccess = async () => {
    try {
      // APIを呼び出してクレジット付与を確認
      const response = await fetch('/api/credits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (response.ok) {
        const data = await response.json()
        setCreditsPurchased(data.creditsPurchased || 0)
        setNewBalance(data.newBalance || 0)
      }
    } catch (error) {
      console.error('Failed to confirm credits:', error)
    } finally {
      setLoading(false)
      // 3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <StyleTokens />
        <AuroraBackground />
        <div className="glass-card p-8 text-center">
          <LoadingIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">クレジット付与を処理中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      <StyleTokens />
      <AuroraBackground />
      <Header showMainNavigation={false} />
      
      <div className="relative mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckIcon className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25] mb-4">
            購入完了！
          </h1>
          
          <p className="text-lg text-gray-700">
            クレジットパックの購入が完了しました
          </p>
        </div>

        <div className="glass-card p-8 mb-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="text-5xl font-bold text-indigo-600 mb-2">
                +{creditsPurchased}C
              </div>
              <p className="text-gray-600">
                クレジットが追加されました
              </p>
            </div>
            
            <div className="py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">新しい残高</span>
                <span className="text-2xl font-bold text-gray-900">
                  {newBalance.toFixed(1)}C
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
              すぐに使えます
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>購入したクレジットは即座に利用可能</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>有効期限なし</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>全ての機能で使用可能</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <InfoIcon className="w-5 h-5 text-blue-600" />
              ご利用について
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>領収書はメールで送信されます</span>
              </li>
              <li className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>クレジット残高はマイページで確認</span>
              </li>
              <li className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>処理に失敗した場合は自動返却</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            まもなくダッシュボードへ移動します...
          </p>
          <button 
            onClick={() => router.push('/upload')}
            className="btn-primary px-8 py-3 shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-2">
              <MusicIcon className="w-5 h-5" />
              <span>楽曲をアップロード</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  )
}

export default function CreditsSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <StyleTokens />
        <AuroraBackground />
        <div className="glass-card p-8 text-center">
          <LoadingIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    }>
      <CreditsSuccessContent />
    </Suspense>
  )
}

// StyleTokens component removed - using imported version from common

function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse" 
           style={{ background: `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.blue} 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse" 
           style={{ background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.magenta} 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl animate-pulse"
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

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
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