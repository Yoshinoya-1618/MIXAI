"use client"
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '../../web/api'

interface Props { params: { id: string } }

type Job = {
  id: string
  status: 'completed' | 'processing' | 'failed'
  harmony_mode: 'upload' | 'generate'
  harmony_pattern?: 'upper' | 'lower' | 'fifth'
  created_at: string
  completed_at?: string
}

// =========================================
// Palette & Tokens (統一感のため)
// =========================================
const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

export default function ResultPage({ params }: Props) {
  const searchParams = useSearchParams()
  const harmonyPattern = searchParams.get('harmony') as 'upper' | 'lower' | 'fifth' || 'upper'
  
  const [job, setJob] = useState<Job | null>(null)
  const [mp3Url, setMp3Url] = useState<string>('')
  const [wavUrl, setWavUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        // Get job details
        const jobRes = await apiFetch(`/api/v1/jobs/${params.id}`)
        if (jobRes.ok) {
          const jobData = await jobRes.json()
          setJob(jobData)
        }

        // Get download URLs
        const mp3 = await apiFetch(`/api/v1/jobs/${params.id}/download?format=mp3&harmony=${harmonyPattern}`)
        if (mp3.ok) setMp3Url((await mp3.json()).url)
        
        const wav = await apiFetch(`/api/v1/jobs/${params.id}/download?format=wav&harmony=${harmonyPattern}`)
        if (wav.ok) setWavUrl((await wav.json()).url)
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id, harmonyPattern])

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-gray-900">
        <StyleTokens />
        <AuroraBackground />
        <Header />
        
        <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
          <div className="glass-card p-8 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
            <p className="mt-2 text-gray-600">処理結果を取得中...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      {/* Style tokens */}
      <StyleTokens />
      
      {/* Background aura */}
      <AuroraBackground />
      
      {/* Header */}
      <Header />
      
      <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          {/* ヘッダー */}
          <div className="text-center">
            <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
              MIX完了！
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              あなたの歌ってみたが完成しました
            </p>
          </div>

          {/* 完成品プレイヤー */}
          <div className="glass-card p-8">
            <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <MusicIcon className="w-5 h-5 text-emerald-600" />
              完成作品
            </h2>
            
            <div className="space-y-6">
              <div className="text-center">
                {mp3Url ? (
                  <audio 
                    controls 
                    src={mp3Url} 
                    className="w-full max-w-md mx-auto rounded-lg"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <LoadingIcon className="w-5 h-5 text-gray-500 animate-spin" />
                    <span className="text-gray-600">音声ファイルを準備中...</span>
                  </div>
                )}
              </div>

              {job?.harmony_mode === 'generate' && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/50">
                  <div className="flex items-center gap-3 mb-2">
                    <SparklesIcon className="w-5 h-5 text-emerald-600" />
                    <div className="font-medium text-emerald-900">AI生成ハモリ適用済み</div>
                  </div>
                  <div className="text-sm text-emerald-700">
                    選択パターン: {
                      harmonyPattern === 'upper' ? '上ハモ' :
                      harmonyPattern === 'lower' ? '下ハモ' : '5度ハモ'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ダウンロード */}
          <div className="glass-card p-8">
            <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DownloadIcon className="w-5 h-5 text-blue-600" />
              ダウンロード
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                className={clsx(
                  "flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all text-left",
                  mp3Url 
                    ? "border-blue-300 bg-blue-50/80 hover:bg-blue-50 hover:border-blue-400 cursor-pointer" 
                    : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                )}
                onClick={() => mp3Url && window.open(mp3Url, '_blank')}
                disabled={!mp3Url}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <DownloadIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">MP3ダウンロード</div>
                  <div className="text-sm text-gray-600">高音質・軽量形式</div>
                </div>
              </button>

              <button
                className={clsx(
                  "flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all text-left",
                  wavUrl 
                    ? "border-purple-300 bg-purple-50/80 hover:bg-purple-50 hover:border-purple-400 cursor-pointer" 
                    : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                )}
                onClick={() => wavUrl && window.open(wavUrl, '_blank')}
                disabled={!wavUrl}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <DownloadIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">WAVダウンロード</div>
                  <div className="text-sm text-gray-600">最高音質・非圧縮</div>
                </div>
              </button>
            </div>
          </div>

          {/* 処理詳細 */}
          <div className="glass-card p-8">
            <h2 className="font-semibold text-gray-900 mb-6">処理詳細</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/50">
                <div className="text-gray-600 mb-1">ジョブID</div>
                <div className="font-mono text-xs text-gray-900 break-all">{params.id}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-xl border border-emerald-200/50">
                <div className="text-gray-600 mb-1">処理時間</div>
                <div className="font-semibold text-gray-900">
                  {job?.completed_at && job?.created_at ? 
                    `${Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)}秒` :
                    '計算中'
                  }
                </div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-xl border border-purple-200/50">
                <div className="text-gray-600 mb-1">音質</div>
                <div className="font-semibold text-gray-900">-14 LUFS / -1 dBTP</div>
              </div>
            </div>
          </div>

          {/* クレジット表記 */}
          <div className="glass-card p-8">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <InfoIcon className="w-5 h-5 text-blue-600" />
              クレジット表記
            </h2>
            <div className="p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 rounded-lg border border-gray-200/50">
              <div className="text-sm text-gray-700 mb-2">
                動画投稿時にご使用ください：
              </div>
              <div className="font-mono text-sm bg-white/80 p-3 rounded border select-all">
                MIX & Mastering: MIXAI (-14 LUFS / -1 dBTP)
              </div>
              <div className="text-xs text-gray-500 mt-2">
                ※ クリックしてコピーできます
              </div>
            </div>
          </div>

          {/* 次のアクション */}
          <div className="text-center">
            <button 
              className="btn-primary px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all"
              onClick={() => window.location.href = '/upload'}
            >
              <div className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                <span>新しい楽曲をMIXする</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
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

function Header() {
  return (
    <header className="relative border-b border-white/10 bg-white/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-xl text-gray-900">MIXAI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              ログイン
            </button>
            <button className="btn-primary px-6 py-2 text-sm">
              無料で始める
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

// =========================================
// Icons
// =========================================

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18.75 19.5H6.75Z" />
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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}