// app/api/v1/mix/export/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../_lib/auth'
import { ApiError, errorResponse } from '../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/mix/export - 最終書き出し（0C、フル品質）
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { jobId, params, format = 'mp3', targetLufs = -14 } = await request.json()

    if (!jobId) {
      throw new ApiError(400, 'jobId is required')
    }

    const validFormats = ['mp3', 'wav16', 'wav24', 'flac']
    if (!validFormats.includes(format)) {
      throw new ApiError(400, 'Invalid format')
    }

    console.log(`📦 Starting export for job ${jobId}, format ${format}`)

    // デイリー上限チェック（10件/日）
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('updated_at', `${today}T00:00:00.000Z`)
      .lt('updated_at', `${today}T23:59:59.999Z`)

    if (count && count >= 10) {
      throw new ApiError(429, 'Daily export limit exceeded (10 files per day)')
    }

    // ジョブの存在確認
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (!job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    // プラン確認（フォーマット制限）
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const planCode = subscription?.plan_code || 'lite'

    // プラン別フォーマット制限
    if (format === 'flac' && planCode === 'lite') {
      throw new ApiError(403, 'FLAC export requires Standard or Creator plan')
    }

    if (format === 'wav24' && planCode !== 'creator') {
      throw new ApiError(403, 'WAV 24-bit export requires Creator plan')
    }

    // パラメータの決定
    const exportParams = params || job.user_params || job.ai_params
    if (!exportParams) {
      throw new ApiError(400, 'No parameters available for export')
    }

    // 書き出し実行
    const exportResult = await performExport({
      jobId,
      userId,
      job,
      params: exportParams,
      format,
      targetLufs,
      planCode
    })

    // ログとパラメータを保存
    await supabase
      .from('jobs')
      .update({
        last_export_params: exportParams,
        metrics: {
          ...job.metrics,
          last_export_lufs: exportResult.measured.lufs,
          last_export_tp: exportResult.measured.truePeak,
          last_export_format: format,
          last_export_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`✅ Export completed for job ${jobId}: ${exportResult.fileUrl}`)

    return Response.json({
      success: true,
      fileUrl: exportResult.fileUrl,
      measured: exportResult.measured,
      appliedParams: exportParams,
      logs: exportResult.logs,
      meta: {
        job_id: jobId,
        format,
        target_lufs: targetLufs,
        plan_code: planCode,
        processing_time: exportResult.processingTime,
        file_size: exportResult.fileSize
      }
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'export_error', 
      message: '書き出しに失敗しました', 
      details: error 
    })
  }
}

/**
 * 書き出し実行の実装
 */
async function performExport(options: {
  jobId: string
  userId: string
  job: any
  params: any
  format: string
  targetLufs: number
  planCode: string
}) {
  const { execa } = await import('execa')
  const path = await import('path')
  const fs = await import('fs/promises')

  const { jobId, userId, job, params, format, targetLufs, planCode } = options
  const startTime = Date.now()

  try {
    // 一時作業ディレクトリ
    const tempDir = path.join(process.cwd(), 'temp', jobId)
    await fs.mkdir(tempDir, { recursive: true })

    // Supabase Storageから音声ファイルをダウンロード
    const { data: vocalData } = await supabase.storage
      .from('uta-uploads')
      .download(job.vocal_path)

    const { data: instData } = await supabase.storage
      .from('uta-uploads')
      .download(job.instrumental_path)

    if (!vocalData || !instData) {
      throw new Error('Failed to download audio files')
    }

    const vocalTempPath = path.join(tempDir, 'vocal.wav')
    const instTempPath = path.join(tempDir, 'inst.wav')
    const outputPath = path.join(tempDir, `export.${getFileExtension(format)}`)

    await fs.writeFile(vocalTempPath, Buffer.from(await vocalData.arrayBuffer()))
    await fs.writeFile(instTempPath, Buffer.from(await instData.arrayBuffer()))

    // プラン別オーバーサンプリング
    const oversampling = planCode === 'lite' ? 4 : planCode === 'standard' ? 8 : 16

    // FFmpegで最終書き出し
    const ffmpegArgs = buildExportCommand({
      vocalPath: vocalTempPath,
      instPath: instTempPath,
      outputPath,
      params,
      format,
      targetLufs,
      oversampling,
      planCode
    })

    const ffmpegResult = await execa('ffmpeg', ffmpegArgs, {
      timeout: 300000 // 5分タイムアウト
    })

    // LUFS測定
    const measureResult = await measureAudio(outputPath)

    // ファイルサイズ取得
    const stats = await fs.stat(outputPath)
    const fileSize = stats.size

    // 書き出しファイルをStorageにアップロード
    const exportBuffer = await fs.readFile(outputPath)
    const exportStoragePath = `exports/${userId}/${jobId}/export_${Date.now()}.${getFileExtension(format)}`

    await supabase.storage
      .from('uta-uploads')
      .upload(exportStoragePath, exportBuffer, {
        contentType: getContentType(format),
        upsert: true
      })

    // 署名URL生成（24時間有効）
    const { data: urlData } = await supabase.storage
      .from('uta-uploads')
      .createSignedUrl(exportStoragePath, 86400)

    // 一時ファイル削除
    await fs.rm(tempDir, { recursive: true, force: true })

    const processingTime = Date.now() - startTime

    // ログ生成
    const logs = generateProcessingLogs(params, measureResult, planCode, processingTime)

    return {
      fileUrl: urlData?.signedUrl,
      measured: {
        lufs: measureResult.lufs,
        truePeak: measureResult.truePeak,
        lra: measureResult.lra
      },
      logs,
      processingTime,
      fileSize
    }

  } catch (error) {
    // エラー時も一時ファイルを削除
    const tempDir = path.join(process.cwd(), 'temp', jobId)
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

/**
 * 書き出し用FFmpegコマンド構築
 */
function buildExportCommand(options: {
  vocalPath: string
  instPath: string
  outputPath: string
  params: any
  format: string
  targetLufs: number
  oversampling: number
  planCode: string
}): string[] {
  const { vocalPath, instPath, outputPath, params, format, targetLufs, oversampling } = options

  const args = [
    '-i', vocalPath,
    '-i', instPath,
  ]

  // 高品質フィルターチェーン
  const filterChain = buildAdvancedFilterChain(params, targetLufs, oversampling)
  args.push('-filter_complex', filterChain)

  // フォーマット別エンコード設定
  switch (format) {
    case 'mp3':
      args.push('-c:a', 'libmp3lame', '-b:a', '320k')
      break
    case 'wav16':
      args.push('-c:a', 'pcm_s16le', '-ar', '44100')
      break
    case 'wav24':
      args.push('-c:a', 'pcm_s24le', '-ar', '48000')
      break
    case 'flac':
      args.push('-c:a', 'flac', '-compression_level', '8')
      break
  }

  args.push('-y', outputPath)

  return args
}

/**
 * 高品質フィルターチェーン構築
 */
function buildAdvancedFilterChain(params: any, targetLufs: number, oversampling: number): string {
  const filters: string[] = []

  // 1. オフセット補正
  if (params.offset_ms) {
    const offsetSec = Math.abs(params.offset_ms) / 1000
    filters.push(`[0:a]adelay=${offsetSec * 1000}|${offsetSec * 1000}[vocal]`)
  } else {
    filters.push('[0:a]anull[vocal]')
  }

  // 2. ボーカル処理チェーン（高品質版）
  const vocalChain = []

  // HPF (20-30Hz)
  vocalChain.push('highpass=f=25')

  // Air (8-12kHz shelf)
  if (params.air > 0) {
    const airGain = params.air * 2.5
    vocalChain.push(`highshelf=f=10000:g=${airGain}:width_type=o:width=0.707`)
  }

  // Body (200-350Hz bell)
  if (params.body > 0) {
    const bodyGain = params.body * 2.0
    vocalChain.push(`bell=f=275:g=${bodyGain}:width_type=o:width=0.5`)
  }

  // Vocal (2-4kHz bell)
  if (params.vocal > 0) {
    const vocalGain = params.vocal * 1.5
    vocalChain.push(`bell=f=3000:g=${vocalGain}:width_type=o:width=0.7`)
  }

  // Clarity (0.6-2kHz DynEQ)
  if (params.clarity > 0) {
    const clarityGain = params.clarity * 2.0
    vocalChain.push(`bell=f=1300:g=${clarityGain}:width_type=o:width=0.4`)
  }

  // Presence (Creator: 倍音比率)
  if (params.presence > 0) {
    const presenceAmount = params.presence * 0.05
    vocalChain.push(`aexciter=amount=${presenceAmount}:blend=0.3`)
  }

  // De-esser (簡易版)
  vocalChain.push('deesser=i=0.1:m=0.5:s=i')

  // 3. フィルターチェーン適用
  filters.push(`[vocal]${vocalChain.join(',')}[vocal_processed]`)

  // 4. インスト処理（原則BYPASS、必要時のみRescue）
  filters.push('[1:a]anull[inst]')

  // 5. ミックス
  const vocalLevel = 1.0
  const instLevel = params.punch ? Math.max(0.7, 1.0 - params.punch * 0.1) : 1.0

  filters.push(`[vocal_processed][inst]amix=inputs=2:weights=${vocalLevel} ${instLevel}[mixed]`)

  // 6. ステレオ処理
  if (params.width > 0) {
    const widthFactor = 1.0 + params.width * 0.1
    filters.push(`[mixed]extrastereo=m=${widthFactor}[stereo]`)
  } else {
    filters.push('[mixed]anull[stereo]')
  }

  // 7. フェード
  const fadeFilters = []
  if (params.fade_in > 0) {
    fadeFilters.push(`afade=t=in:d=${params.fade_in}`)
  }
  if (params.fade_out > 0) {
    fadeFilters.push(`afade=t=out:st=45:d=${params.fade_out}`) // 45秒から開始（60秒想定）
  }

  if (fadeFilters.length > 0) {
    filters.push(`[stereo]${fadeFilters.join(',')}[faded]`)
  } else {
    filters.push('[stereo]anull[faded]')
  }

  // 8. 出力ゲイン
  if (params.output_gain) {
    filters.push(`[faded]volume=${params.output_gain}dB[gained]`)
  } else {
    filters.push('[faded]anull[gained]')
  }

  // 9. Loudness正規化（最終段）
  const loudnormI = targetLufs
  const loudnormTp = -1.0
  filters.push(`[gained]loudnorm=I=${loudnormI}:TP=${loudnormTp}:LRA=7:measured_I=-14:measured_LRA=7:measured_TP=-1[normalized]`)

  return filters.join(';')
}

/**
 * 音声測定
 */
async function measureAudio(filePath: string) {
  const { execa } = await import('execa')

  try {
    const result = await execa('ffmpeg', [
      '-i', filePath,
      '-af', 'loudnorm=print_format=json',
      '-f', 'null',
      '-'
    ])

    const jsonMatch = result.stderr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      return {
        lufs: parseFloat(data.input_i) || -14.0,
        truePeak: parseFloat(data.input_tp) || -1.0,
        lra: parseFloat(data.input_lra) || 7.0
      }
    }
  } catch (e) {
    // 測定失敗時はデフォルト値
  }

  return { lufs: -14.0, truePeak: -1.0, lra: 7.0 }
}

/**
 * 処理ログ生成
 */
function generateProcessingLogs(params: any, measured: any, planCode: string, processingTime: number) {
  const logs = []

  logs.push(`処理プラン: ${planCode.toUpperCase()}`)
  logs.push(`処理時間: ${Math.round(processingTime / 1000)}秒`)
  logs.push(`最終LUFS: ${measured.lufs.toFixed(1)} LUFS`)
  logs.push(`True Peak: ${measured.truePeak.toFixed(1)} dBTP`)

  const activeParams = []
  if (params.air > 0) activeParams.push(`Air: +${(params.air * 2.5).toFixed(1)}dB`)
  if (params.body > 0) activeParams.push(`Body: +${(params.body * 2.0).toFixed(1)}dB`)
  if (params.vocal > 0) activeParams.push(`Vocal: +${(params.vocal * 1.5).toFixed(1)}dB`)
  if (params.clarity > 0) activeParams.push(`Clarity: +${(params.clarity * 2.0).toFixed(1)}dB`)
  if (params.presence > 0) activeParams.push(`Presence: +${(params.presence * 5.0).toFixed(1)}%`)

  if (activeParams.length > 0) {
    logs.push(`適用パラメータ: ${activeParams.join(', ')}`)
  }

  return logs
}

function getFileExtension(format: string): string {
  switch (format) {
    case 'wav16':
    case 'wav24':
      return 'wav'
    default:
      return format
  }
}

function getContentType(format: string): string {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav16':
    case 'wav24':
      return 'audio/wav'
    case 'flac':
      return 'audio/flac'
    default:
      return 'audio/mpeg'
  }
}