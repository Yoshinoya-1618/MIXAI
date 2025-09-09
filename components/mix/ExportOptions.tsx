'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Download, FileAudio, Music, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Props {
  jobId: string
  planCode: string
  onExport: (format: string, quality: string) => Promise<void>
  disabled?: boolean
}

export default function ExportOptions({
  jobId,
  planCode,
  onExport,
  disabled = false
}: Props) {
  const [format, setFormat] = useState('wav')
  const [quality, setQuality] = useState('high')
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const getAvailableFormats = () => {
    switch (planCode) {
      case 'creator':
      case 'freetrial':
        return ['wav', 'flac', 'mp3', 'aac']
      case 'standard':
        return ['wav', 'mp3']
      case 'lite':
      case 'prepaid':
      default:
        return ['mp3']
    }
  }

  const getAvailableQualities = () => {
    switch (planCode) {
      case 'creator':
      case 'freetrial':
        return [
          { value: 'ultra', label: '最高品質 (48kHz/32bit)', icon: Sparkles },
          { value: 'high', label: '高品質 (48kHz/24bit)', icon: Music },
          { value: 'standard', label: '標準 (44.1kHz/16bit)', icon: FileAudio }
        ]
      case 'standard':
        return [
          { value: 'high', label: '高品質 (48kHz/24bit)', icon: Music },
          { value: 'standard', label: '標準 (44.1kHz/16bit)', icon: FileAudio }
        ]
      default:
        return [
          { value: 'standard', label: '標準 (44.1kHz/16bit)', icon: FileAudio }
        ]
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(format, quality)
      toast({
        title: 'エクスポート開始',
        description: 'ファイルの準備が完了したらダウンロードが開始されます'
      })
    } catch (error) {
      toast({
        title: 'エクスポート失敗',
        description: 'エクスポートに失敗しました。もう一度お試しください。',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const availableFormats = getAvailableFormats()
  const availableQualities = getAvailableQualities()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          エクスポート設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* フォーマット選択 */}
        <div className="space-y-3">
          <Label>ファイル形式</Label>
          <RadioGroup value={format} onValueChange={setFormat} disabled={disabled}>
            {availableFormats.map((fmt) => (
              <div key={fmt} className="flex items-center space-x-2">
                <RadioGroupItem value={fmt} id={fmt} />
                <Label htmlFor={fmt} className="cursor-pointer">
                  {fmt.toUpperCase()}
                  {fmt === 'wav' && ' (非圧縮)'}
                  {fmt === 'flac' && ' (可逆圧縮)'}
                  {fmt === 'mp3' && ' (圧縮)'}
                  {fmt === 'aac' && ' (高効率圧縮)'}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {availableFormats.length === 1 && (
            <p className="text-sm text-gray-500">
              他の形式は上位プランで利用可能です
            </p>
          )}
        </div>

        {/* 品質選択 */}
        <div className="space-y-3">
          <Label>出力品質</Label>
          <RadioGroup value={quality} onValueChange={setQuality} disabled={disabled}>
            {availableQualities.map((q) => (
              <div key={q.value} className="flex items-center space-x-2">
                <RadioGroupItem value={q.value} id={q.value} />
                <Label htmlFor={q.value} className="cursor-pointer flex items-center gap-2">
                  <q.icon className="w-4 h-4" />
                  {q.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* ファイルサイズ目安 */}
        <div className="p-3 bg-gray-50 rounded-lg space-y-1">
          <p className="text-sm font-medium text-gray-700">ファイルサイズ目安</p>
          <p className="text-xs text-gray-600">
            {format === 'wav' && '約10MB/分'}
            {format === 'flac' && '約5-7MB/分'}
            {format === 'mp3' && '約1-2MB/分'}
            {format === 'aac' && '約1MB/分'}
          </p>
        </div>

        {/* エクスポートボタン */}
        <Button
          className="w-full"
          onClick={handleExport}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              エクスポート中...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </>
          )}
        </Button>

        {/* 保存期間の注意 */}
        <div className="text-xs text-gray-500 text-center">
          ファイルは
          {planCode === 'creator' && '30日間'}
          {planCode === 'standard' && '15日間'}
          {(planCode === 'lite' || planCode === 'prepaid' || planCode === 'freetrial') && '7日間'}
          保存されます
        </div>
      </CardContent>
    </Card>
  )
}