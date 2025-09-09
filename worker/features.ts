// worker/features.ts
// 音声特徴量抽出ワーカー（CPU最小構成）

// @ts-ignore - Mock imports to avoid heavy dependencies in build
let AudioContext: any
let tf: any

try {
  // @ts-ignore
  AudioContext = require('web-audio-api').AudioContext
  // @ts-ignore
  tf = require('@tensorflow/tfjs-node')
} catch {
  // Mock implementations will be used
  AudioContext = class {} as any
  tf = {} as any
}

export interface AudioFeatures {
  spectral: {
    centroid: number[]      // スペクトル重心
    rolloff: number[]       // スペクトルロールオフ
    flux: number[]          // スペクトルフラックス
    contrast: number[]      // スペクトルコントラスト（7バンド）
    bandwidth: number[]     // スペクトル帯域幅
  }
  temporal: {
    zcr: number[]          // ゼロ交差率
    rms: number[]          // RMSエネルギー
    tempo: number          // 推定テンポ
    beat_strength: number  // ビート強度
  }
  mfcc: number[][]         // MFCC係数（13次元）
  chroma: number[][]       // クロマベクトル（12次元）
  loudness: {
    lufs_i: number         // 統合ラウドネス
    lufs_s: number         // 短期ラウドネス
    lufs_m: number         // 瞬間ラウドネス
    lra: number            // ラウドネスレンジ
    true_peak: number      // トゥルーピーク
  }
  stats: {
    duration: number       // 音声長（秒）
    sample_rate: number    // サンプリングレート
    channels: number       // チャンネル数
    bit_depth: number      // ビット深度
  }
}

/**
 * 音声バッファから特徴量を抽出
 */
export async function extractFeatures(
  audioBuffer: ArrayBuffer,
  clipKind: 'inst' | 'vocal' | 'mix'
): Promise<{ vec: number[]; stats: any }> {
  
  const context = new AudioContext()
  const audioData = await decodeAudioData(context, audioBuffer)
  
  // モノラルに変換
  const monoData = mixToMono(audioData)
  
  // 特徴量抽出
  const features = await computeFeatures(monoData, audioData.sampleRate)
  
  // 特徴量ベクトル化（~160次元）
  const vec = flattenFeatures(features, clipKind)
  
  // 統計情報
  const stats = {
    lufs_i: features.loudness.lufs_i,
    lra: features.loudness.lra,
    true_peak: features.loudness.true_peak,
    tempo: features.temporal.tempo,
    duration: features.stats.duration,
    sample_rate: features.stats.sample_rate
  }
  
  return { vec, stats }
}

/**
 * オーディオデータをデコード
 */
async function decodeAudioData(
  context: AudioContext,
  audioBuffer: ArrayBuffer
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    context.decodeAudioData(
      audioBuffer,
      (decoded: any) => resolve(decoded),
      (error: any) => reject(error)
    )
  })
}

/**
 * ステレオをモノラルに変換
 */
function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  const length = audioBuffer.length
  const mono = new Float32Array(length)
  
  if (audioBuffer.numberOfChannels === 1) {
    audioBuffer.copyFromChannel(mono, 0)
  } else {
    const left = new Float32Array(length)
    const right = new Float32Array(length)
    audioBuffer.copyFromChannel(left, 0)
    audioBuffer.copyFromChannel(right, 1)
    
    for (let i = 0; i < length; i++) {
      mono[i] = (left[i] + right[i]) / 2
    }
  }
  
  return mono
}

/**
 * 特徴量計算のメイン処理
 */
async function computeFeatures(
  audioData: Float32Array,
  sampleRate: number
): Promise<AudioFeatures> {
  
  // フレーム分割（2048サンプル、50%オーバーラップ）
  const frameSize = 2048
  const hopSize = 1024
  const frames = getFrames(audioData, frameSize, hopSize)
  
  // スペクトル特徴量
  const spectral = computeSpectralFeatures(frames, sampleRate)
  
  // 時間領域特徴量
  const temporal = computeTemporalFeatures(audioData, sampleRate)
  
  // MFCC
  const mfcc = computeMFCC(frames, sampleRate)
  
  // クロマベクトル
  const chroma = computeChroma(frames, sampleRate)
  
  // ラウドネス（簡易版）
  const loudness = computeLoudness(audioData, sampleRate)
  
  // 統計情報
  const stats = {
    duration: audioData.length / sampleRate,
    sample_rate: sampleRate,
    channels: 1, // モノラル化済み
    bit_depth: 16 // デフォルト
  }
  
  return {
    spectral,
    temporal,
    mfcc,
    chroma,
    loudness,
    stats
  }
}

/**
 * フレーム分割
 */
function getFrames(
  audioData: Float32Array,
  frameSize: number,
  hopSize: number
): Float32Array[] {
  const frames: Float32Array[] = []
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize) + 1
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize
    const end = start + frameSize
    if (end <= audioData.length) {
      frames.push(audioData.slice(start, end))
    }
  }
  
  return frames
}

/**
 * スペクトル特徴量の計算
 */
function computeSpectralFeatures(
  frames: Float32Array[],
  sampleRate: number
): AudioFeatures['spectral'] {
  
  const centroid: number[] = []
  const rolloff: number[] = []
  const flux: number[] = []
  const contrast: number[] = []
  const bandwidth: number[] = []
  
  let prevSpectrum: Float32Array | null = null
  
  for (const frame of frames) {
    // FFT
    const spectrum = computeFFT(frame)
    const freqs = getFrequencyBins(spectrum.length, sampleRate)
    
    // スペクトル重心
    centroid.push(computeSpectralCentroid(spectrum, freqs))
    
    // スペクトルロールオフ
    rolloff.push(computeSpectralRolloff(spectrum, freqs, 0.85))
    
    // スペクトルフラックス
    if (prevSpectrum) {
      flux.push(computeSpectralFlux(spectrum, prevSpectrum))
    }
    
    // スペクトル帯域幅
    bandwidth.push(computeSpectralBandwidth(spectrum, freqs))
    
    prevSpectrum = spectrum
  }
  
  // スペクトルコントラスト（7バンド平均）
  const contrastBands = computeSpectralContrast(frames, sampleRate)
  
  return {
    centroid: aggregateFeatures(centroid),
    rolloff: aggregateFeatures(rolloff),
    flux: aggregateFeatures(flux),
    contrast: contrastBands,
    bandwidth: aggregateFeatures(bandwidth)
  }
}

/**
 * FFT計算（簡易版）
 */
function computeFFT(frame: Float32Array): Float32Array {
  // ハミング窓を適用
  const windowed = applyHammingWindow(frame)
  
  // TensorFlow.jsを使用したFFT
  const complexTensor = tf.signal.rfft(tf.tensor1d(windowed))
  const magnitude = tf.abs(complexTensor)
  const result = magnitude.arraySync() as number[]
  
  // テンソルのクリーンアップ
  complexTensor.dispose()
  magnitude.dispose()
  
  return new Float32Array(result)
}

/**
 * ハミング窓
 */
function applyHammingWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length)
  const N = frame.length
  
  for (let i = 0; i < N; i++) {
    const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1))
    windowed[i] = frame[i] * window
  }
  
  return windowed
}

/**
 * 周波数ビンの計算
 */
function getFrequencyBins(spectrumLength: number, sampleRate: number): Float32Array {
  const freqs = new Float32Array(spectrumLength)
  const binWidth = sampleRate / (2 * spectrumLength)
  
  for (let i = 0; i < spectrumLength; i++) {
    freqs[i] = i * binWidth
  }
  
  return freqs
}

/**
 * スペクトル重心
 */
function computeSpectralCentroid(
  spectrum: Float32Array,
  freqs: Float32Array
): number {
  let weightedSum = 0
  let magnitudeSum = 0
  
  for (let i = 0; i < spectrum.length; i++) {
    weightedSum += spectrum[i] * freqs[i]
    magnitudeSum += spectrum[i]
  }
  
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
}

/**
 * スペクトルロールオフ
 */
function computeSpectralRolloff(
  spectrum: Float32Array,
  freqs: Float32Array,
  threshold: number
): number {
  const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0)
  const targetEnergy = totalEnergy * threshold
  
  let cumulativeEnergy = 0
  for (let i = 0; i < spectrum.length; i++) {
    cumulativeEnergy += spectrum[i]
    if (cumulativeEnergy >= targetEnergy) {
      return freqs[i]
    }
  }
  
  return freqs[freqs.length - 1]
}

/**
 * スペクトルフラックス
 */
function computeSpectralFlux(
  spectrum: Float32Array,
  prevSpectrum: Float32Array
): number {
  let flux = 0
  const minLength = Math.min(spectrum.length, prevSpectrum.length)
  
  for (let i = 0; i < minLength; i++) {
    const diff = spectrum[i] - prevSpectrum[i]
    if (diff > 0) {
      flux += diff * diff
    }
  }
  
  return Math.sqrt(flux)
}

/**
 * スペクトル帯域幅
 */
function computeSpectralBandwidth(
  spectrum: Float32Array,
  freqs: Float32Array
): number {
  const centroid = computeSpectralCentroid(spectrum, freqs)
  let weightedVariance = 0
  let magnitudeSum = 0
  
  for (let i = 0; i < spectrum.length; i++) {
    const deviation = freqs[i] - centroid
    weightedVariance += spectrum[i] * deviation * deviation
    magnitudeSum += spectrum[i]
  }
  
  return magnitudeSum > 0 ? Math.sqrt(weightedVariance / magnitudeSum) : 0
}

/**
 * スペクトルコントラスト
 */
function computeSpectralContrast(
  frames: Float32Array[],
  sampleRate: number
): number[] {
  // 7つの周波数バンドでコントラストを計算
  const bands = [
    [0, 100],
    [100, 200],
    [200, 400],
    [400, 800],
    [800, 1600],
    [1600, 3200],
    [3200, sampleRate / 2]
  ]
  
  const contrasts: number[] = []
  
  for (const [lowFreq, highFreq] of bands) {
    let bandContrast = 0
    let frameCount = 0
    
    for (const frame of frames) {
      const spectrum = computeFFT(frame)
      const freqs = getFrequencyBins(spectrum.length, sampleRate)
      
      // バンド内のスペクトルを抽出
      const bandSpectrum: number[] = []
      for (let i = 0; i < spectrum.length; i++) {
        if (freqs[i] >= lowFreq && freqs[i] < highFreq) {
          bandSpectrum.push(spectrum[i])
        }
      }
      
      if (bandSpectrum.length > 0) {
        const sorted = bandSpectrum.sort((a, b) => a - b)
        const peak = sorted[sorted.length - 1]
        const valley = sorted[0]
        bandContrast += Math.log(peak / (valley + 1e-10))
        frameCount++
      }
    }
    
    contrasts.push(frameCount > 0 ? bandContrast / frameCount : 0)
  }
  
  return contrasts
}

/**
 * 時間領域特徴量の計算
 */
function computeTemporalFeatures(
  audioData: Float32Array,
  sampleRate: number
): AudioFeatures['temporal'] {
  
  // ゼロ交差率
  const zcr = computeZCR(audioData)
  
  // RMSエネルギー
  const rms = computeRMS(audioData)
  
  // テンポ推定（簡易版）
  const { tempo, beatStrength } = estimateTempo(audioData, sampleRate)
  
  return {
    zcr: aggregateFeatures(zcr),
    rms: aggregateFeatures(rms),
    tempo,
    beat_strength: beatStrength
  }
}

/**
 * ゼロ交差率
 */
function computeZCR(audioData: Float32Array): number[] {
  const frameSize = 2048
  const hopSize = 1024
  const zcr: number[] = []
  
  for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
    let crossings = 0
    for (let j = i + 1; j < i + frameSize; j++) {
      if (audioData[j] * audioData[j - 1] < 0) {
        crossings++
      }
    }
    zcr.push(crossings / frameSize)
  }
  
  return zcr
}

/**
 * RMSエネルギー
 */
function computeRMS(audioData: Float32Array): number[] {
  const frameSize = 2048
  const hopSize = 1024
  const rms: number[] = []
  
  for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
    let sum = 0
    for (let j = i; j < i + frameSize; j++) {
      sum += audioData[j] * audioData[j]
    }
    rms.push(Math.sqrt(sum / frameSize))
  }
  
  return rms
}

/**
 * テンポ推定（簡易版）
 */
function estimateTempo(
  audioData: Float32Array,
  sampleRate: number
): { tempo: number; beatStrength: number } {
  // オンセット検出
  const onsets = detectOnsets(audioData, sampleRate)
  
  if (onsets.length < 2) {
    return { tempo: 120, beatStrength: 0 }
  }
  
  // IOI（Inter-Onset Interval）の計算
  const iois: number[] = []
  for (let i = 1; i < onsets.length; i++) {
    iois.push(onsets[i] - onsets[i - 1])
  }
  
  // ヒストグラムによるテンポ推定
  const tempoRange = { min: 60, max: 200 }
  const bestTempo = findBestTempo(iois, sampleRate, tempoRange)
  
  // ビート強度（IOIの規則性）
  const beatStrength = computeBeatStrength(iois)
  
  return { tempo: bestTempo, beatStrength }
}

/**
 * オンセット検出
 */
function detectOnsets(
  audioData: Float32Array,
  sampleRate: number
): number[] {
  const frameSize = 2048
  const hopSize = 512
  const onsets: number[] = []
  
  let prevEnergy = 0
  
  for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
    let energy = 0
    for (let j = i; j < i + frameSize; j++) {
      energy += audioData[j] * audioData[j]
    }
    energy = Math.sqrt(energy / frameSize)
    
    // エネルギーの急激な増加を検出
    if (energy > prevEnergy * 1.5 && energy > 0.01) {
      onsets.push(i / sampleRate)
    }
    
    prevEnergy = energy
  }
  
  return onsets
}

/**
 * 最適なテンポを見つける
 */
function findBestTempo(
  iois: number[],
  sampleRate: number,
  range: { min: number; max: number }
): number {
  const histogram = new Map<number, number>()
  
  for (const ioi of iois) {
    const bpm = 60 / ioi
    if (bpm >= range.min && bpm <= range.max) {
      const rounded = Math.round(bpm)
      histogram.set(rounded, (histogram.get(rounded) || 0) + 1)
    }
  }
  
  let bestTempo = 120
  let maxCount = 0
  
  for (const [tempo, count] of histogram) {
    if (count > maxCount) {
      maxCount = count
      bestTempo = tempo
    }
  }
  
  return bestTempo
}

/**
 * ビート強度の計算
 */
function computeBeatStrength(iois: number[]): number {
  if (iois.length < 2) return 0
  
  const mean = iois.reduce((sum, val) => sum + val, 0) / iois.length
  const variance = iois.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / iois.length
  const cv = Math.sqrt(variance) / mean // 変動係数
  
  // 変動係数が小さいほど規則的
  return Math.max(0, 1 - cv)
}

/**
 * MFCC計算
 */
function computeMFCC(
  frames: Float32Array[],
  sampleRate: number
): number[][] {
  const numCoeffs = 13
  const mfcc: number[][] = []
  
  for (const frame of frames) {
    const spectrum = computeFFT(frame)
    const melSpectrum = toMelSpectrum(spectrum, sampleRate)
    const logMelSpectrum = melSpectrum.map(val => Math.log(val + 1e-10))
    const coeffs = dct(logMelSpectrum, numCoeffs)
    mfcc.push(coeffs)
  }
  
  // フレーム平均
  const avgMFCC: number[][] = []
  for (let i = 0; i < numCoeffs; i++) {
    const coeffValues = mfcc.map(frame => frame[i])
    avgMFCC.push(aggregateFeatures(coeffValues))
  }
  
  return avgMFCC
}

/**
 * メルスペクトラムへの変換
 */
function toMelSpectrum(
  spectrum: Float32Array,
  sampleRate: number,
  numMelBands: number = 40
): Float32Array {
  const melSpectrum = new Float32Array(numMelBands)
  const maxFreq = sampleRate / 2
  
  for (let i = 0; i < numMelBands; i++) {
    const melLow = 2595 * Math.log10(1 + (i * maxFreq / numMelBands) / 700)
    const melHigh = 2595 * Math.log10(1 + ((i + 1) * maxFreq / numMelBands) / 700)
    
    const freqLow = 700 * (Math.pow(10, melLow / 2595) - 1)
    const freqHigh = 700 * (Math.pow(10, melHigh / 2595) - 1)
    
    let sum = 0
    for (let j = 0; j < spectrum.length; j++) {
      const freq = j * maxFreq / spectrum.length
      if (freq >= freqLow && freq < freqHigh) {
        sum += spectrum[j]
      }
    }
    
    melSpectrum[i] = sum
  }
  
  return melSpectrum
}

/**
 * 離散コサイン変換（DCT）
 */
function dct(input: Float32Array, numCoeffs: number): number[] {
  const N = input.length
  const coeffs: number[] = []
  
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N)
    }
    coeffs.push(sum * Math.sqrt(2 / N))
  }
  
  return coeffs
}

/**
 * クロマベクトル計算
 */
function computeChroma(
  frames: Float32Array[],
  sampleRate: number
): number[][] {
  const chromaBins = 12
  const chroma: number[][] = []
  
  for (const frame of frames) {
    const spectrum = computeFFT(frame)
    const chromaVector = new Float32Array(chromaBins)
    
    for (let i = 0; i < spectrum.length; i++) {
      const freq = i * sampleRate / (2 * spectrum.length)
      if (freq > 80 && freq < 4000) { // 音楽的に意味のある周波数範囲
        const pitch = 12 * Math.log2(freq / 440) + 69
        const chromaBin = Math.round(pitch) % 12
        chromaVector[chromaBin] += spectrum[i]
      }
    }
    
    // 正規化
    const sum = chromaVector.reduce((acc, val) => acc + val, 0)
    if (sum > 0) {
      for (let i = 0; i < chromaBins; i++) {
        chromaVector[i] /= sum
      }
    }
    
    chroma.push(Array.from(chromaVector))
  }
  
  // フレーム平均
  const avgChroma: number[][] = []
  for (let i = 0; i < chromaBins; i++) {
    const chromaValues = chroma.map(frame => frame[i])
    avgChroma.push(aggregateFeatures(chromaValues))
  }
  
  return avgChroma
}

/**
 * ラウドネス計算（簡易版）
 */
function computeLoudness(
  audioData: Float32Array,
  sampleRate: number
): AudioFeatures['loudness'] {
  // K-weighted filterの簡易実装
  const filtered = applyKWeighting(audioData, sampleRate)
  
  // ゲート付き測定
  const gatedData = applyGating(filtered, -70) // -70 LUFS gate
  
  // 各ラウドネス値の計算
  const lufs_i = computeLUFS(gatedData, sampleRate, 'integrated')
  const lufs_s = computeLUFS(gatedData, sampleRate, 'short')
  const lufs_m = computeLUFS(gatedData, sampleRate, 'momentary')
  
  // LRA (Loudness Range)
  const lra = computeLRA(gatedData, sampleRate)
  
  // True Peak
  const truePeak = computeTruePeak(audioData)
  
  return {
    lufs_i,
    lufs_s,
    lufs_m,
    lra,
    true_peak: truePeak
  }
}

/**
 * K-weighting フィルタ（簡易版）
 */
function applyKWeighting(
  audioData: Float32Array,
  sampleRate: number
): Float32Array {
  // 簡易的な高域ブースト
  const filtered = new Float32Array(audioData.length)
  
  for (let i = 1; i < audioData.length - 1; i++) {
    // 簡易ハイシェルフフィルタ
    filtered[i] = audioData[i] * 1.0 + 
                  (audioData[i] - audioData[i - 1]) * 0.5
  }
  
  return filtered
}

/**
 * ゲーティング
 */
function applyGating(
  audioData: Float32Array,
  threshold: number
): Float32Array {
  const blockSize = 400 // 400ms blocks
  const gated: number[] = []
  
  for (let i = 0; i < audioData.length; i += blockSize) {
    const block = audioData.slice(i, Math.min(i + blockSize, audioData.length))
    const blockLoudness = 10 * Math.log10(
      block.reduce((sum, val) => sum + val * val, 0) / block.length + 1e-10
    )
    
    if (blockLoudness > threshold) {
      gated.push(...block)
    }
  }
  
  return new Float32Array(gated)
}

/**
 * LUFS計算
 */
function computeLUFS(
  audioData: Float32Array,
  sampleRate: number,
  type: 'integrated' | 'short' | 'momentary'
): number {
  const windowSize = type === 'integrated' ? audioData.length :
                    type === 'short' ? sampleRate * 3 : // 3秒
                    sampleRate * 0.4 // 400ms
  
  let sum = 0
  let count = 0
  
  for (let i = 0; i < audioData.length - windowSize; i += windowSize / 4) {
    const window = audioData.slice(i, i + windowSize)
    const meanSquare = window.reduce((acc, val) => acc + val * val, 0) / window.length
    sum += meanSquare
    count++
  }
  
  const meanPower = sum / count
  return -0.691 + 10 * Math.log10(meanPower + 1e-10)
}

/**
 * LRA計算
 */
function computeLRA(
  audioData: Float32Array,
  sampleRate: number
): number {
  const windowSize = sampleRate * 3 // 3秒ウィンドウ
  const loudnessValues: number[] = []
  
  for (let i = 0; i < audioData.length - windowSize; i += windowSize / 4) {
    const window = audioData.slice(i, i + windowSize)
    const loudness = computeLUFS(window, sampleRate, 'short')
    loudnessValues.push(loudness)
  }
  
  loudnessValues.sort((a, b) => a - b)
  const percentile10 = loudnessValues[Math.floor(loudnessValues.length * 0.1)]
  const percentile95 = loudnessValues[Math.floor(loudnessValues.length * 0.95)]
  
  return percentile95 - percentile10
}

/**
 * True Peak計算
 */
function computeTruePeak(audioData: Float32Array): number {
  // 4倍オーバーサンプリング（簡易版）
  let maxPeak = 0
  
  for (let i = 0; i < audioData.length - 1; i++) {
    const sample = Math.abs(audioData[i])
    // 線形補間による中間サンプル推定
    const nextSample = Math.abs(audioData[i + 1])
    const interpolated = (sample + nextSample) / 2
    
    maxPeak = Math.max(maxPeak, sample, interpolated)
  }
  
  return 20 * Math.log10(maxPeak + 1e-10)
}

/**
 * 特徴量の集約（平均、標準偏差、最大、最小）
 */
function aggregateFeatures(values: number[]): number[] {
  if (values.length === 0) return [0, 0, 0, 0]
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)
  const max = Math.max(...values)
  const min = Math.min(...values)
  
  return [mean, std, max, min]
}

/**
 * 特徴量ベクトルのフラット化
 */
function flattenFeatures(
  features: AudioFeatures,
  clipKind: 'inst' | 'vocal' | 'mix'
): number[] {
  const vec: number[] = []
  
  // スペクトル特徴量（4次元 × 5種類 = 20次元）
  vec.push(...features.spectral.centroid)
  vec.push(...features.spectral.rolloff)
  vec.push(...features.spectral.flux)
  vec.push(...features.spectral.bandwidth)
  
  // スペクトルコントラスト（7次元）
  vec.push(...features.spectral.contrast)
  
  // 時間領域特徴量（4次元 × 2種類 + 2 = 10次元）
  vec.push(...features.temporal.zcr)
  vec.push(...features.temporal.rms)
  vec.push(features.temporal.tempo / 200) // 正規化
  vec.push(features.temporal.beat_strength)
  
  // MFCC（13次元 × 4統計 = 52次元）
  for (const coeffs of features.mfcc) {
    vec.push(...coeffs)
  }
  
  // クロマ（12次元 × 4統計 = 48次元）
  for (const chroma of features.chroma) {
    vec.push(...chroma)
  }
  
  // ラウドネス（5次元）
  vec.push(features.loudness.lufs_i / -60) // 正規化
  vec.push(features.loudness.lufs_s / -60)
  vec.push(features.loudness.lufs_m / -60)
  vec.push(features.loudness.lra / 30)
  vec.push(features.loudness.true_peak / 6)
  
  // クリップ種別エンコーディング（3次元）
  vec.push(clipKind === 'inst' ? 1 : 0)
  vec.push(clipKind === 'vocal' ? 1 : 0)
  vec.push(clipKind === 'mix' ? 1 : 0)
  
  // 合計: ~160次元
  return vec
}

/**
 * 特徴量をSupabaseに保存
 */
export async function saveFeaturesToDB(
  jobId: string,
  userId: string,
  clipKind: 'inst' | 'vocal' | 'mix',
  features: { vec: number[]; stats: any },
  supabase: any
): Promise<void> {
  const { error } = await supabase
    .from('features_store')
    .insert({
      job_id: jobId,
      user_id: userId,
      clip_kind: clipKind,
      n_dim: features.vec.length,
      vec: features.vec,
      stats: features.stats
    })
  
  if (error) {
    console.error('Failed to save features:', error)
    throw error
  }
}