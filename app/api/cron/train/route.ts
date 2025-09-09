// app/api/cron/train/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scheduleTrainingJobs } from '../../../../worker/training'

// Vercel Cronジョブ用エンドポイント
export async function GET(request: NextRequest) {
  try {
    // Cronシークレットの検証（Vercel環境の場合）
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('🎓 Starting scheduled ML training')

    // サービスロールキーを使用してSupabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 各タスクのデータ数を確認
    const tasks = ['master_reg', 'preset_cls', 'align_conf'] as const
    const results = []

    for (const task of tasks) {
      // データ数の確認
      const { count, error } = await supabase
        .from('labels')
        .select('*', { count: 'exact', head: true })
        .eq('task', task)
        .eq('quality', 'auto')

      if (error) {
        console.error(`Failed to count data for ${task}:`, error)
        continue
      }

      console.log(`Task ${task}: ${count} samples available`)

      // 十分なデータがある場合は学習ジョブを作成
      if (count && count >= 1000) {
        const { data: job, error: jobError } = await supabase
          .from('training_jobs')
          .insert({
            task,
            status: 'pending',
            config: {
              hyperparameters: {
                learningRate: 0.001,
                maxIterations: 1000,
                regularization: 0.01,
                validationSplit: 0.2
              }
            }
          })
          .select()
          .single()

        if (jobError) {
          console.error(`Failed to create job for ${task}:`, jobError)
          continue
        }

        results.push({
          task,
          jobId: job.id,
          samples: count,
          status: 'scheduled'
        })

        console.log(`✅ Created training job ${job.id} for ${task}`)
      } else {
        results.push({
          task,
          samples: count,
          status: 'skipped',
          reason: 'insufficient_data'
        })
      }
    }

    // クリーンアップ：古いモデルメトリクスを削除（30日以上前）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error: cleanupError } = await supabase
      .from('model_metrics')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (cleanupError) {
      console.error('Failed to cleanup old metrics:', cleanupError)
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      nextRun: getNextSundayAt3AM()
    })

  } catch (error) {
    console.error('Cron job failed:', error)
    return Response.json({ 
      error: 'Training job failed',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}

function getNextSundayAt3AM(): string {
  const now = new Date()
  const nextSunday = new Date(now)
  
  // 次の日曜日を見つける
  nextSunday.setDate(now.getDate() + (7 - now.getDay()))
  nextSunday.setHours(3, 0, 0, 0)
  
  // もし今が日曜日の3時以降なら、次の週の日曜日
  if (now.getDay() === 0 && now.getHours() >= 3) {
    nextSunday.setDate(nextSunday.getDate() + 7)
  }
  
  return nextSunday.toISOString()
}