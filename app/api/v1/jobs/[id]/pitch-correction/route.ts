// app/api/v1/jobs/[id]/pitch-correction/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/jobs/:id/pitch-correction - ピッチ補正実行
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticateUser(request)
    const jobId = params.id
    const body = await request.json()
    
    const { corrections, apply_auto = false } = body

    // ジョブの存在確認と権限チェック
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (!job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    if (!job.vocal_path) {
      throw new ApiError(400, 'Vocal file not found')
    }

    // プランチェック
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    
    const planCode = subscription?.plan_code || 'lite'

    if (planCode === 'lite' && apply_auto) {
      throw new ApiError(403, 'Automatic pitch correction requires Standard or Creator plan')
    }

    console.log(`🎤 Starting pitch correction for job ${jobId}`)

    // Python WORLDベースピッチ補正を実行
    try {
      const { execa } = await import('execa')
      const path = await import('path')
      
      const pythonScript = path.join(process.cwd(), 'worker', 'advanced-analysis.py')
      const correctionData = JSON.stringify(corrections)
      
      // 一時的な出力パス生成
      const outputPath = `temp/${jobId}_pitch_corrected_${Date.now()}.wav`
      
      const result = await execa('python3', [
        pythonScript,
        '--vocal', job.vocal_path,
        '--inst', job.instrumental_path,
        '--mode', 'pitch_correct',
        '--corrections', correctionData,
        '--output', outputPath
      ], {
        timeout: 180000 // 3分タイムアウト
      })

      // 補正されたボーカルファイルをStorageにアップロード
      const fs = await import('fs/promises')
      const correctedBuffer = await fs.readFile(outputPath)
      
      const correctedVocalPath = `${userId}/${jobId}/vocal_corrected_${Date.now()}.wav`
      
      await supabase.storage
        .from('uta-uploads')
        .upload(correctedVocalPath, correctedBuffer, {
          contentType: 'audio/wav'
        })

      // ジョブを更新
      await supabase
        .from('jobs')
        .update({
          vocal_path: correctedVocalPath,
          pitch_corrected: true,
          pitch_correction_applied_at: new Date().toISOString()
        })
        .eq('id', jobId)

      // 一時ファイル削除
      await fs.unlink(outputPath).catch(() => {})

      return Response.json({ 
        success: true, 
        corrected_vocal_path: correctedVocalPath,
        corrections_applied: corrections.length,
        processing_method: planCode === 'creator' ? 'WORLD_synthesis' : 'pitch_shift',
        message: 'ピッチ補正が完了しました'
      })

    } catch (error) {
      console.error('Pitch correction error:', error)
      throw new ApiError(500, 'ピッチ補正処理に失敗しました')
    }

  } catch (error) {
    return errorResponse(500, { 
      code: 'pitch_correction_error', 
      message: 'ピッチ補正に失敗しました', 
      details: error 
    })
  }
}

// GET /v1/jobs/:id/pitch-correction - ピッチ補正候補取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticateUser(request)
    const jobId = params.id

    // ジョブの解析データを取得
    const { data: job } = await supabase
      .from('jobs')
      .select('pitch_analysis, analysis_completed_at')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (!job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    if (!job.analysis_completed_at) {
      throw new ApiError(400, 'Analysis not completed yet')
    }

    // 保存された解析データからピッチ補正候補を取得
    const pitchAnalysis = job.pitch_analysis || { correction_candidates: [] }
    
    return Response.json({
      success: true,
      pitch_candidates: pitchAnalysis.correction_candidates,
      total_candidates: pitchAnalysis.correction_candidates.length,
      analysis_timestamp: job.analysis_completed_at
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'get_pitch_candidates_error', 
      message: 'ピッチ補正候補の取得に失敗しました', 
      details: error 
    })
  }
}