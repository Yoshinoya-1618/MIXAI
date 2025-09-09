import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { z } from 'zod'

const aiMixSchema = z.object({
  jobId: z.string().uuid()
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

    // 状態チェック（prep_ready状態から開始）
    if (job.status !== 'prep_ready') {
      return NextResponse.json(
        { error: 'ジョブの状態が無効です。下ごしらえが完了している必要があります。' },
        { status: 400 }
      )
    }

    // prep_artifactの存在確認
    if (!job.prep_artifact_id) {
      return NextResponse.json(
        { error: '下ごしらえデータが見つかりません' },
        { status: 400 }
      )
    }

    // prep_artifactの期限確認
    const { data: prepArtifact, error: prepError } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', job.prep_artifact_id)
      .single()

    if (prepError || !prepArtifact) {
      return NextResponse.json(
        { error: '下ごしらえデータが期限切れまたは見つかりません' },
        { status: 400 }
      )
    }

    if (new Date(prepArtifact.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '下ごしらえデータの期限が切れています。再処理が必要です。' },
        { status: 400 }
      )
    }

    // ジョブステータスを ai_mixing に更新
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        status: 'ai_mixing',
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
    // 実際の実装では、キューシステム（BullMQ等）またはWorker APIを呼び出します
    
    // 模擬的な処理完了（実際にはWorkerから完了通知を受信）
    setTimeout(async () => {
      try {
        // AI MIX完了後の処理
        // 1. ai_ok アーティファクトを作成
        const aiOkArtifact = {
          job_id: jobId,
          kind: 'ai_ok',
          storage_path: `users/${session.user.id}/jobs/${jobId}/ai_mix_ref.wav`,
          meta: {
            mix_params: {
              // AI適用されたパラメータ
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
              snr_improvement: 8.5
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
        console.error('AI MIX post-processing error:', error)
      }
    }, 5000) // 5秒後に完了（デモ用）

    return NextResponse.json({
      message: 'AI MIX処理を開始しました',
      job_id: jobId,
      status: 'ai_mixing'
    })

  } catch (error: any) {
    console.error('AI Mix error:', error)
    return NextResponse.json(
      { error: 'AI MIX処理に失敗しました' },
      { status: 500 }
    )
  }
}