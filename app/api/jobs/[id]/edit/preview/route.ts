import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'
import { z } from 'zod'

const previewSchema = z.object({
  params: z.record(z.number()).optional(),
  harmony_trial: z.enum(['none', 'up_m3', 'down_m3', 'perfect_5th', 'up_down']).optional(),
  harmony_level_db: z.number().min(-12).max(0).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient(request)
    
    // ユーザー認証チェック
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { params: userParams, harmony_trial, harmony_level_db } = previewSchema.parse(body)
    const jobId = params.id
    
    // jobの存在確認とユーザー権限チェック
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'ジョブが見つかりません' },
        { status: 404 }
      )
    }

    // 状態チェック（ai_ok状態以降）
    if (!['ai_ok', 'editing'].includes(job.status)) {
      return NextResponse.json(
        { error: 'ジョブの状態が無効です。AI仕上げが完了している必要があります。' },
        { status: 400 }
      )
    }

    // ai_ok_artifactの存在確認
    if (!job.ai_ok_artifact_id) {
      return NextResponse.json(
        { error: 'AI仕上げデータが見つかりません' },
        { status: 400 }
      )
    }

    // ai_ok_artifactの期限確認
    const { data: aiOkArtifact, error: aiOkError } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', job.ai_ok_artifact_id)
      .single()

    if (aiOkError || !aiOkArtifact) {
      return NextResponse.json(
        { error: 'AI仕上げデータが期限切れまたは見つかりません' },
        { status: 400 }
      )
    }

    if (new Date(aiOkArtifact.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'AI仕上げデータの期限が切れています。再生成が必要です。' },
        { status: 400 }
      )
    }

    // プレビューパラメータの準備
    const effectiveParams = userParams || job.ai_params || {}
    const previewConfig = {
      job_id: jobId,
      base_artifact_id: job.ai_ok_artifact_id,
      params: effectiveParams,
      harmony: {
        trial: harmony_trial || 'none',
        level_db: harmony_level_db || -6
      },
      duration_seconds: 10,
      start_offset: Math.floor((job.duration_s || 30) / 3) // 楽曲の1/3地点から開始
    }

    // プレビュー生成処理をWorkerに送信（非同期処理）
    // 実際の実装では、リアルタイム処理またはキューシステムを使用

    // 模擬的なプレビュー生成完了
    const previewResult = {
      preview_url: `https://temp-preview.supabase.co/users/${session.user.id}/jobs/${jobId}/preview_${Date.now()}.mp3`,
      measured: {
        lufs: -14.2,
        true_peak: -1.1,
        dynamic_range: 8.5
      },
      chain_summary: {
        applied_params: effectiveParams,
        harmony_applied: harmony_trial !== 'none' ? {
          type: harmony_trial,
          level_db: harmony_level_db || -6
        } : null,
        processing_time_ms: 1200,
        quality_warnings: [] as string[]
      }
    }

    // プレビュー結果にクリッピング警告などを追加
    if (previewResult.measured.true_peak > -1.0) {
      previewResult.chain_summary.quality_warnings.push('True Peak が -1.0 dBTP を超えています')
    }

    // LUFS警告
    const targetLufs = -14.0
    const lufsDeviation = Math.abs(previewResult.measured.lufs - targetLufs)
    if (lufsDeviation > 0.3) {
      previewResult.chain_summary.quality_warnings.push(`ラウドネスが目標値から ${lufsDeviation.toFixed(1)} dB 離れています`)
    }

    return NextResponse.json({
      success: true,
      ...previewResult,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15分後に期限切れ
    })

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'プレビュー生成に失敗しました' },
      { status: 500 }
    )
  }
}