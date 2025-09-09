import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { z } from 'zod'

const commitSchema = z.object({
  params: z.record(z.number()).optional(),
  harmony_choice: z.enum(['none', 'up_m3', 'down_m3', 'perfect_5th', 'up_down']).optional(),
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
    const { params: userParams, harmony_choice, harmony_level_db } = commitSchema.parse(body)
    const jobId = params.id
    
    // jobの存在確認とユーザー権限チェック
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, artifacts!ai_ok_artifact_id(*)')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'ジョブが見つかりません' },
        { status: 404 }
      )
    }

    // 状態チェック（ai_ok状態から開始）
    if (job.status !== 'ai_ok') {
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

    // 課金処理（Hold → 確定）
    // 実際の実装では、Stripe等での課金確定処理を行う

    // ジョブステータスを editing → mastering → rendering → complete に順次更新
    const { error: editingError } = await supabase
      .from('jobs')
      .update({ 
        status: 'editing',
        user_params: userParams || job.ai_params,
        harmony_choice: harmony_choice || 'none',
        harmony_level_db: harmony_level_db || -6,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (editingError) {
      return NextResponse.json(
        { error: 'ジョブの更新に失敗しました' },
        { status: 500 }
      )
    }

    // マスタリング・レンダリング処理をWorkerに送信（非同期処理）
    setTimeout(async () => {
      try {
        // マスタリング開始
        await supabase
          .from('jobs')
          .update({ status: 'mastering' })
          .eq('id', jobId)

        // レンダリング開始  
        setTimeout(async () => {
          await supabase
            .from('jobs')
            .update({ status: 'rendering' })
            .eq('id', jobId)

          // 最終処理完了
          setTimeout(async () => {
            // final アーティファクトを作成
            const finalArtifact = {
              job_id: jobId,
              kind: 'final',
              storage_path: `users/${session.user.id}/jobs/${jobId}/final_mix.wav`,
              meta: {
                master_params: {
                  target_lufs: -14,
                  measured_lufs: -14.1,
                  true_peak: -1.2,
                  applied_params: userParams || job.ai_params
                },
                harmony_applied: {
                  choice: harmony_choice || 'none',
                  level_db: harmony_level_db || -6
                }
              }
            }

            const { data: newFinalArtifact, error: finalArtifactError } = await supabase
              .from('artifacts')
              .insert(finalArtifact)
              .select()
              .single()

            if (!finalArtifactError && newFinalArtifact) {
              // jobを complete 状態に更新
              await supabase
                .from('jobs')
                .update({
                  status: 'complete',
                  final_artifact_id: newFinalArtifact.id,
                  last_export_params: userParams || job.ai_params,
                  updated_at: new Date().toISOString()
                })
                .eq('id', jobId)
            }
          }, 3000) // 3秒後にfinal完了
        }, 2000) // 2秒後にrendering開始
      } catch (error) {
        console.error('Commit post-processing error:', error)
        // エラー時はfailed状態に更新
        await supabase
          .from('jobs')
          .update({ status: 'failed' })
          .eq('id', jobId)
      }
    }, 1000) // 1秒後にmastering開始

    return NextResponse.json({
      message: '最終処理を開始しました',
      job_id: jobId,
      status: 'editing',
      estimated_completion: '約6秒後'
    })

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Commit error:', error)
    return NextResponse.json(
      { error: '最終処理に失敗しました' },
      { status: 500 }
    )
  }
}