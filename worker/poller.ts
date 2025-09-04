import { fetchNextProcessingJob, markDone, markFailed } from './db'
import { putObjectService, parseStoragePath, downloadFile } from '../storage/service'
import { resultPrefix } from '../app/api/_lib/paths'
import { processAudio, detectOffset, cleanupTempFiles, getAudioInfo } from './audio'
import { promises as fs } from 'fs'
import path from 'path'

const SLEEP_MS = Number(process.env.WORKER_POLL_MS || 3000)
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
const WORKER_TIMEOUT_MS = Number(process.env.WORKER_TIMEOUT_MS || 300000) // 5分

// エラー分類
type ErrorType = 'temporary' | 'permanent' | 'fatal'

interface WorkerError {
  type: ErrorType
  message: string
  details?: any
  retryable: boolean
}

function classifyError(error: unknown): WorkerError {
  const message = error instanceof Error ? error.message : String(error)
  
  // 一時的なエラー（リトライ可能）
  if (message.includes('ECONNREFUSED') || 
      message.includes('ENOTFOUND') || 
      message.includes('ETIMEDOUT') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection')) {
    return {
      type: 'temporary',
      message: 'ネットワークエラー',
      details: message,
      retryable: true
    }
  }
  
  // ファイル関連の一時的エラー
  if (message.includes('EBUSY') || 
      message.includes('EMFILE') ||
      message.includes('ENFILE')) {
    return {
      type: 'temporary', 
      message: 'ファイルシステムエラー',
      details: message,
      retryable: true
    }
  }
  
  // 永続的エラー（リトライしても解決しない）
  if (message.includes('ENOENT') ||
      message.includes('ファイルが見つかりません') ||
      message.includes('音声情報取得エラー') ||
      message.includes('無効な音声ファイル')) {
    return {
      type: 'permanent',
      message: 'ファイルエラー',
      details: message, 
      retryable: false
    }
  }
  
  // FFmpegエラー
  if (message.includes('ffmpeg') || message.includes('audio processing')) {
    return {
      type: 'permanent',
      message: '音声処理エラー',
      details: message,
      retryable: false
    }
  }
  
  // その他は一時的エラーとして扱う
  return {
    type: 'temporary',
    message: '予期しないエラー',
    details: message,
    retryable: true
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function runOnce(): Promise<boolean> {
  const job = await fetchNextProcessingJob()
  if (!job) return false

  return await processJobWithRetry(job)
}

async function processJobWithRetry(job: any): Promise<boolean> {
  let retryCount = 0
  
  while (retryCount <= MAX_RETRIES) {
    try {
      console.log(`Processing job ${job.id} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)
      
      const startTime = Date.now()
      
      // タイムアウト付きでジョブ処理実行
      const result = await Promise.race([
        processJobInternal(job),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`処理がタイムアウトしました (${WORKER_TIMEOUT_MS}ms)`)), WORKER_TIMEOUT_MS)
        })
      ])
      
      const duration = Date.now() - startTime
      console.log(`Job ${job.id} completed successfully in ${duration}ms`)
      
      return result
      
    } catch (error) {
      const errorInfo = classifyError(error)
      
      console.error(`Job ${job.id} attempt ${retryCount + 1} failed:`, {
        type: errorInfo.type,
        message: errorInfo.message,
        details: errorInfo.details,
        retryable: errorInfo.retryable
      })
      
      // 致命的エラーまたはリトライ不可能なエラーの場合は即座に失敗とする
      if (!errorInfo.retryable || errorInfo.type === 'permanent') {
        await markFailed(job.id, errorInfo.message)
        return true
      }
      
      retryCount++
      
      // 最大リトライ回数に達した場合
      if (retryCount > MAX_RETRIES) {
        await markFailed(job.id, `${errorInfo.message} (${MAX_RETRIES}回のリトライ後に失敗)`)
        return true
      }
      
      // リトライ前の待機
      console.log(`Job ${job.id} retrying in ${RETRY_DELAY_MS}ms...`)
      await sleep(RETRY_DELAY_MS * retryCount) // 指数バックオフ
    }
  }
  
  return true
}

async function processJobInternal(job: any): Promise<boolean> {
  // 1. 入力ファイルの検証
  if (!job.instrumental_path || !job.vocal_path) {
    throw new Error('ファイルパスが未確定です')
  }

  // 2. 一時ディレクトリ準備（プロセスIDとタイムスタンプで衝突回避）
  const tempDir = path.join(process.cwd(), 'temp')
  await fs.mkdir(tempDir, { recursive: true })
  
  const processId = process.pid
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const fileId = `${job.id}_${processId}_${timestamp}_${randomId}`
  
  const instLocal = path.join(tempDir, `inst_${fileId}.wav`)
  const vocalLocal = path.join(tempDir, `vocal_${fileId}.wav`)
  const outputLocal = path.join(tempDir, `output_${fileId}.mp3`)

  let filesToCleanup: string[] = []

  try {
    // 3. ファイルダウンロード（並行実行）
    console.log(`Downloading files for job ${job.id}`)
    const instParts = parseStoragePath(job.instrumental_path)
    const vocalParts = parseStoragePath(job.vocal_path)
    
    await Promise.all([
      downloadFile(instParts.bucket, instParts.key, instLocal),
      downloadFile(vocalParts.bucket, vocalParts.key, vocalLocal)
    ])
    
    filesToCleanup = [instLocal, vocalLocal]

    // 4. ファイル検証
    console.log(`Validating audio files for job ${job.id}`)
    const [instInfo, vocalInfo] = await Promise.all([
      getAudioInfo(instLocal),
      getAudioInfo(vocalLocal)
    ])
    
    if (!instInfo.valid) {
      throw new Error(`無効な伴奏ファイル: ${instInfo.error}`)
    }
    if (!vocalInfo.valid) {
      throw new Error(`無効なボーカルファイル: ${vocalInfo.error}`)
    }
    
    console.log(`Audio files validated - Inst: ${instInfo.duration}s, Vocal: ${vocalInfo.duration}s`)

    // 5. オフセット検出（エラーハンドリング強化）
    console.log(`Detecting offset for job ${job.id}`)
    let offsetMs = 0
    try {
      offsetMs = await detectOffset(instLocal, vocalLocal)
      console.log(`Detected offset: ${offsetMs}ms`)
    } catch (error) {
      console.warn(`Offset detection failed for job ${job.id}, using default (0ms):`, error)
      offsetMs = 0
    }

    // 6. 音声処理実行
    console.log(`Processing audio for job ${job.id}`)
    const processingResult = await processAudio({
      instrumentalPath: instLocal,
      vocalPath: vocalLocal,
      outputPath: outputLocal,
      offsetMs: job.offset_ms || offsetMs,
      atempo: job.atempo || 1.0,
      targetLufs: job.target_lufs || -14,
      presetKey: job.preset_key || 'clean_light',
      microAdjust: job.micro_adjust || {}
    })

    if (!processingResult.success) {
      throw new Error(processingResult.error || '音声処理に失敗しました')
    }
    
    filesToCleanup.push(outputLocal)

    // 7. 出力ファイル検証
    const outputStats = await fs.stat(outputLocal)
    if (outputStats.size === 0) {
      throw new Error('出力ファイルが空です')
    }
    
    console.log(`Audio processed successfully - Output size: ${outputStats.size} bytes`)

    // 8. 結果アップロード
    console.log(`Uploading result for job ${job.id}`)
    const prefix = resultPrefix(job.user_id, job.id)
    const resultPath = `${prefix}/out.mp3`
    const outputBuffer = await fs.readFile(outputLocal)
    
    await putObjectService('uta-results', resultPath.replace('uta-results/', ''), outputBuffer, 'audio/mpeg')
    
    console.log(`Result uploaded to ${resultPath}`)

    // 9. ジョブ完了更新
    await markDone(
      job.id, 
      resultPath, 
      processingResult.offsetMs ?? offsetMs,
      processingResult.atempo ?? (job.atempo || 1.0),
      processingResult.truePeak
    )

    console.log(`Job ${job.id} marked as completed`)
    return true

  } finally {
    // 10. クリーンアップ（確実に実行）
    if (filesToCleanup.length > 0) {
      console.log(`Cleaning up ${filesToCleanup.length} temporary files for job ${job.id}`)
      for (const file of filesToCleanup) {
        try {
          await fs.unlink(file)
        } catch (error) {
          console.warn(`Failed to cleanup file ${file}:`, error)
        }
      }
    }
  }
}

export async function runLoop() {
  console.log('Worker: starting audio processing loop')
  
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 10
  const ERROR_BACKOFF_MS = 30000 // 30秒
  
  // Graceful shutdown handling
  let shouldShutdown = false
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, initiating graceful shutdown...')
    shouldShutdown = true
  })
  process.on('SIGINT', () => {
    console.log('Received SIGINT, initiating graceful shutdown...')
    shouldShutdown = true
  })
  
  // eslint-disable-next-line no-constant-condition
  while (!shouldShutdown) {
    try {
      const processed = await runOnce()
      
      if (processed) {
        consecutiveErrors = 0 // 成功時はエラーカウンターをリセット
        // 処理成功後は短い間隔で次のジョブをチェック
        await sleep(1000)
      } else {
        // ジョブが無い場合は通常のポーリング間隔
        await sleep(SLEEP_MS)
      }
      
    } catch (error) {
      consecutiveErrors++
      
      console.error(`Worker error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : error,
        timestamp: new Date().toISOString()
      })
      
      // 連続エラーが多い場合は長めに待機
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`Too many consecutive errors (${consecutiveErrors}), backing off for ${ERROR_BACKOFF_MS}ms`)
        await sleep(ERROR_BACKOFF_MS)
        consecutiveErrors = 0 // リセット
      } else {
        await sleep(SLEEP_MS)
      }
    }
  }
  
  console.log('Worker loop ended gracefully')
}

