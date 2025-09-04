// app/mix/lite/[jobId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Pause, Download, RotateCcw, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MixParams {
  air: number
  body: number
  punch: number
  width: number
  vocal: number
  fade_in: number
  fade_out: number
  output_gain: number
  genre_target: string
  offset_ms: number
}

interface JobData {
  id: string
  title: string
  status: string
  ai_params: MixParams
  user_params: MixParams
  last_export_params?: MixParams
  metrics: any
}

export default function LiteMixPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const jobId = params.jobId as string

  const [job, setJob] = useState<JobData | null>(null)
  const [currentParams, setCurrentParams] = useState<MixParams | null>(null)
  const [activeMode, setActiveMode] = useState<'AI_BASE' | 'USER_EDIT'>('USER_EDIT')
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
  const handleParamChange = (param: keyof MixParams, value: number) => {
    if (!currentParams) return

    setCurrentParams(prev => ({
      ...prev!,
      [param]: value
    }))
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
          ab: activeMode
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
  const exportFinal = async () => {
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
          format: 'mp3', // Liteプランは MP3のみ
          targetLufs: -14
        })
      })

      if (!response.ok) {
        throw new Error('書き出しに失敗しました')
      }

      const data = await response.json()
      setExportUrl(data.fileUrl)
      
      toast({
        title: "書き出し完了",
        description: `MP3ファイルが生成されました（クレジット消費なし）`
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Lite</Badge>
              <h1 className="text-2xl font-bold">{job.title}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              5軸MIX調整 • MP3書き出し • クレジット消費なし
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン調整パネル */}
        <div className="lg:col-span-2">
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
              {/* Air - 高域の華やかさ */}
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  8-12kHz帯域を調整して高域の輝きを追加
                </p>
              </div>

              {/* Body - 中低域の厚み */}
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  200-350Hz帯域を調整して声の厚みを追加
                </p>
              </div>

              {/* Vocal - 中域の明瞭さ */}
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  2-4kHz帯域を調整して歌声の通りを改善
                </p>
              </div>

              {/* Punch - アタック感 */}
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  楽器とのバランスを調整してアタック感を強化
                </p>
              </div>

              {/* Width - ステレオ幅 */}
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  ステレオイメージの広がりを調整
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー - プレビュー・書き出し */}
        <div className="space-y-6">
          {/* プレビュー */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プレビュー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={generatePreview}
                disabled={isGeneratingPreview}
                className="w-full"
              >
                {isGeneratingPreview ? '生成中...' : '30秒プレビュー'}
              </Button>

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

              <div className="text-xs text-muted-foreground">
                <p>• 15-45秒区間の30秒プレビュー</p>
                <p>• A/B比較機能</p>
                <p>• クレジット消費なし</p>
              </div>
            </CardContent>
          </Card>

          {/* 書き出し */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最終書き出し</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>フォーマット:</span>
                  <Badge variant="outline">MP3 320kbps</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>LUFS:</span>
                  <span>-14.0</span>
                </div>
              </div>

              <Button
                onClick={exportFinal}
                disabled={isExporting}
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? '書き出し中...' : 'MP3で書き出し'}
              </Button>

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

              <div className="text-xs text-muted-foreground">
                <p>• フル品質書き出し</p>
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