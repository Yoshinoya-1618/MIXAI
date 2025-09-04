'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '../web/api'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'

type Job = { 
  id: string; 
  status: string; 
  offset_ms: number | null;
  instrumental_path: string;
  vocal_path: string;
  harmony_path: string | null;
  harmony_mode: 'upload' | 'generate';
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

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      {/* Style tokens */}
      <StyleTokens />
      
      {/* Background aura */}
      <AuroraBackground />
      
      {/* Header */}
      <Header currentPage="preview" />
      
      <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <Suspense fallback={<div className="text-center">読み込み中…</div>}>
          <PreviewContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  )
}

function PreviewContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const jobId = sp.get('job')
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewMode, setPreviewMode] = useState<'before' | 'after'>('before')
  const [selectedHarmonyPattern, setSelectedHarmonyPattern] = useState<'upper' | 'lower' | 'fifth'>('upper')

  useEffect(() => {
    if (!jobId) return
    ;(async () => {
      try {
        const res = await apiFetch(`/api/v1/jobs/${jobId}`)
        if (res.ok) {
          const jobData = await res.json()
          setJob(jobData)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [jobId])

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        </div>
        <p className="mt-2 text-gray-600">プレビューを生成中...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-red-600 font-medium">
          ジョブが見つかりません
        </div>
        <button className="btn-secondary mt-4" onClick={() => router.push('/upload')}>
          アップロードに戻る
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
          プレビュー確認
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          15秒の試聴で処理結果をご確認いただけます
        </p>
      </div>

      {/* プレビュープレイヤー */}
      <div className="glass-card p-8">
        <PreviewPlayer 
          jobId={jobId!} 
          mode={previewMode}
          onModeChange={setPreviewMode}
        />
      </div>

      {/* プリセット選択 */}
      <PresetSelector jobId={jobId!} />

      {/* ハモリパターン選択 (AI生成の場合) */}
      {job.harmony_mode === 'generate' && (
        <div className="glass-card p-8">
          <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-emerald-600" />
            ハモリパターン選択
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'upper', name: '上ハモ', desc: '主旋律より高い音域で美しくハモります' },
              { id: 'lower', name: '下ハモ', desc: '主旋律より低い音域で深みを演出します' },
              { id: 'fifth', name: '5度ハモ', desc: '完全5度で安定感のあるハーモニーを' }
            ].map(pattern => (
              <button
                key={pattern.id}
                onClick={() => setSelectedHarmonyPattern(pattern.id as any)}
                className={clsx(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  selectedHarmonyPattern === pattern.id
                    ? "border-emerald-500 bg-emerald-50/80 shadow-lg"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={clsx(
                    "w-4 h-4 rounded-full border-2",
                    selectedHarmonyPattern === pattern.id
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-gray-300"
                  )} />
                  <div className="font-medium text-gray-900">{pattern.name}</div>
                </div>
                <div className="text-sm text-gray-600">{pattern.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 処理情報 */}
      <div className="glass-card p-8">
        <h2 className="font-semibold text-gray-900 mb-6">処理詳細</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/50">
            <div className="text-gray-600 mb-1">推定オフセット</div>
            <div className="font-semibold text-gray-900">{job.offset_ms ?? 0}ms</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-xl border border-emerald-200/50">
            <div className="text-gray-600 mb-1">ハモリ</div>
            <div className="font-semibold text-gray-900">
              {job.harmony_mode === 'generate' ? 'AI生成' : job.harmony_path ? 'アップロード済み' : 'なし'}
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-xl border border-purple-200/50">
            <div className="text-gray-600 mb-1">処理時間目安</div>
            <div className="font-semibold text-gray-900">1-2分</div>
          </div>
        </div>
      </div>

      {/* アクション */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          className="btn-secondary px-8 py-3 text-lg" 
          onClick={() => router.back()}
        >
          戻って修正
        </button>
        <button 
          className="btn-primary px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all" 
          onClick={() => jobId && router.push(`/result?job=${jobId}&harmony=${selectedHarmonyPattern}`)}
        >
          <div className="flex items-center gap-2">
            <PlayIcon className="w-5 h-5" />
            <span>MIX開始</span>
          </div>
        </button>
      </div>
    </div>
  )
}

function PreviewPlayer({ 
  jobId, 
  mode, 
  onModeChange 
}: { 
  jobId: string; 
  mode: 'before' | 'after'; 
  onModeChange: (mode: 'before' | 'after') => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(15) // 15秒プレビュー
  const audioRef = useRef<HTMLAudioElement>(null)

  // 実装版では署名URLを取得
  const previewUrl = `/api/v1/jobs/${jobId}/preview?mode=${mode}`

  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const switchMode = (newMode: 'before' | 'after') => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setCurrentTime(0)
    }
    onModeChange(newMode)
  }

  return (
    <div className="space-y-8">
      {/* モード切り替え */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <button
            className={clsx(
              "px-6 py-3 text-sm font-medium rounded-l-xl transition-all",
              mode === 'before' 
                ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            onClick={() => switchMode('before')}
          >
            処理前
          </button>
          <button
            className={clsx(
              "px-6 py-3 text-sm font-medium rounded-r-xl transition-all",
              mode === 'after' 
                ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            onClick={() => switchMode('after')}
          >
            処理後
          </button>
        </div>
      </div>

      {/* プレイヤーコントロール */}
      <div className="text-center">
        <button 
          onClick={togglePlay}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105"
          aria-label={isPlaying ? '停止' : '再生'}
        >
          {isPlaying ? (
            <PauseIcon className="w-8 h-8" />
          ) : (
            <PlayIcon className="w-8 h-8 ml-1" />
          )}
        </button>
      </div>

      {/* 進行状況 */}
      <div className="space-y-3">
        <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden">
          <div 
            className="h-3 rounded-full transition-all duration-100 bg-gradient-to-r from-indigo-500 to-blue-500" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>{Math.floor(currentTime)}s</span>
          <span>{duration}s</span>
        </div>
      </div>

      {/* 隠し音声要素 */}
      <audio
        ref={audioRef}
        src={previewUrl}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(Math.min(audioRef.current.duration, 15))
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* 説明 */}
      <div className="text-center p-4 rounded-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50">
        <div className="flex items-center justify-center gap-2 text-blue-700">
          <HeadphonesIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {mode === 'before' ? (
              '元の音声ファイルの最初の15秒間'
            ) : (
              '処理後の音声イメージ（最初の15秒間）'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

function PresetSelector({ jobId }: { jobId: string }) {
  const [presets, setPresets] = useState<any>(null)
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [microAdjust, setMicroAdjust] = useState({
    forwardness: 0,
    space: 0.2,
    brightness: 0.5
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // プリセット情報取得
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/v1/presets')
        if (res.ok) {
          const data = await res.json()
          setPresets(data)
          // デフォルトプリセットを設定
          const defaultPreset = getDefaultPresetForPlan(data.planCode)
          setSelectedPreset(defaultPreset)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey)
    // プリセット変更時に設定を保存
    saveSettings(presetKey, microAdjust)
  }

  const handleMicroAdjustChange = (key: string, value: number) => {
    const newAdjust = { ...microAdjust, [key]: value }
    setMicroAdjust(newAdjust)
    // リアルタイム保存
    saveSettings(selectedPreset, newAdjust)
  }

  const saveSettings = async (presetKey: string, adjust: any) => {
    if (!presetKey || saving) return
    
    setSaving(true)
    try {
      await apiFetch(`/api/v1/jobs/${jobId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          preset_key: presetKey,
          micro_adjust: adjust
        })
      })
    } catch (error) {
      console.error('設定保存エラー:', error)
    } finally {
      setSaving(false)
    }
  }

  const getDefaultPresetForPlan = (planCode: string) => {
    switch (planCode) {
      case 'lite': return 'clean_light'
      case 'standard': return 'wide_pop'  
      case 'creator': return 'studio_shine'
      default: return 'clean_light'
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!presets) return null

  return (
    <div className="glass-card p-8">
      <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-indigo-600" />
        音質プリセット選択
        {saving && <span className="text-sm text-blue-600 ml-2">保存中...</span>}
      </h2>

      {/* プラン情報 */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <CrownIcon className="w-4 h-4" />
          <span>現在のプラン: <strong>{presets.planCode.toUpperCase()}</strong></span>
          <span className="ml-4">利用可能プリセット: <strong>{getTotalPresets(presets.presets)}種</strong></span>
        </div>
      </div>

      {/* カテゴリ別プリセット */}
      <div className="space-y-6">
        {Object.entries(presets.presets).map(([category, categoryPresets]) => 
          (categoryPresets as any[]).length > 0 && (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">
                {category} ({(categoryPresets as any[]).length}種)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(categoryPresets as any[]).map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetChange(preset.key)}
                    className={clsx(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      selectedPreset === preset.key
                        ? "border-indigo-500 bg-indigo-50/80 shadow-lg"
                        : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={clsx(
                        "w-4 h-4 rounded-full border-2",
                        selectedPreset === preset.key
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-gray-300"
                      )} />
                      <div className="font-medium text-gray-900">{preset.displayName}</div>
                    </div>
                    <div className="text-sm text-gray-600">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* 微調整（Standard/Creator のみ） */}
      {presets.features.microAdjust && (
        <div className="mt-8 pt-6 border-t border-gray-200/50">
          <h3 className="font-medium text-gray-900 mb-4">微調整</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MicroAdjustSlider
              label="前後感"
              value={microAdjust.forwardness}
              min={-15}
              max={15}
              step={1}
              unit=""
              description="ボーカルの前後感を調整"
              onChange={(value) => handleMicroAdjustChange('forwardness', value)}
            />
            <MicroAdjustSlider
              label="空間"
              value={microAdjust.space}
              min={0}
              max={0.45}
              step={0.05}
              unit=""
              description="リバーブの深さを調整"
              onChange={(value) => handleMicroAdjustChange('space', value)}
            />
            <MicroAdjustSlider
              label="明るさ"
              value={microAdjust.brightness}
              min={-2.5}
              max={2.5}
              step={0.1}
              unit="dB"
              description="高域の明るさを調整"
              onChange={(value) => handleMicroAdjustChange('brightness', value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MicroAdjustSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  description,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  description: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-600">{value.toFixed(1)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}

function getTotalPresets(presets: any) {
  return Object.values(presets).flat().length
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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 17.5a2.25 2.25 0 0 1-2.25 2.25h-.75A2.25 2.25 0 0 1 14.25 17.5V15a2.25 2.25 0 0 1 2.25-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v2.5zM4.5 17.5a2.25 2.25 0 0 0 2.25 2.25h.75A2.25 2.25 0 0 0 9.75 17.5V15a2.25 2.25 0 0 0-2.25-2.25h-.75A2.25 2.25 0 0 0 4.5 15v2.5zM12 6.75a5.25 5.25 0 0 1 5.25 5.25v.75h-1.5V12a3.75 3.75 0 1 0-7.5 0v.75h-1.5V12A5.25 5.25 0 0 1 12 6.75Z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.932 6.932 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3-3h.008v.008a3 3 0 0 1-3 2.992m-9 0a3 3 0 0 0-3-3h-.008v.008a3 3 0 0 0 3 2.992m9-3a3 3 0 0 1-3 3m3-3v-1.5a3 3 0 0 0-3-3m-6 4.5a3 3 0 0 0 3 3m-3-3v-1.5a3 3 0 0 1 3-3m-3 4.5h3m-3-7.5v-1m6 4.5V9a1.5 1.5 0 0 0-1.5-1.5H9A1.5 1.5 0 0 0 7.5 9v4.5m0-4.5L12 6l4.5 3v1.5" />
    </svg>
  )
}
