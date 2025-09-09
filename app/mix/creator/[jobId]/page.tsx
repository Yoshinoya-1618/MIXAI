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
import { Progress } from '@/components/ui/progress'
import { Play, Pause, Download, RotateCcw, Sparkles, Music, Volume2, VolumeX, Wand2, HelpCircle, Upload, Star, Crown, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Creator Plan Mix Params (7軸: Air/Body/Punch/Width/Vocal/Clarity/Presence)
interface CreatorMixParams {
  airDb: number          // Air (8-12kHz shelf)
  lowDb: number          // Body (200-350Hz bell)
  highDb: number         // High frequencies
  punchCompDb: number    // Punch (低域MB GR上限)
  spaceReverbSec: number // Width (中高域Side)
  presenceDb: number     // Vocal (2-4kHz bell)
  clarityDb: number      // Clarity (4-8kHz bell) - Standard追加
  exciterDb: number      // Presence/Exciter (12kHz+) - Creator追加
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
  ai_params: CreatorMixParams
  user_params: CreatorMixParams
  last_export_params?: CreatorMixParams
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
  // Creator専用
  reference_analysis?: {
    genre: string
    tempo: number
    key: string
    loudness_lufs: number
    dynamic_range: number
  }
}

interface ReferenceTrack {
  file: File | null
  analysis: {
    genre: string
    tempo: number
    key: string
    loudness_lufs: number
    dynamic_range: number
  } | null
}

// Creator Plan初期値 (7軸)
const CREATOR_INITIAL_MIX: CreatorMixParams = {
  airDb: 0.0,
  lowDb: 0.0,
  highDb: 0.0,
  punchCompDb: 1.0,
  spaceReverbSec: 1.0,
  presenceDb: 0.0,
  clarityDb: 0.0,      // Standard追加
  exciterDb: 0.0,      // Creator専用
  deEssDb: 2.0,
  satDb: 1.0,
  stereoRatio: 1.0,
  gateThreshDb: -45,
  harmVol: 0.6
}

// ジャンルプリセット（Creator版はより詳細）
const GENRE_PRESETS = [
  { key: 'auto', label: 'AI推定', description: 'AI が最適なジャンルを推定' },
  { key: 'jpop', label: 'J-Pop', description: '明るく親しみやすい音作り' },
  { key: 'jrock', label: 'J-Rock', description: 'パワフルで迫力のあるサウンド' },
  { key: 'ballad', label: 'バラード', description: '情感豊かで温かみのある音' },
  { key: 'acoustic', label: 'アコースティック', description: '自然で素朴な響き' },
  { key: 'jazz', label: 'ジャズ', description: 'スムーズで上品な質感' },
  { key: 'classical', label: 'クラシック', description: '繊細で立体的な音場' },
  { key: 'electronic', label: 'エレクトロニック', description: 'クリアでモダンな質感' },
  { key: 'hiphop', label: 'ヒップホップ', description: '低音重視のパンチある音' },
  { key: 'rnb', label: 'R&B', description: 'なめらかで艶やかな音作り' },
  { key: 'custom', label: 'カスタム', description: 'リファレンス解析結果を適用' }
]

export default function CreatorMixPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const jobId = params.jobId as string

  const [job, setJob] = useState<JobData | null>(null)
  const [mixParams, setMixParams] = useState<CreatorMixParams>(CREATOR_INITIAL_MIX)
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

  // Creator専用機能
  const [selectedGenre, setSelectedGenre] = useState<string>('auto')
  const [referenceTrack, setReferenceTrack] = useState<ReferenceTrack>({
    file: null,
    analysis: null
  })
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [stereoEnhancement, setStereoEnhancement] = useState(false)
  const [dynamicControl, setDynamicControl] = useState(1.0)
  
  // Creator自動付与機能
  const [advancedProcessing, setAdvancedProcessing] = useState(true) // 初期値ON
  const [hqMasterEnabled, setHqMasterEnabled] = useState(true)
  const [strongDenoiseEnabled, setStrongDenoiseEnabled] = useState(true)

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

        // リファレンス解析結果があれば設定
        if (data.job.reference_analysis) {
          setReferenceTrack(prev => ({
            ...prev,
            analysis: data.job.reference_analysis
          }))
          setSelectedGenre('custom')
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
  const handleMixCommit = (newParams: CreatorMixParams) => {
    setMixParams(newParams)
  }

  // Mix Tone Panelのリセットハンドラ
  const handleMixReset = () => {
    if (job?.ai_params) {
      setMixParams({ ...mixParams, ...job.ai_params })
    }
  }

  // リファレンストラックアップロード
  const handleReferenceUpload = async (file: File) => {
    setReferenceTrack(prev => ({ ...prev, file }))
    setIsAnalyzingReference(true)
    setAnalysisProgress(0)

    try {
      const formData = new FormData()
      formData.append('reference', file)
      formData.append('jobId', jobId)

      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 15, 90))
      }, 800)

      const response = await fetch('/api/v1/mix/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (response.ok) {
        const data = await response.json()
        setReferenceTrack(prev => ({
          ...prev,
          analysis: data.analysis
        }))
        setSelectedGenre('custom')
        
        // AIパラメータ更新
        if (data.suggested_params) {
          setMixParams(prev => ({ ...prev, ...data.suggested_params }))
        }

        toast({
          title: "解析完了",
          description: "リファレンストラックの解析が完了しました"
        })
      }
    } catch (error) {
      console.error('Error analyzing reference:', error)
      toast({
        title: "解析エラー",
        description: "リファレンストラックの解析に失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzingReference(false)
      setTimeout(() => setAnalysisProgress(0), 2000)
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
          genre: selectedGenre,
          harmony_trial: harmonyChoice !== 'none' ? harmonyChoice : null,
          reference_analysis: referenceTrack.analysis,
          advanced_mode: advancedMode,
          stereo_enhancement: stereoEnhancement,
          dynamic_control: dynamicControl,
          // Creator自動付与機能
          skipHqMaster: advancedProcessing ? !hqMasterEnabled : true,
          skipStrongDenoise: advancedProcessing ? !strongDenoiseEnabled : true,
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

  // ハモリ確定（Creator版は 0C）
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
          targetLufs: format === 'wav32f' ? -14 : -14, // Creator版は高品質
          genre: selectedGenre,
          reference_analysis: referenceTrack.analysis,
          advanced_processing: advancedMode,
          // Creator自動付与機能
          skipHqMaster: advancedProcessing ? !hqMasterEnabled : true,
          skipStrongDenoise: advancedProcessing ? !strongDenoiseEnabled : true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // 結果ページへ遷移
        router.push(`/result/${jobId}?harmony=${harmonyChoice}`)
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
      <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(255,215,0,0.12),transparent),linear-gradient(180deg,#0b0c0e,#0e0f12)] text-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* ヘッダー */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  MIXAI Creator
                </h1>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                  7軸調整 + リファレンス解析
                </Badge>
                {job?.ai_params && (
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                    AI解析済み
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                  プレミアム機能
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>曲長: {job?.duration_s ? `${Math.floor(job.duration_s / 60)}:${String(job.duration_s % 60).padStart(2, '0')}` : '--:--'}</span>
                <span>LUFS: {job?.measured_lufs ? `${job.measured_lufs.toFixed(1)}` : '--'}</span>
                <span>TP: {job?.true_peak ? `${job.true_peak.toFixed(1)}` : '--'}</span>
                <span>DR: {job?.dynamic_range ? `${job.dynamic_range.toFixed(1)}` : '--'}</span>
              </div>
            </div>
          </header>

          {/* プレビュー編集エリア */}
          <PreviewEditOnly />

          {/* リファレンス解析セクション */}
          <div className="mt-8">
            <Card className="border-zinc-700 bg-[#0e0f12]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  リファレンス解析
                  <span className="text-xs text-yellow-400 font-normal">(Creator専用機能)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ファイルアップロード */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-300 mb-3">リファレンストラック</h3>
                    <div className="border-2 border-dashed border-zinc-600 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors">
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        id="reference-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleReferenceUpload(file)
                        }}
                        disabled={isAnalyzingReference}
                      />
                      <label
                        htmlFor="reference-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-zinc-400" />
                        <span className="text-sm text-zinc-300">
                          {referenceTrack.file ? referenceTrack.file.name : '目標とする楽曲をアップロード'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          MP3, WAV, FLAC対応
                        </span>
                      </label>
                    </div>
                    
                    {isAnalyzingReference && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                          <span>解析中...</span>
                          <span>{analysisProgress}%</span>
                        </div>
                        <Progress value={analysisProgress} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* 解析結果 */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-300 mb-3">解析結果</h3>
                    {referenceTrack.analysis ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">ジャンル:</span>
                          <span className="text-white">{referenceTrack.analysis.genre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">テンポ:</span>
                          <span className="text-white">{referenceTrack.analysis.tempo} BPM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">キー:</span>
                          <span className="text-white">{referenceTrack.analysis.key}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">ラウドネス:</span>
                          <span className="text-white">{referenceTrack.analysis.loudness_lufs.toFixed(1)} LUFS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">ダイナミックレンジ:</span>
                          <span className="text-white">{referenceTrack.analysis.dynamic_range.toFixed(1)} dB</span>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 mt-2">
                          パラメータを自動調整済み
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-zinc-500 text-sm">
                        リファレンストラックをアップロードすると、<br />
                        AI が楽曲を解析して最適なパラメータを提案します
                      </div>
                    )}
                  </div>
                </div>

                {/* ジャンル選択 */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">
                    ジャンル/スタイル
                  </label>
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {GENRE_PRESETS.map(genre => (
                        <SelectItem key={genre.key} value={genre.key}>
                          <div>
                            <div className="font-medium">{genre.label}</div>
                            <div className="text-xs text-zinc-400">{genre.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 音質調整パネル (Creator版カスタマイズ) */}
          <div className="mt-8">
            <MixTonePanelOnly
              initialMix={mixParams}
              onCommit={handleMixCommit}
              onReset={handleMixReset}
            />
          </div>

          {/* プレミアム機能・ハモリ・コントロール・書き出しセクション */}
          <div className="mt-8">
            <Card className="border-zinc-700 bg-[#0e0f12]">
              <CardContent className="p-6 space-y-6">
                {/* プレミアム機能 */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    プレミアム機能
                    <span className="text-xs text-yellow-400 font-normal">(Creator専用)</span>
                  </h3>
                  
                  {/* 高度処理（HQ/強ノイズ）トグル */}
                  <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={advancedProcessing}
                          onCheckedChange={(checked) => {
                            setAdvancedProcessing(checked)
                            setHqMasterEnabled(checked)
                            setStrongDenoiseEnabled(checked)
                          }}
                        />
                        <div>
                          <label className="text-sm text-zinc-300 font-medium flex items-center gap-2">
                            高度処理（HQ/強ノイズ）
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              自動付与
                            </Badge>
                          </label>
                          <p className="text-xs text-zinc-500">
                            HQマスター・強力ノイズ抑制を自動適用（追加クレジット不要）
                          </p>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-zinc-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            素材の状態に応じて自動調整します。音が不自然な場合はOFFにしてください。
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {advancedProcessing && (
                      <div className="mt-3 pl-12 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          HQマスター: 16倍オーバーサンプリング / -14 LUFS / TP ≤ -1.0 dBTP
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          強力ノイズ抑制: 最大14dB削減 / アーティファクト防止機能付き
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={advancedMode}
                        onCheckedChange={setAdvancedMode}
                      />
                      <div>
                        <label className="text-sm text-zinc-300 font-medium">高度処理モード</label>
                        <p className="text-xs text-zinc-500">より精密な音質処理</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={stereoEnhancement}
                        onCheckedChange={setStereoEnhancement}
                      />
                      <div>
                        <label className="text-sm text-zinc-300 font-medium">ステレオエンハンス</label>
                        <p className="text-xs text-zinc-500">立体感を向上</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-zinc-300 font-medium">ダイナミック制御</label>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[dynamicControl * 100]}
                          onValueChange={([v]) => setDynamicControl(v / 100)}
                          className="flex-1"
                        />
                        <span className="text-xs text-zinc-400 w-12">{(dynamicControl * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ハモリセクション */}
                <div className="border-t border-zinc-700 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    ハモリ追加
                    <span className="text-xs text-green-400 font-normal">(無料)</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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
                      {isGeneratingPreview ? '生成中...' : '60秒プレビュー'}
                    </Button>
                  </div>
                </div>

                {/* 書き出し */}
                <div className="border-t border-zinc-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">高品質書き出し</h3>
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      プレミアム品質
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Button 
                      onClick={() => handleExport('mp3')}
                      disabled={isExporting}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {isExporting ? '書き出し中...' : 'MP3 (320kbps)'}
                    </Button>
                    <Button 
                      onClick={() => handleExport('wav')}
                      disabled={isExporting}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      WAV (16bit)
                    </Button>
                    <Button 
                      onClick={() => handleExport('flac')}
                      disabled={isExporting}
                      variant="outline"
                      className="border-purple-500 text-purple-400"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      FLAC (無損失)
                    </Button>
                    <Button 
                      onClick={() => handleExport('wav32f')}
                      disabled={isExporting}
                      variant="outline"
                      className="border-yellow-500 text-yellow-400"
                    >
                      <Star className="mr-2 h-4 w-4" />
                      WAV (32bit float)
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    * 32bit float は業界最高品質。プロフェッショナル用途に最適です
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}