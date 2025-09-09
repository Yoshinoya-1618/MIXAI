/**
 * 音声解析ユーティリティ
 * 実際の音声ファイルから波形データを生成し、リアルタイム処理状況を管理
 */

export interface AudioAnalysisResult {
  waveform: number[]
  duration: number
  sampleRate: number
  channels: number
  peaks: number[]
  rms: number
  format: string
}

export interface ProcessingStatus {
  stage: 'uploading' | 'analyzing' | 'processing' | 'mixing' | 'exporting' | 'completed' | 'error'
  progress: number
  message: string
  estimatedTimeRemaining?: number
}

// 音声ファイルを解析して波形データを生成
export async function analyzeAudioFile(file: File, barsCount: number = 800): Promise<AudioAnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const waveform = generateWaveformFromBuffer(audioBuffer, barsCount)
        const peaks = findPeaks(audioBuffer)
        const rms = calculateRMS(audioBuffer)
        
        resolve({
          waveform,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          peaks,
          rms,
          format: file.type
        })
        
        audioContext.close()
      } catch (error) {
        reject(new Error(`音声解析エラー: ${error instanceof Error ? error.message : String(error)}`))
      }
    }
    
    reader.onerror = () => reject(new Error('ファイル読み込みエラー'))
    reader.readAsArrayBuffer(file)
  })
}

// AudioBufferから波形データを生成
function generateWaveformFromBuffer(audioBuffer: AudioBuffer, barsCount: number): number[] {
  const length = audioBuffer.length
  const segmentSize = length / barsCount
  const waveform: number[] = []
  
  const channelData: Float32Array[] = []
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel))
  }
  
  for (let i = 0; i < barsCount; i++) {
    const start = Math.floor(i * segmentSize)
    const end = Math.min(length, Math.floor((i + 1) * segmentSize))
    
    let sumSquares = 0
    let sampleCount = 0
    
    for (let channel = 0; channel < channelData.length; channel++) {
      const data = channelData[channel]
      for (let j = start; j < end; j++) {
        sumSquares += data[j] * data[j]
        sampleCount++
      }
    }
    
    const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount))
    waveform.push(Math.min(1, rms * 3))
  }
  
  return waveform
}

// ピーク検出
function findPeaks(audioBuffer: AudioBuffer): number[] {
  const channelData = audioBuffer.getChannelData(0)
  const peaks: number[] = []
  const windowSize = 1024
  
  for (let i = 0; i < channelData.length; i += windowSize) {
    let maxValue = 0
    for (let j = i; j < Math.min(i + windowSize, channelData.length); j++) {
      maxValue = Math.max(maxValue, Math.abs(channelData[j]))
    }
    peaks.push(maxValue)
  }
  
  return peaks
}

// RMS計算
function calculateRMS(audioBuffer: AudioBuffer): number {
  let sumSquares = 0
  let sampleCount = 0
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) {
      sumSquares += data[i] * data[i]
      sampleCount++
    }
  }
  
  return Math.sqrt(sumSquares / sampleCount)
}

// リアルタイム処理状況管理クラス
export class ProcessingStatusManager {
  private listeners: ((status: ProcessingStatus) => void)[] = []
  private currentStatus: ProcessingStatus = {
    stage: 'uploading',
    progress: 0,
    message: '準備中...'
  }
  
  subscribe(listener: (status: ProcessingStatus) => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
  
  updateStatus(status: Partial<ProcessingStatus>) {
    this.currentStatus = { ...this.currentStatus, ...status }
    this.notifyListeners()
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentStatus))
  }
  
  getCurrentStatus(): ProcessingStatus {
    return { ...this.currentStatus }
  }
  
  // 段階的な処理進行をシミュレート
  async simulateProcessing(jobId: string) {
    const stages = [
      { stage: 'uploading', message: 'ファイルをアップロード中...', duration: 2000 },
      { stage: 'analyzing', message: '音声を解析中...', duration: 3000 },
      { stage: 'processing', message: 'AI処理中...', duration: 8000 },
      { stage: 'mixing', message: 'ミキシング中...', duration: 4000 },
      { stage: 'exporting', message: 'エクスポート中...', duration: 2000 },
      { stage: 'completed', message: '処理完了！', duration: 0 }
    ] as const
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      const startTime = Date.now()
      
      this.updateStatus({
        stage: stage.stage,
        message: stage.message,
        progress: (i / (stages.length - 1)) * 100,
        estimatedTimeRemaining: stages.slice(i + 1).reduce((sum, s) => sum + s.duration, 0)
      })
      
      if (stage.duration > 0) {
        // 段階内での進捗更新
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime
          const stageProgress = Math.min(1, elapsed / stage.duration)
          const totalProgress = ((i + stageProgress) / (stages.length - 1)) * 100
          
          this.updateStatus({
            progress: totalProgress,
            estimatedTimeRemaining: Math.max(0, stage.duration - elapsed + 
              stages.slice(i + 1).reduce((sum, s) => sum + s.duration, 0))
          })
        }, 100)
        
        await new Promise(resolve => setTimeout(resolve, stage.duration))
        clearInterval(interval)
      }
    }
  }
}

// 音声フォーマット検証
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const validTypes = [
    'audio/mpeg', 'audio/mp3',
    'audio/wav', 'audio/wave',
    'audio/aac', 'audio/m4a',
    'audio/ogg', 'audio/flac'
  ]
  
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `サポートされていないファイル形式です。対応形式: ${validTypes.join(', ')}` 
    }
  }
  
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `ファイルサイズが大きすぎます。最大100MBまで対応しています。` 
    }
  }
  
  return { valid: true }
}

// デモ用の擬似音声データ生成
export function generateDemoWaveform(duration: number = 60, barsCount: number = 800): number[] {
  const waveform: number[] = []
  
  for (let i = 0; i < barsCount; i++) {
    const time = (i / barsCount) * duration
    
    // 複数の周波数成分を組み合わせてリアルな波形を生成
    const bass = Math.sin(time * 2 * Math.PI * 0.1) * 0.3
    const mid = Math.sin(time * 2 * Math.PI * 0.3) * 0.4
    const high = Math.sin(time * 2 * Math.PI * 0.8) * 0.2
    const noise = (Math.random() - 0.5) * 0.1
    
    const amplitude = Math.abs(bass + mid + high + noise)
    waveform.push(Math.min(1, amplitude))
  }
  
  return waveform
}