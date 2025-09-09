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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Play, Pause, Download, RotateCcw, Sparkles, Music, Volume2, VolumeX, Wand2, HelpCircle, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Standard Plan Mix Params (6軸: Air/Body/Punch/Width/Vocal/Clarity)
interface StandardMixParams {
  airDb: number          // Air (8-12kHz shelf)
  lowDb: number          // Body (200-350Hz bell)
  highDb: number         // High frequencies
  punchCompDb: number    // Punch (低域MB GR上限)
  spaceReverbSec: number // Width (中高域Side)
  presenceDb: number     // Vocal (2-4kHz bell)
  clarityDb: number      // Clarity (0.6-2k DynEQ) - Standard版追加
  deEssDb: number        // マルチ帯域De-esser
  satDb: number          // サチュレーション
  stereoRatio: number    // ステレオ比率
  gateThreshDb: number   // ノイズゲート
  harmVol: number        // ハモリ音量
  // ジャンル別調整
  genrePreset: string    // J-Pop/ROCK/EDM/Ballad
}

interface JobData {
  id: string
  title: string
  status: string
  ai_params: StandardMixParams
  user_params: StandardMixParams
  last_export_params?: StandardMixParams
  metrics: any
  harmony_paths?: any
  harmony_generated: boolean
  harmony_choice?: string
  harmony_level_db: number
  // オーディオ情報
  duration_s?: number
  measured_lufs?: number
  true_peak?: number
  dynamic_range?: number
}

interface HarmonyOption {
  id: 'up_m3' | 'down_m3' | 'p5' | 'up_down'
  label: string
  description: string
}

const harmonyOptions: HarmonyOption[] = [
  { id: 'up_m3', label: 'Lead + Up m3', description: '上3度' },
  { id: 'down_m3', label: 'Lead + Down m3', description: '下3度' },
  { id: 'p5', label: 'Lead + Perfect 5th', description: '5度' },
  { id: 'up_down', label: 'Lead + Up + Down m3', description: '上下3度同時' }
]

const genreTargets = [
  { value: 'j-pop', label: 'J-Pop' },
  { value: 'rock', label: 'ROCK' },
  { value: 'edm', label: 'EDM' },
  { value: 'ballad', label: 'Ballad' }
]

export default function StandardMixPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const jobId = params.jobId as string

  const [job, setJob] = useState<JobData | null>(null)
  const [mixParams, setMixParams] = useState<StandardMixParams>({
    airDb: 0.0,
    lowDb: 0.0,
    highDb: 0.0,
    punchCompDb: 1.0,
    spaceReverbSec: 1.0,
    presenceDb: 0.0,
    clarityDb: 0.0,      // Standard版追加項目
    deEssDb: 2.0,
    satDb: 1.0,
    stereoRatio: 1.0,
    gateThreshDb: -45,
    harmVol: 0.6,
    genrePreset: 'auto'  // Standard版追加項目
  })
  const [activeMode, setActiveMode] = useState<'AI_BASE' | 'USER_EDIT'>('USER_EDIT')
  const [masterMode, setMasterMode] = useState<'pre' | 'post'>('post')
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [harmonyTrialMode, setHarmonyTrialMode] = useState<string>('none')
  const [harmonyChoice, setHarmonyChoice] = useState<string>('none')
  const [harmonyLevel, setHarmonyLevel] = useState(job?.harmony_level_db || -6)
  const [isApplyingHarmony, setIsApplyingHarmony] = useState(false)
  const [abComparison, setAbComparison] = useState(false)
  const [preMaster, setPreMaster] = useState(false)

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
        setJob(data)
        // AI適用済みパラメータがあれば初期値として設定
        if (data.ai_params) {
          setMixParams(prev => ({ ...prev, ...data.ai_params }))
        }
        // ハモリ設定の初期化
        if (data.harmony_choice) {
          setHarmonyChoice(data.harmony_choice)
        }
        if (data.harmony_level_db !== undefined) {
          setHarmonyLevel(data.harmony_level_db)
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
  const handleMixCommit = (newParams: StandardMixParams) => {
    setMixParams(newParams)
  }

  // Mix Tone Panelのリセットハンドラ
  const handleMixReset = () => {
    if (job?.ai_params) {
      setMixParams({ ...mixParams, ...job.ai_params })
    }
  }

  // ジャンル変更時の差分適用
  const handleGenreChange = (newGenre: string) => {
    const genreCoefficients = {
      jpop: { clarityDb: 1.0, airDb: 0.5, highDb: 1.0, presenceDb: 1.0, punchCompDb: 1.0, spaceReverbSec: 1.0, stereoRatio: 1.0, satDb: 1.0 },
      rock: { clarityDb: 1.0, punchCompDb: 1.5, highDb: 1.0, presenceDb: 1.2, airDb: 0.8, spaceReverbSec: 1.0, stereoRatio: 1.0, satDb: 1.0 },
      edm: { clarityDb: 1.0, airDb: 1.5, highDb: 1.0, spaceReverbSec: 1.3, stereoRatio: 1.2, punchCompDb: 1.0, presenceDb: 1.0, satDb: 1.0 },
      ballad: { clarityDb: 1.0, spaceReverbSec: 1.4, highDb: 1.0, presenceDb: 0.8, satDb: 0.7, airDb: 1.0, punchCompDb: 1.0, stereoRatio: 1.0 }
    }

    if (newGenre !== 'auto' && genreCoefficients[newGenre as keyof typeof genreCoefficients]) {
      const coeffs = genreCoefficients[newGenre as keyof typeof genreCoefficients]
      setMixParams(prev => ({
        ...prev,
        genrePreset: newGenre,
        // 差分適用（AI適用値に係数をかける）
        clarityDb: prev.clarityDb * coeffs.clarityDb,
        airDb: prev.airDb * coeffs.airDb,
        highDb: prev.highDb * coeffs.highDb,
        presenceDb: prev.presenceDb * coeffs.presenceDb,
        punchCompDb: prev.punchCompDb * coeffs.punchCompDb,
        spaceReverbSec: prev.spaceReverbSec * coeffs.spaceReverbSec,
        stereoRatio: prev.stereoRatio * coeffs.stereoRatio,
        satDb: prev.satDb * coeffs.satDb
      }))
    } else {
      setMixParams(prev => ({ ...prev, genrePreset: newGenre }))
    }
  }

  // ハモリ試聴
  const tryHarmony = async (harmonyId: string) => {
    if (!mixParams || isGeneratingPreview) return

    setHarmonyTrialMode(harmonyId)
    setIsGeneratingPreview(true)
    
    try {
      const response = await fetch('/api/v1/mix/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          jobId,
          params: mixParams,
          mode: masterMode + 'Master',
          harmony_trial: harmonyId
        })
      })

      if (!response.ok) {
        throw new Error('ハモリプレビュー生成に失敗しました')
      }

      const data = await response.json()
      setPreviewUrl(data.previewUrl)
      
    } catch (error) {
      console.error('Harmony trial error:', error)
      toast({
        title: "エラー",
        description: "ハモリプレビューに失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // ハモリ確定
  const applyHarmony = async () => {
    if (!harmonyTrialMode || harmonyTrialMode === 'none') return

    setIsApplyingHarmony(true)
    try {
      const response = await fetch('/api/v1/mix/harmony/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          jobId,
          choice: harmonyTrialMode,
          level_db: harmonyLevel
        })
      })

      if (!response.ok) {
        throw new Error('ハモリ適用に失敗しました')
      }

      const data = await response.json()
      
      if (job) {
        setJob({
          ...job,
          harmony_choice: data.harmony_choice,
          harmony_level_db: data.harmony_level_db
        })
      }
      
      toast({
        title: "ハモリ適用完了",
        description: `${harmonyOptions.find(h => h.id === harmonyTrialMode)?.label} を適用しました（クレジット消費なし）`
      })
    } catch (error) {
      console.error('Harmony apply error:', error)
      toast({
        title: "エラー",
        description: "ハモリ適用に失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsApplyingHarmony(false)
    }
  }

  // プレビュー生成
  const handlePreview = async () => {
    if (isGeneratingPreview) return

    setIsGeneratingPreview(true)
    try {
      const response = await fetch('/api/v1/mix/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          jobId,
          params: mixParams,
          harmony_trial: harmonyChoice !== 'none' ? harmonyChoice : null,
        })
      })

      if (!response.ok) {
        throw new Error('プレビュー生成に失敗しました')
      }

      const data = await response.json()
      // プレビューURLを PreviewEditOnly に渡す
      if ((window as any).mixaiDecodeAndSetAudio) {
        const audioResponse = await fetch(data.previewUrl)
        const arrayBuffer = await audioResponse.arrayBuffer()
        ;(window as any).mixaiDecodeAndSetAudio(arrayBuffer)
      }
    } catch (error) {
      console.error('Preview error:', error)
      toast({
        title: "エラー",
        description: "プレビュー生成に失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // ハモリ確定（Standard版は 0C）
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          jobId,
          params: mixParams,
          format,
          targetLufs: -14,
        })
      })

      if (!response.ok) {
        throw new Error('書き出しに失敗しました')
      }

      const data = await response.json()
      
      // 結果ページへ遷移
      router.push(`/result/${jobId}?harmony=${harmonyChoice}`)
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "エラー",
        description: "書き出しに失敗しました",
        variant: "destructive"
      })
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

  // ジャンルプリセット定義
  const GENRE_PRESETS = [
    { key: 'auto', label: 'AI推定', description: 'AI が最適なジャンルを推定' },
    { key: 'jpop', label: 'J-Pop', description: '明るく親しみやすい音作り' },
    { key: 'rock', label: 'ROCK', description: 'パワフルでアタック感重視' },
    { key: 'edm', label: 'EDM', description: 'デジタルで広がりのある音' },
    { key: 'ballad', label: 'Ballad', description: '温かみのある音作り' },
  ]

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
                <h1 className="text-2xl font-bold text-white">MIXAI Standard</h1>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                  6軸調整 + ジャンル
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

          {/* 音質調整パネル (Standard版カスタマイズ) */}
          <div className="mt-8">
            <MixTonePanelOnly
              initialMix={mixParams}
              onCommit={handleMixCommit}
              onReset={handleMixReset}
            />
          </div>

          {/* ジャンル選択セクション */}
          <div className="mt-8">
            <Card className="border-zinc-700 bg-[#0e0f12]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  ジャンル選択
                  <span className="text-xs text-purple-400 font-normal">(Standard版)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {GENRE_PRESETS.map(preset => (
                    <Button
                      key={preset.key}
                      variant={mixParams.genrePreset === preset.key ? "default" : "outline"}
                      className="flex flex-col h-auto py-3"
                      onClick={() => handleGenreChange(preset.key)}
                    >
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-xs opacity-80">{preset.description}</span>
                    </Button>
                  ))}
                </div>
                <div className="mt-3 text-xs text-zinc-400">
                  <p>• ジャンル切替で差分係数を適用（AI適用値基準）</p>
                  <p>• 手動AB視聴でジャンル効果を確認可能</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 詳細調整セクション */}
          <div className="mt-8">
            <Card className="border-zinc-700 bg-[#0e0f12]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    詳細調整
                    <span className="text-xs text-purple-400 font-normal">(Standard版)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? '閉じる' : '開く'}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  {/* De-esser帯域調整 */}
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">
                      De-esser 帯域 (Standard版: マルチ帯域)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-400">S音帯域</label>
                        <Slider
                          value={[mixParams.deEssDb * 0.6]} // S音帯域の比率
                          onValueChange={([v]) => setMixParams(prev => ({ 
                            ...prev, 
                            deEssDb: prev.deEssDb 
                          }))}
                          max={12}
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400">SH音帯域</label>
                        <Slider
                          value={[mixParams.deEssDb * 0.4]} // SH音帯域の比率
                          onValueChange={([v]) => setMixParams(prev => ({ 
                            ...prev, 
                            deEssDb: prev.deEssDb 
                          }))}
                          max={12}
                          min={0}
                          step={0.5}
                        />
                      </div>
                    </div>
                  </div>

                  {/* MBコンプタイム定数 */}
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">
                      MBコンプ タイム定数 (4band)
                    </label>
                    <Select value="medium" onValueChange={(value) => {}}>
                      <SelectTrigger>
                        <SelectValue placeholder="タイム定数を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fast">Fast (レスポンス重視)</SelectItem>
                        <SelectItem value="medium">Medium (バランス)</SelectItem>
                        <SelectItem value="slow">Slow (自然さ重視)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Side制御 + アパーチャ微調 */}
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-2 block">
                      ステレオ処理 (Side制御 + アパーチャ微調)
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Side制御</span>
                        <span className="text-xs text-zinc-400">{mixParams.stereoRatio.toFixed(2)}×</span>
                      </div>
                      <Slider
                        value={[mixParams.stereoRatio]}
                        onValueChange={([v]) => setMixParams(prev => ({ ...prev, stereoRatio: v }))}
                        max={1.5}
                        min={0.5}
                        step={0.05}
                      />
                      <p className="text-xs text-zinc-400">
                        • &lt;120Hz は Mono 固定
                        • アパーチャ微調整機能搭載
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
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
                    <span className="text-xs text-green-400 font-normal">(0C - 無料)</span>
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
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {isApplyingHarmony ? 'ハモリ生成中...' : 'ハモリを確定 (0C)'}
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
                          原音とミックス後の比較再生 (-14 LUFS 正規化)
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={preMaster}
                        onCheckedChange={setPreMaster}
                      />
                      <label className="text-sm text-zinc-300">pre/postMaster</label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-zinc-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          マスタリング前後の切り替え
                        </TooltipContent>
                      </Tooltip>
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
                    <Button 
                      onClick={() => handleExport('flac')}
                      disabled={isExporting}
                      variant="outline"
                      className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      FLAC
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    <p>• Standard版: MP3/WAV/FLAC 対応</p>
                    <p>• 8x オーバーサンプリング</p>
                    <p>• 解析連動 Ducking (1-2dB)</p>
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