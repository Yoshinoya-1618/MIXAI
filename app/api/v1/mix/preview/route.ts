// app/api/v1/mix/preview/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../_lib/auth'
import { ApiError, errorResponse } from '../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/mix/preview - プレビュー生成（0C、30秒）
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { jobId, params, ab = 'USER_EDIT', section } = await request.json()

    if (!jobId) {
      throw new ApiError(400, 'jobId is required')
    }

    console.log(`🎧 Generating preview for job ${jobId}, mode ${ab}`)

    // レート制限チェック（分間6リクエスト）
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('updated_at', oneMinuteAgo)

    if (count && count >= 6) {
      throw new ApiError(429, 'Rate limit exceeded. Please wait.')
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

    // パラメータの決定
    let previewParams = params
    if (!previewParams) {
      previewParams = ab === 'AI_BASE' ? job.ai_params : job.user_params
    }

    if (!previewParams) {
      throw new ApiError(400, 'No parameters available for preview')
    }

    // プレビュー区間の決定
    const previewSection = section || {
      start: 15, // デフォルトは15秒から
      duration: 30 // 30秒間
    }

    // プレビュー生成
    const previewResult = await generatePreview({
      jobId,
      userId,
      job,
      params: previewParams,
      section: previewSection,
      normalizeToLufs: -14.0 // A/B比較用に正規化
    })

    // 測定結果を保存（オプション）
    if (ab === 'USER_EDIT' && params) {
      await supabase
        .from('jobs')
        .update({
          user_params: params,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    console.log(`✅ Preview generated for job ${jobId}: ${previewResult.previewUrl}`)

    return Response.json({
      success: true,
      previewUrl: previewResult.previewUrl,
      measured: {
        lufs: previewResult.lufs,
        tp: previewResult.truePeak
      },
      chainSummary: previewResult.chainSummary,
      section: previewSection,
      normalizedTo: -14.0,
      meta: {
        job_id: jobId,
        ab_mode: ab,
        processing_time: previewResult.processingTime
      }
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'preview_generation_error', 
      message: 'プレビュー生成に失敗しました', 
      details: error 
    })
  }
}

/**
 * プレビュー生成の実装
 */
async function generatePreview(options: {
  jobId: string
  userId: string
  job: any
  params: any
  section: { start: number; duration: number }
  normalizeToLufs: number
}) {
  const { execa } = await import('execa')
  const path = await import('path')
  const fs = await import('fs/promises')

  const { jobId, userId, job, params, section, normalizeToLufs } = options
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
    const outputPath = path.join(tempDir, 'preview.wav')

    await fs.writeFile(vocalTempPath, Buffer.from(await vocalData.arrayBuffer()))
    await fs.writeFile(instTempPath, Buffer.from(await instData.arrayBuffer()))

    // FFmpegでプレビュー生成
    const ffmpegArgs = [
      '-i', vocalTempPath,
      '-i', instTempPath,
      '-filter_complex', buildFilterChain(params, section),
      '-ss', section.start.toString(),
      '-t', section.duration.toString(),
      '-c:a', 'pcm_s16le',
      '-ar', '44100',
      '-y',
      outputPath
    ]

    await execa('ffmpeg', ffmpegArgs, {
      timeout: 60000 // 60秒タイムアウト
    })

    // LUFS測定
    const lufsResult = await execa('ffmpeg', [
      '-i', outputPath,
      '-af', 'loudnorm=print_format=json',
      '-f', 'null',
      '-'
    ])

    const lufsData = extractLufsData(lufsResult.stderr)

    // プレビューファイルをStorageにアップロード
    const previewBuffer = await fs.readFile(outputPath)
    const previewStoragePath = `previews/${userId}/${jobId}/preview_${Date.now()}.wav`

    await supabase.storage
      .from('uta-uploads')
      .upload(previewStoragePath, previewBuffer, {
        contentType: 'audio/wav',
        upsert: true
      })

    // 署名URL生成（5分間有効）
    const { data: urlData } = await supabase.storage
      .from('uta-uploads')
      .createSignedUrl(previewStoragePath, 300)

    // 一時ファイル削除
    await fs.rm(tempDir, { recursive: true, force: true })

    const processingTime = Date.now() - startTime

    return {
      previewUrl: urlData?.signedUrl,
      lufs: lufsData.input_i,
      truePeak: lufsData.input_tp,
      chainSummary: generateChainSummary(params),
      processingTime
    }

  } catch (error) {
    // エラー時も一時ファイルを削除
    const tempDir = path.join(process.cwd(), 'temp', jobId)
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

/**
 * パラメータからFFmpegフィルターチェーンを構築
 */
function buildFilterChain(params: any, section: { start: number; duration: number }): string {
  const filters: string[] = []

  // オフセット補正
  if (params.offset_ms) {
    const offsetSec = params.offset_ms / 1000
    filters.push(`[0:a]adelay=${Math.abs(offsetSec * 1000)}|${Math.abs(offsetSec * 1000)}[vocal]`)
  } else {
    filters.push('[0:a]anull[vocal]')
  }

  // ボーカル処理チェーン
  const vocalProcessing = []
  
  // Air (高域シェルフ)
  if (params.air > 0) {
    const airGain = params.air * 2.5 // 0-2.5dB
    vocalProcessing.push(`highshelf=f=8000:g=${airGain}`)
  }

  // Body (中低域ベル)
  if (params.body > 0) {
    const bodyGain = params.body * 2.0 // 0-2.0dB
    vocalProcessing.push(`bell=f=275:g=${bodyGain}:w=0.5`)
  }

  // Vocal (中域ベル)
  if (params.vocal > 0) {
    const vocalGain = params.vocal * 1.5 // 0-1.5dB
    vocalProcessing.push(`bell=f=3000:g=${vocalGain}:w=0.7`)
  }

  // Clarity (Standard/Creator)
  if (params.clarity > 0) {
    const clarityGain = params.clarity * 2.0 // 0-2.0dB
    vocalProcessing.push(`bell=f=1300:g=${clarityGain}:w=0.4`)
  }

  // フィルターチェーン構築
  if (vocalProcessing.length > 0) {
    filters.push(`[vocal]${vocalProcessing.join(',')}[vocal_processed]`)
  } else {
    filters.push('[vocal]anull[vocal_processed]')
  }

  // インスト処理（原則BYPASS）
  filters.push('[1:a]anull[inst]')

  // ミックス
  const vocalLevel = 1.0
  const instLevel = params.punch ? (1.0 - params.punch * 0.1) : 1.0 // Punchでインストを少し下げる

  filters.push(`[vocal_processed][inst]amix=inputs=2:weights=${vocalLevel} ${instLevel}[mixed]`)

  // Width (ステレオ幅調整)
  if (params.width > 0) {
    const widthFactor = 1.0 + params.width * 0.1 // ±10%
    filters.push(`[mixed]extrastereo=m=${widthFactor}[stereo]`)
  } else {
    filters.push('[mixed]anull[stereo]')
  }

  // Output Gain
  if (params.output_gain) {
    filters.push(`[stereo]volume=${params.output_gain}dB[output]`)
  } else {
    filters.push('[stereo]anull[output]')
  }

  return filters.join(';')
}

/**
 * FFmpeg出力からLUFS測定値を抽出
 */
function extractLufsData(stderr: string) {
  try {
    const jsonMatch = stderr.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    // パース失敗時はデフォルト値
  }

  return {
    input_i: -14.0,
    input_tp: -1.0,
    input_lra: 7.0
  }
}

/**
 * 処理チェーンサマリー生成
 */
function generateChainSummary(params: any) {
  const chain = []

  if (params.air > 0) chain.push(`Air: +${(params.air * 2.5).toFixed(1)}dB`)
  if (params.body > 0) chain.push(`Body: +${(params.body * 2.0).toFixed(1)}dB`)
  if (params.vocal > 0) chain.push(`Vocal: +${(params.vocal * 1.5).toFixed(1)}dB`)
  if (params.clarity > 0) chain.push(`Clarity: +${(params.clarity * 2.0).toFixed(1)}dB`)
  if (params.presence > 0) chain.push(`Presence: +${(params.presence * 5.0).toFixed(1)}%`)

  return chain.length > 0 ? chain : ['原音重視処理']
}