// app/mix/standard/[jobId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Play, Pause, Download, RotateCcw, Sparkles, Settings, Music2, ChevronDown, Volume2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MixParams {
  air: number
  body: number
  punch: number
  width: number
  vocal: number
  clarity: number
  fade_in: number
  fade_out: number
  output_gain: number
  genre_target: string
  offset_ms: number
  processing_settings: {
    plan: string
    dtw_enabled: boolean
    pitch_correction: any[]
    oversampling: number
  }
}

interface JobData {
  id: string
  title: string
  status: string
  ai_params: MixParams
  user_params: MixParams
  last_export_params?: MixParams
  metrics: any
  harmony_paths?: any
  harmony_generated: boolean
  harmony_choice?: string
  harmony_level_db: number
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
  const [currentParams, setCurrentParams] = useState<MixParams | null>(null)
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
  const [harmonyLevel, setHarmonyLevel] = useState(job?.harmony_level_db || -6)
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
        setCurrentParams(data.job.user_params || data.job.ai_params)
        setHarmonyLevel(data.job.harmony_level_db || -6)
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

  // パラメータ変更ハンドラー
  const handleParamChange = (param: keyof MixParams, value: number | string) => {
    if (!currentParams) return

    setCurrentParams(prev => ({
      ...prev!,
      [param]: value
    }))
    setActiveMode('USER_EDIT')
  }

  // AI_BASEに戻す
  const resetToAIBase = () => {
    if (!job) return
    setCurrentParams(job.ai_params)
    setActiveMode('AI_BASE')
    toast({
      title: "リセット完了",
      description: "AI適用値に戻しました"
    })
  }

  // ハモリ試聴
  const tryHarmony = async (harmonyId: string) => {
    if (!currentParams || isGeneratingPreview) return

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
          params: currentParams,
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
  const generatePreview = async () => {
    if (!currentParams || isGeneratingPreview) return

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
          params: currentParams,
          ab: activeMode,
          mode: masterMode + 'Master'
        })
      })

      if (!response.ok) {
        throw new Error('プレビュー生成に失敗しました')
      }

      const data = await response.json()
      setPreviewUrl(data.previewUrl)
      setActiveMode('USER_EDIT')
      
      toast({
        title: "プレビュー生成完了",
        description: "30秒プレビューが生成されました（クレジット消費なし）"
      })
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

  // 最終書き出し
  const exportFinal = async (format: string) => {
    if (!currentParams || isExporting) return

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
          params: currentParams,
          format,
          targetLufs: -14
        })
      })

      if (!response.ok) {
        throw new Error('書き出しに失敗しました')
      }

      const data = await response.json()
      setExportUrl(data.fileUrl)
      
      const formatLabel = format === 'flac' ? 'FLAC' : format === 'wav16' ? 'WAV 16-bit' : 'MP3'
      toast({
        title: "書き出し完了",
        description: `${formatLabel}ファイルが生成されました（クレジット消費なし）`
      })
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

  if (!job || !currentParams) {
    return <div className="text-center py-8">ジョブが見つかりません</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="default">Standard</Badge>
              <h1 className="text-2xl font-bold">{job.title}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              6軸MIX調整 • ジャンル最適化 • FLAC書き出し • クレジット消費なし
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/mypage')}
          >
            マイページに戻る
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* メイン調整パネル */}
        <div className="lg:col-span-3">
          <div className="space-y-6">
            {/* ジャンル設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="w-5 h-5" />
                  ジャンル設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium">楽曲ジャンル</label>
                  <Select 
                    value={currentParams.genre_target} 
                    onValueChange={(value) => handleParamChange('genre_target', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {genreTargets.map(genre => (
                        <SelectItem key={genre.value} value={genre.value}>
                          {genre.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    ジャンルに応じてEQカーブと圧縮特性を最適化
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* MIXパラメータ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    MIX パラメータ調整
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetToAIBase}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    AI値に戻す
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 基本パラメータ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Air */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Air - 高域の華やかさ</label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(currentParams.air * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentParams.air]}
                      onValueChange={([value]) => handleParamChange('air', value)}
                      max={1}
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Body - 中低域の厚み</label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(currentParams.body * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentParams.body]}
                      onValueChange={([value]) => handleParamChange('body', value)}
                      max={1}
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Vocal */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Vocal - 中域の明瞭さ</label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(currentParams.vocal * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentParams.vocal]}
                      onValueChange={([value]) => handleParamChange('vocal', value)}
                      max={1}
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Clarity (Standard専用) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">
                        Clarity - 音像の分離
                        <Badge variant="outline" className="ml-2 text-xs">Standard</Badge>
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(currentParams.clarity * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentParams.clarity]}
                      onValueChange={([value]) => handleParamChange('clarity', value)}
                      max={1}
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Punch */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Punch - アタック感</label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(currentParams.punch * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentParams.punch]}
                      onValueChange={([value]) => handleParamChange('punch', value)}
                      max={1}
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Width */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Width - ステレオ幅</label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(currentParams.width * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[currentParams.width]}
                      onValueChange={([value]) => handleParamChange('width', value)}
                      max={1}
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                {/* 詳細設定（折りたたみ） */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                    <Settings className="w-4 h-4" />
                    詳細設定
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">De-esser 強度</label>
                        <Slider
                          value={[0.5]}
                          max={1}
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">MB時定数</label>
                        <Select value="medium" onValueChange={() => {}}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fast">Fast</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="slow">Slow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* ハモリアドリション */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  ハモリアドリション
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ハモリ試聴ボタン */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {harmonyOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={harmonyTrialMode === option.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => tryHarmony(option.id)}
                      disabled={isGeneratingPreview}
                      className="flex-col h-auto py-3"
                    >
                      <span className="font-medium">{option.label.split(' + ')[1]}</span>
                      <span className="text-xs opacity-70">{option.description}</span>
                    </Button>
                  ))}
                </div>

                {/* ハモリレベル */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Harmony Level</label>
                    <span className="text-sm text-muted-foreground">
                      {harmonyLevel.toFixed(1)} dB
                    </span>
                  </div>
                  <Slider
                    value={[harmonyLevel]}
                    onValueChange={([value]) => setHarmonyLevel(value)}
                    max={0}
                    min={-12}
                    step={0.1}
                  />
                </div>

                {/* 確定ボタン */}
                {harmonyTrialMode !== 'none' && (
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={applyHarmony}
                      disabled={isApplyingHarmony}
                      className="flex-1"
                    >
                      {isApplyingHarmony ? '適用中...' : `${harmonyOptions.find(h => h.id === harmonyTrialMode)?.label} を確定`}
                    </Button>
                    <Badge variant="secondary">0C</Badge>
                  </div>
                )}

                {job.harmony_choice && (
                  <div className="text-sm text-muted-foreground">
                    適用中: {harmonyOptions.find(h => h.id === job.harmony_choice)?.label}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* プレビュー */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プレビュー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={generatePreview}
                  disabled={isGeneratingPreview}
                  className="w-full"
                >
                  {isGeneratingPreview ? '生成中...' : '30秒プレビュー'}
                </Button>

                {/* Master Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={masterMode === 'pre' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMasterMode('pre')}
                    className="flex-1"
                  >
                    pre Master
                  </Button>
                  <Button
                    variant={masterMode === 'post' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMasterMode('post')}
                    className="flex-1"
                  >
                    post Master
                  </Button>
                </div>

                {previewUrl && (
                  <div className="space-y-3">
                    <audio
                      controls
                      src={previewUrl}
                      className="w-full"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    
                    <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as any)}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="AI_BASE">AI適用値</TabsTrigger>
                        <TabsTrigger value="USER_EDIT">調整後</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 書き出し */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最終書き出し</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={() => exportFinal('mp3')}
                  disabled={isExporting}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  MP3 320kbps
                </Button>

                <Button
                  onClick={() => exportFinal('wav16')}
                  disabled={isExporting}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  WAV 16-bit
                </Button>

                <Button
                  onClick={() => exportFinal('flac')}
                  disabled={isExporting}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  FLAC
                </Button>
              </div>

              {exportUrl && (
                <div className="space-y-2">
                  <Badge variant="default" className="w-full justify-center">
                    書き出し完了
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(exportUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    ダウンロード
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• MP3/WAV/FLAC対応</p>
                <p>• LUFS: -14.0</p>
                <p>• 10件/日まで無料</p>
                <p>• クレジット消費なし</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}