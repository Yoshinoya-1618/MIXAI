// app/api/v1/ml/infer/route.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { inferMasteringParams, recommendPreset, calculateAlignmentConfidence } from '../../../../../worker/inference-mock'
import { z } from 'zod'

const inferSchema = z.object({
  jobId: z.string().uuid(),
  task: z.enum(['master_params', 'preset_recommendation', 'alignment_confidence', 'all']),
  audioData: z.object({
    inst: z.string().optional(), // Base64エンコード
    vocal: z.string().optional()
  }).optional()
})

// POST /v1/ml/infer - AI推論エンドポイント
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    
    // ユーザー認証チェック
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, task, audioData } = inferSchema.parse(body)

    console.log(`🤖 Running ML inference for job ${jobId}, task: ${task}`)

    // ジョブ情報の取得
    let instBuffer: ArrayBuffer | undefined
    let vocalBuffer: ArrayBuffer | undefined

    if (audioData?.inst && audioData?.vocal) {
      // Base64デコード
      instBuffer = Buffer.from(audioData.inst, 'base64').buffer
      vocalBuffer = Buffer.from(audioData.vocal, 'base64').buffer
    } else {
      // ジョブから音声ファイルを取得
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', session.user.id)
        .single()

      if (jobError || !job) {
        return Response.json({ error: 'ジョブが見つかりません' }, { status: 404 })
      }

      // Storageから音声ファイルをダウンロード
      if (job.instrumental_path_trimmed || job.instrumental_path) {
        const instPath = job.instrumental_path_trimmed || job.instrumental_path
        const { data: instData } = await supabase.storage
          .from('audio')
          .download(instPath)
        if (instData) {
          instBuffer = await instData.arrayBuffer()
        }
      }

      if (job.vocal_path) {
        const { data: vocalData } = await supabase.storage
          .from('audio')
          .download(job.vocal_path)
        if (vocalData) {
          vocalBuffer = await vocalData.arrayBuffer()
        }
      }
    }

    if (!instBuffer || !vocalBuffer) {
      return Response.json({ error: '音声ファイルが見つかりません' }, { status: 400 })
    }

    // 推論実行
    const results: any = {}
    
    if (task === 'master_params' || task === 'all') {
      const masterParams = await inferMasteringParams(instBuffer, vocalBuffer, session.user.id)
      if (masterParams) {
        results.masterParams = masterParams
      }
    }

    if (task === 'preset_recommendation' || task === 'all') {
      const presetId = await recommendPreset(instBuffer, vocalBuffer, session.user.id)
      results.recommendedPreset = presetId
    }

    if (task === 'alignment_confidence' || task === 'all') {
      const confidence = await calculateAlignmentConfidence(instBuffer, vocalBuffer, session.user.id)
      results.alignmentConfidence = confidence
    }

    // 結果をジョブに保存（オプション）
    if (jobId && Object.keys(results).length > 0) {
      await supabase
        .from('jobs')
        .update({
          ml_inference_results: results,
          ml_inference_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    console.log(`✅ ML inference completed for job ${jobId}`)

    return Response.json({
      success: true,
      jobId,
      results,
      meta: {
        task,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('ML inference failed:', error)
    return Response.json({ 
      error: 'ML推論に失敗しました',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}

// GET /v1/ml/infer - 推論結果の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return Response.json({ error: 'jobIdが必要です' }, { status: 400 })
    }

    // ジョブから推論結果を取得
    const { data: job, error } = await supabase
      .from('jobs')
      .select('ml_inference_results, ml_inference_at')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .single()

    if (error || !job) {
      return Response.json({ error: 'ジョブが見つかりません' }, { status: 404 })
    }

    if (!job.ml_inference_results) {
      return Response.json({ error: '推論結果がありません' }, { status: 404 })
    }

    return Response.json({
      success: true,
      jobId,
      results: job.ml_inference_results,
      inferredAt: job.ml_inference_at
    })

  } catch (error) {
    return Response.json({ 
      error: '推論結果の取得に失敗しました',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}