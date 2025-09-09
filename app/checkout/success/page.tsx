"use client"
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '../../web/api'
import Header from '../../../components/common/Header'

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

function CheckoutSuccessContent() {
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [showBoost, setShowBoost] = useState(false)
  const [isTrial, setIsTrial] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails()
    }
  }, [sessionId])

  const fetchSessionDetails = async () => {
    try {
      // Check if this is a trial session
      const trialRes = await apiFetch('/api/trial/status')
      if (trialRes.ok) {
        const trialData = await trialRes.json()
        if (trialData.isTrial && trialData.creatorBoostActive) {
          setShowBoost(true)
          setIsTrial(true)
          // Show boost modal for 3 seconds then redirect
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        }
      }
      
      const res = await apiFetch(`/api/v1/payments/session/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSessionData(data)
      }
    } catch (error) {
      console.error('Failed to fetch session details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <StyleTokens />
        <AuroraBackground />
        <div className="glass-card p-8 text-center">
          <LoadingIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">決済情報を確認中...</p>
        </div>
      </main>
    )
  }

  // Creator Boost modal for trial users
  if (showBoost) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <StyleTokens />
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-4">
            🎉 無料トライアル開始！
          </h1>
          
          <div className="bg-white rounded-2xl p-6 max-w-md mx-auto shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-3">
              Creator Boost 48時間プレゼント！
            </h2>
            <p className="text-gray-600">
              今から48時間、Creatorプランの全機能をお試しいただけます。
              最高の体験をお楽しみください！
            </p>
          </div>
          
          <p className="text-gray-600">
            まもなくダッシュボードへ移動します...
          </p>
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
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckIcon className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25] mb-4">
            {isTrial ? '無料トライアル開始！' : 'お支払い完了！'}
          </h1>
          
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            {isTrial ? (
              <>7日間の無料トライアルが開始されました。<br />全ての機能をお試しください。</>
            ) : (
              <>ご利用いただき、ありがとうございます。<br />プランの変更が完了しました。</>
            )}
          </p>
        </div>

        {sessionData && (
          <div className="glass-card p-8 mb-8">
            <h2 className="font-semibold text-xl mb-6 text-center">お支払い詳細</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                <span className="text-gray-600">プラン</span>
                <span className="font-semibold">{sessionData.planName || 'Standard'}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                <span className="text-gray-600">金額</span>
                <span className="font-semibold">¥{sessionData.amount || '490'}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                <span className="text-gray-600">請求サイクル</span>
                <span className="font-semibold">月額</span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">次回請求日</span>
                <span className="font-semibold">
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
              今すぐできること
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">全ての音質プリセットが利用可能</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">微調整機能でお好みの音質に</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">月間クレジットが自動付与</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <InfoIcon className="w-5 h-5 text-blue-600" />
              重要なお知らせ
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">領収書はメールで送信されます</span>
              </li>
              <li className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">プラン変更はマイページから</span>
              </li>
              <li className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">いつでも解約可能です</span>
              </li>
            </ul>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => router.push('/upload')}
            className="btn-primary px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-2">
              <MusicIcon className="w-5 h-5" />
              <span>楽曲をアップロード</span>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/mypage')}
            className="btn-secondary px-8 py-3 text-lg"
          >
            マイページで確認
          </button>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
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
      <CheckoutSuccessContent />
    </Suspense>
  )
}

// =========================================
// Shared Components
// =========================================

function StyleTokens() {
  return (
    <style jsx>{`
      :root {
        --bg: ${COLORS.bg};
        --indigo: ${COLORS.indigo};
        --blue: ${COLORS.blue};
        --magenta: ${COLORS.magenta};
        --brand: #6366F1;
        --brandAlt: #9B6EF3;
        --accent: ${COLORS.blue};
      }
      
      .glass-card {
        @apply bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg rounded-2xl;
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
      
      .btn-secondary {
        @apply font-semibold rounded-xl text-gray-700 bg-white border border-gray-300 hover:bg-gray-50;
        transition: all 0.3s ease;
      }
    `}</style>
  )
}

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


// =========================================
// Icons
// =========================================

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