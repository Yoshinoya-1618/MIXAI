'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, Download, Volume2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

interface Props {
  audioUrl?: string
  jobId: string
  isProcessing?: boolean
  onRegenerate?: () => void
}

export default function PreviewPlayer({
  audioUrl,
  jobId,
  isProcessing = false,
  onRegenerate
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return
    const newVolume = value[0]
    audioRef.current.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDownload = async () => {
    if (!audioUrl) return
    
    setIsLoading(true)
    try {
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mix_${jobId}.wav`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* プレイヤーコントロール */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="outline"
              onClick={onRegenerate}
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              className="w-16 h-16"
              onClick={togglePlayPause}
              disabled={!audioUrl || isProcessing}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>
            
            <Button
              size="icon"
              variant="outline"
              onClick={handleDownload}
              disabled={!audioUrl || isProcessing || isLoading}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* 進行バー */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              onValueChange={handleSeek}
              max={duration || 100}
              step={0.1}
              disabled={!audioUrl || isProcessing}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* ボリュームコントロール */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-gray-600" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.01}
              disabled={!audioUrl || isProcessing}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-10">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* ステータス */}
          {isProcessing && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="animate-pulse text-blue-600">
                処理中...
              </div>
            </div>
          )}

          {!audioUrl && !isProcessing && (
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                プレビューを生成してください
              </p>
            </div>
          )}
        </div>

        {/* 隠し音声要素 */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            className="hidden"
          />
        )}
      </CardContent>
    </Card>
  )
}