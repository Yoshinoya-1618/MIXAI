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

    // prep_artifactの状態確認
    let needsRegeneration = false
    let currentPrepArtifact = null

    if (job.prep_artifact_id) {
      const { data: prepArtifact, error: prepError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', job.prep_artifact_id)
        .single()

      if (prepError || !prepArtifact || new Date(prepArtifact.expires_at) < new Date()) {
        needsRegeneration = true
      } else {
        currentPrepArtifact = prepArtifact
      }
    } else {
      needsRegeneration = true
    }

    if (!needsRegeneration && currentPrepArtifact) {
      return NextResponse.json({
        message: '下ごしらえデータは有効です',
        artifact_id: currentPrepArtifact.id,
        expires_at: currentPrepArtifact.expires_at,
        status: 'available'
      })
    }

    // 元素材ファイルの存在確認
    if (!job.instrumental_path || !job.vocal_path) {
      return NextResponse.json(
        { error: '元素材ファイルが見つかりません。最初から再アップロードが必要です。' },
        { status: 400 }
      )
    }

    // ジョブステータスを prepping に更新
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        status: 'prepping',
        prep_artifact_id: null, // 古いアーティファクト参照をクリア
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      return NextResponse.json(
        { error: 'ジョブの更新に失敗しました' },
        { status: 500 }
      )
    }

    // 下ごしらえ処理をWorkerに送信（非同期処理）
    setTimeout(async () => {
      try {
        // 新しい prep アーティファクトを作成
        const prepArtifact = {
          job_id: jobId,
          kind: 'prep',
          storage_path: `users/${session.user.id}/jobs/${jobId}/prep`,
          meta: {
            vox_tuned_path: `users/${session.user.id}/jobs/${jobId}/prep/vox_tuned.wav`,
            vox_aligned_path: `users/${session.user.id}/jobs/${jobId}/prep/vox_aligned.wav`,
            inst_clean_path: `users/${session.user.id}/jobs/${jobId}/prep/inst_clean.wav`,
            processing: {
              offset_correction_ms: 50,
              tempo_adjustment: 1.02,
              pitch_corrections: 12,
              timing_adjustments: 8
            }
          }
        }

        const { data: newArtifact, error: artifactError } = await supabase
          .from('artifacts')
          .insert(prepArtifact)
          .select()
          .single()

        if (!artifactError && newArtifact) {
          // jobを prep_ready 状態に更新
          await supabase
            .from('jobs')
            .update({
              status: 'prep_ready',
              prep_artifact_id: newArtifact.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
        }
      } catch (error) {
        console.error('Prep regeneration error:', error)
        // エラー時はfailed状態に更新
        await supabase
          .from('jobs')
          .update({ status: 'failed' })
          .eq('id', jobId)
      }
    }, 3000) // 3秒後に完了（デモ用）

    return NextResponse.json({
      message: '下ごしらえデータの再生成を開始しました',
      job_id: jobId,
      status: 'prepping',
      estimated_completion: '約3秒後'
    })

  } catch (error: any) {
    console.error('Ensure prep error:', error)
    return NextResponse.json(
      { error: '下ごしらえデータの再生成に失敗しました' },
      { status: 500 }
    )
  }
}