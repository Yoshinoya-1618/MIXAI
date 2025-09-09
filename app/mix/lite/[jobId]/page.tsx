'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PreviewEditOnly from '../../../../preview_edit_only_v_7'
import MixTonePanelOnly from '../../../../Mix Tone Panel Only'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Play, Pause, Download, RotateCcw, Sparkles, Music, Volume2, VolumeX, Wand2, HelpCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Lite Plan Mix Params (5軸: Air/Body/Punch/Width/Vocal)
interface LiteMixParams {
  airDb: number          // Air (8-12kHz shelf)
  lowDb: number          // Body (200-350Hz bell)
  highDb: number         // High frequencies
  punchCompDb: number    // Punch (低域MB GR上限)
  spaceReverbSec: number // Width (中高域Side)
  presenceDb: number     // Vocal (2-4kHz bell)
  deEssDb: number        // 単帯域De-esser
  satDb: number          // サチュレーション
  stereoRatio: number    // ステレオ比率
  gateThreshDb: number   // ノイズゲート
  harmVol: number        // ハモリ音量
}

interface JobData {
  id: string
  title: string
  status: string
  plan: 'lite' | 'standard' | 'creator'
  ai_params: LiteMixParams
  user_params: LiteMixParams
  last_export_params?: LiteMixParams
  metrics: any
  // v2.0 アーティファクト管理
  prep_artifact_id: string | null
  ai_ok_artifact_id: string | null
  final_artifact_id: string | null
  // ハモリ機能
  harmony_choice: 'none' | 'up_m3' | 'down_m3' | 'perfect_5th' | 'up_down'
  harmony_level_db: number
  harmony_generated: boolean
  // オーディオ情報
  duration_s?: number
  measured_lufs?: number
  true_peak?: number
  dynamic_range?: number
}

export default function LiteMixPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const jobId = params.jobId as string

  const [job, setJob] = useState<JobData | null>(null)
  const [mixParams, setMixParams] = useState<LiteMixParams>({
    airDb: 0.0,
    lowDb: 0.0,
    highDb: 0.0,
    punchCompDb: 1.0,
    spaceReverbSec: 1.0,
    presenceDb: 0.0,
    deEssDb: 2.0,
    satDb: 1.0,
    stereoRatio: 1.0,
    gateThreshDb: -45,
    harmVol: 0.6
  })
  const [activeMode, setActiveMode] = useState<'AI_BASE' | 'USER_EDIT'>('USER_EDIT')
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // ハモリ機能
  const [harmonyChoice, setHarmonyChoice] = useState<'none' | 'up_m3' | 'down_m3' | 'p5' | 'up_down'>('none')
  const [harmonyLevel, setHarmonyLevel] = useState(0.6)
  const [abComparison, setAbComparison] = useState(false)
  const [preMaster, setPreMaster] = useState(false)
  const [harmonyPreviewUrl, setHarmonyPreviewUrl] = useState<string | null>(null)
  const [isApplyingHarmony, setIsApplyingHarmony] = useState(false)

  // ジョブデータ取得
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/v1/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        
        if (!response.ok) {
          throw new Error('ジョブが見つかりません')
        }

        const data = await response.json()
        setJob(data.job)
        // AI適用済みパラメータがあれば初期値として設定
        if (data.job.ai_params) {
          setMixParams(prev => ({ ...prev, ...data.job.ai_params }))
        }
        
        // ハモリ設定の初期化
        if (data.job.harmony_choice) {
          setHarmonyChoice(data.job.harmony_choice)
        }
        if (data.job.harmony_level_db !== undefined) {
          setHarmonyLevel(data.job.harmony_level_db)
        }
      } catch (error) {
        console.error('Job fetch error:', error)
        toast({
          title: "エラー",
          description: "ジョブデータの取得に失敗しました",
          variant: "destructive"
        })
        router.push('/mypage')
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId, router, toast])

  // Mix Tone Panelからのコミットハンドラ
  const handleMixCommit = (newParams: LiteMixParams) => {
    setMixParams(newParams)
  }

  // Mix Tone Panelのリセットハンドラ
  const handleMixReset = () => {
    if (job?.ai_params) {
      setMixParams({ ...mixParams, ...job.ai_params })
    }
  }


  // プレビュー生成
  const handlePreview = async () => {
    if (isGeneratingPreview) return

    setIsGeneratingPreview(true)
    try {
      const response = await fetch('/api/v1/mix/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          params: mixParams,
          harmony_trial: harmonyChoice !== 'none' ? harmonyChoice : null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // プレビューURLを PreviewEditOnly に渡す
        if ((window as any).mixaiDecodeAndSetAudio) {
          const audioResponse = await fetch(data.previewUrl)
          const arrayBuffer = await audioResponse.arrayBuffer()
          ;(window as any).mixaiDecodeAndSetAudio(arrayBuffer)
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // ハモリ確定（Lite版は +0.5C）
  const handleConfirmHarmony = async () => {
    if (harmonyChoice === 'none' || isApplyingHarmony) return

    setIsApplyingHarmony(true)
    try {
      const response = await fetch('/api/v1/mix/harmony/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          choice: harmonyChoice,
          level_db: harmonyLevel,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "ハモリ適用完了",
          description: `ハモリが確定されました（${data.credits_delta ? `${data.credits_delta}C消費` : '0C'}）`
        })
      }
    } catch (error) {
      console.error('Error confirming harmony:', error)
    } finally {
      setIsApplyingHarmony(false)
    }
  }

  // 最終書き出し
  const handleExport = async (format: string) => {
    if (isExporting) return

    setIsExporting(true)
    try {
      const response = await fetch('/api/v1/mix/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          params: mixParams,
          format,
          targetLufs: -14,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // 結果ページへ遷移
        router.push(`/result/${jobId}`)
      }
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">読み込み中...</div>
    </div>
  }

  if (!job) {
    return <div className="text-center py-8">ジョブが見つかりません</div>
  }

  // ハモリオプション定義
  const HARMONY_OPTIONS = [
    { key: 'none', label: 'なし', description: 'リード単体' },
    { key: 'up_m3', label: 'Up 3度', description: '上の3度' },
    { key: 'down_m3', label: 'Down 3度', description: '下の3度' },
    { key: 'p5', label: 'Perfect 5th', description: '完全5度' },
    { key: 'up_down', label: 'Up + Down', description: '上下3度同時' },
  ]

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(16,185,129,0.08),transparent),linear-gradient(180deg,#0b0c0e,#0e0f12)] text-zinc-200">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* ヘッダー */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">MIXAI Lite</h1>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  5軸調整
                </Badge>
                {job?.ai_params && (
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                    AI解析済み
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>曲長: {job?.duration_s ? `${Math.floor(job.duration_s / 60)}:${String(job.duration_s % 60).padStart(2, '0')}` : '--:--'}</span>
                <span>LUFS: {job?.measured_lufs ? `${job.measured_lufs.toFixed(1)}` : '--'}</span>
                <span>TP: {job?.true_peak ? `${job.true_peak.toFixed(1)}` : '--'}</span>
              </div>
            </div>
          </header>

          {/* プレビュー編集エリア */}
          <PreviewEditOnly />

          {/* 音質調整パネル (Lite版カスタマイズ) */}
          <div className="mt-8">
            <MixTonePanelOnly
              initialMix={mixParams}
              onCommit={handleMixCommit}
              onReset={handleMixReset}
            />
          </div>

          {/* ハモリ・コントロール・書き出しセクション */}
          <div className="mt-8">
            <Card className="border-zinc-700 bg-[#0e0f12]">
              <CardContent className="p-6 space-y-6">
                {/* ハモリセクション */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    ハモリ追加
                    <span className="text-xs text-orange-400 font-normal">(確定時 +0.5C)</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {HARMONY_OPTIONS.map(option => (
                      <Button
                        key={option.key}
                        variant={harmonyChoice === option.key ? "default" : "outline"}
                        className="flex flex-col h-auto py-3"
                        onClick={() => setHarmonyChoice(option.key as any)}
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs opacity-80">{option.description}</span>
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-sm text-zinc-300">ハモリ音量:</label>
                    <div className="flex-1 max-w-xs">
                      <Slider
                        value={[harmonyLevel * 100]}
                        onValueChange={([v]) => setHarmonyLevel(v / 100)}
                        disabled={harmonyChoice === 'none'}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 w-16">{(harmonyLevel * 100).toFixed(0)}%</span>
                  </div>

                  {harmonyChoice !== 'none' && (
                    <Button 
                      onClick={handleConfirmHarmony}
                      disabled={isApplyingHarmony}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {isApplyingHarmony ? 'ハモリ生成中...' : 'ハモリを確定 (+0.5C)'}
                    </Button>
                  )}
                </div>

                {/* コントロール */}
                <div className="border-t border-zinc-700 pt-6">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={abComparison}
                        onCheckedChange={setAbComparison}
                      />
                      <label className="text-sm text-zinc-300">A/B比較</label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-zinc-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          原音とミックス後の比較再生
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={preMaster}
                        onCheckedChange={setPreMaster}
                      />
                      <label className="text-sm text-zinc-300">マスタリング前</label>
                    </div>

                    <Button 
                      onClick={handlePreview}
                      disabled={isGeneratingPreview}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {isGeneratingPreview ? '生成中...' : '30秒プレビュー'}
                    </Button>
                  </div>
                </div>

                {/* 書き出し */}
                <div className="border-t border-zinc-700 pt-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium text-white">書き出し</h3>
                    <Button 
                      onClick={() => handleExport('mp3')}
                      disabled={isExporting}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {isExporting ? '書き出し中...' : 'MP3'}
                    </Button>
                    <Button 
                      onClick={() => handleExport('wav')}
                      disabled={isExporting}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      WAV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}