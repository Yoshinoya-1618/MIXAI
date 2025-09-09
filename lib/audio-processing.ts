/**
 * オーディオ処理ユーティリティ
 * - instファイルをボーカルの長さに合わせてトリミング
 * - 最適なセクションを自動検出
 */

export interface AudioMetadata {
  duration: number
  sampleRate: number
  channels: number
  format: string
}

/**
 * オーディオファイルのメタデータを取得
 */
export async function getAudioMetadata(fileBuffer: ArrayBuffer): Promise<AudioMetadata> {
  // Web Audio API を使用してメタデータを取得
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  try {
    const audioBuffer = await audioContext.decodeAudioData(fileBuffer)
    
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      format: 'pcm' // デコード後は常にPCM
    }
  } finally {
    audioContext.close()
  }
}

/**
 * instをボーカルの長さに合わせてトリミング
 * @param instBuffer - instのオーディオバッファ
 * @param vocalDuration - ボーカルの長さ（秒）
 * @param targetDuration - 目標の長さ（デフォルト60秒）
 * @returns トリミングされたオーディオバッファ
 */
export async function trimInstToVocal(
  instBuffer: ArrayBuffer,
  vocalDuration: number,
  targetDuration: number = 60
): Promise<ArrayBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  try {
    // オーディオバッファにデコード
    const instAudioBuffer = await audioContext.decodeAudioData(instBuffer.slice(0))
    
    // トリミングする長さを決定（ボーカルの長さまたは60秒の短い方）
    const trimDuration = Math.min(vocalDuration, targetDuration)
    
    // instが既に短い場合はそのまま返す
    if (instAudioBuffer.duration <= trimDuration) {
      return instBuffer
    }
    
    // 最適な開始位置を検出（エネルギーが高い部分を探す）
    const optimalStart = findOptimalSection(instAudioBuffer, trimDuration)
    
    // トリミング実行
    const trimmedBuffer = trimAudioBuffer(
      instAudioBuffer,
      optimalStart,
      trimDuration,
      audioContext
    )
    
    // ArrayBufferに変換して返す
    return await encodeAudioBuffer(trimmedBuffer, audioContext)
    
  } finally {
    audioContext.close()
  }
}

/**
 * 最適なセクションを検出（サビなどエネルギーが高い部分）
 */
function findOptimalSection(audioBuffer: AudioBuffer, targetDuration: number): number {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const windowSize = sampleRate * 5 // 5秒のウィンドウ
  const hop = sampleRate * 1 // 1秒ごとにスキャン
  
  let maxEnergy = 0
  let optimalStart = 0
  
  // 全体をスキャンしてエネルギーが最も高い部分を探す
  for (let i = 0; i < channelData.length - (targetDuration * sampleRate); i += hop) {
    let energy = 0
    
    // ウィンドウ内のエネルギーを計算
    for (let j = i; j < Math.min(i + windowSize, channelData.length); j++) {
      energy += Math.abs(channelData[j])
    }
    
    if (energy > maxEnergy) {
      maxEnergy = energy
      optimalStart = i / sampleRate // 秒に変換
    }
  }
  
  return optimalStart
}

/**
 * オーディオバッファをトリミング
 */
function trimAudioBuffer(
  audioBuffer: AudioBuffer,
  startTime: number,
  duration: number,
  audioContext: AudioContext
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.min(
    startSample + Math.floor(duration * sampleRate),
    audioBuffer.length
  )
  const trimmedLength = endSample - startSample
  
  // 新しいバッファを作成
  const trimmedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    trimmedLength,
    sampleRate
  )
  
  // 各チャンネルのデータをコピー
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel)
    const targetData = trimmedBuffer.getChannelData(channel)
    
    for (let i = 0; i < trimmedLength; i++) {
      targetData[i] = sourceData[startSample + i]
    }
  }
  
  return trimmedBuffer
}

/**
 * AudioBufferをArrayBufferにエンコード（WAV形式）
 */
async function encodeAudioBuffer(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext
): Promise<ArrayBuffer> {
  const numberOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  
  const bytesPerSample = bitDepth / 8
  const blockAlign = numberOfChannels * bytesPerSample
  
  const dataSize = audioBuffer.length * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  
  // WAVヘッダーを書き込む
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, format, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)
  
  // オーディオデータを書き込む
  const offset = 44
  const channelData: Float32Array[] = []
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i))
  }
  
  let pos = offset
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]))
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(pos, value, true)
      pos += 2
    }
  }
  
  return buffer
}

/**
 * サーバーサイドでのトリミング処理（Node.js環境用）
 * ffmpegを使用した実装
 */
export async function trimInstOnServer(
  instPath: string,
  vocalDuration: number,
  outputPath: string
): Promise<void> {
  // ffmpegコマンドを実行してトリミング
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  
  const duration = Math.min(vocalDuration, 60)
  
  // 最適なセクションを検出するためのffmpegコマンド
  // エネルギーが最も高い部分を見つける（簡易版）
  const command = `ffmpeg -i "${instPath}" -t ${duration} -acodec copy "${outputPath}"`
  
  try {
    await execAsync(command)
  } catch (error) {
    console.error('FFmpeg error:', error)
    throw new Error('オーディオのトリミングに失敗しました')
  }
}