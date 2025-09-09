import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

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

    // ai_ok_artifactの状態確認
    let needsRegeneration = false
    let currentAiOkArtifact = null

    if (job.ai_ok_artifact_id) {
      const { data: aiOkArtifact, error: aiOkError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', job.ai_ok_artifact_id)
        .single()

      if (aiOkError || !aiOkArtifact || new Date(aiOkArtifact.expires_at) < new Date()) {
        needsRegeneration = true
      } else {
        currentAiOkArtifact = aiOkArtifact
      }
    } else {
      needsRegeneration = true
    }

    if (!needsRegeneration && currentAiOkArtifact) {
      return NextResponse.json({
        message: 'AI仕上げデータは有効です',
        artifact_id: currentAiOkArtifact.id,
        expires_at: currentAiOkArtifact.expires_at,
        status: 'available'
      })
    }

    // prep_artifactの存在・有効性確認（ai_okの前提条件）
    if (!job.prep_artifact_id) {
      return NextResponse.json(
        { error: '下ごしらえデータが見つかりません。ensure-prepを先に実行してください。' },
        { status: 400 }
      )
    }

    const { data: prepArtifact, error: prepError } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', job.prep_artifact_id)
      .single()

    if (prepError || !prepArtifact || new Date(prepArtifact.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '下ごしらえデータが期限切れです。ensure-prepを先に実行してください。' },
        { status: 400 }
      )
    }

    // ジョブステータスを ai_mixing に更新
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        status: 'ai_mixing',
        ai_ok_artifact_id: null, // 古いアーティファクト参照をクリア
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      return NextResponse.json(
        { error: 'ジョブの更新に失敗しました' },
        { status: 500 }
      )
    }

    // AI MIX処理をWorkerに送信（非同期処理）
    setTimeout(async () => {
      try {
        // 新しい ai_ok アーティファクトを作成
        const aiOkArtifact = {
          job_id: jobId,
          kind: 'ai_ok',
          storage_path: `users/${session.user.id}/jobs/${jobId}/ai_mix_ref.wav`,
          meta: {
            mix_params: {
              vocal_level: 0.8,
              clarity: 0.6,
              punch: 0.4,
              width: 0.5,
              air: 0.3
            },
            quality_check: {
              clipping_rate: 0.02,
              short_lufs: -14.2,
              vocal_inst_ratio: 0.65,
              snr_improvement: 8.5,
              regenerated_at: new Date().toISOString()
            }
          }
        }

        const { data: newArtifact, error: artifactError } = await supabase
          .from('artifacts')
          .insert(aiOkArtifact)
          .select()
          .single()

        if (!artifactError && newArtifact) {
          // jobを ai_ok 状態に更新
          await supabase
            .from('jobs')
            .update({
              status: 'ai_ok',
              ai_ok_artifact_id: newArtifact.id,
              ai_params: aiOkArtifact.meta.mix_params,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
        }
      } catch (error) {
        console.error('AI OK regeneration error:', error)
        // エラー時はfailed状態に更新
        await supabase
          .from('jobs')
          .update({ status: 'failed' })
          .eq('id', jobId)
      }
    }, 4000) // 4秒後に完了（デモ用）

    return NextResponse.json({
      message: 'AI仕上げデータの再生成を開始しました',
      job_id: jobId,
      status: 'ai_mixing',
      estimated_completion: '約4秒後'
    })

  } catch (error: any) {
    console.error('Ensure AI OK error:', error)
    return NextResponse.json(
      { error: 'AI仕上げデータの再生成に失敗しました' },
      { status: 500 }
    )
  }
}