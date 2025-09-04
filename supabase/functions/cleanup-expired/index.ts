// Edge Function: 7日以上経過したファイルとジョブを自動削除
// 実行頻度: 毎日3:00 JST (cron schedule)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  RETENTION_DAYS: string
}

// プラン別保存期間
const RETENTION_DAYS = {
  lite: 7,      // 無料プラン: 7日
  standard: 30, // Standardプラン: 30日  
  creator: 90   // Creatorプラン: 90日
}

// 期限切れファイルの削除（プラン別対応）
async function deleteExpiredFiles(supabase: any, defaultRetentionDays: number) {
  console.log(`Starting plan-based file cleanup`)

  let totalDeletedJobs = 0
  let totalDeletedFiles = 0

  // プラン別に期限切れジョブを処理
  for (const [planCode, retentionDays] of Object.entries(RETENTION_DAYS)) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    console.log(`Processing ${planCode} plan: deleting files older than ${cutoffDate.toISOString()}`)

    // プラン別期限切れジョブを検索
    let query = supabase
      .from('jobs')
      .select(`
        id, user_id, instrumental_path, vocal_path, result_path, created_at,
        profiles!inner(subscriptions!left(plan_code))
      `)
      .lt('created_at', cutoffDate.toISOString())

    if (planCode === 'lite') {
      // 無料ユーザー（サブスクリプションがないまたは期限切れ）
      query = query.or('subscriptions.plan_code.is.null,subscriptions.status.neq.active', { foreignTable: 'profiles.subscriptions' })
    } else {
      // 有料プラン
      query = query
        .eq('profiles.subscriptions.plan_code', planCode)
        .eq('profiles.subscriptions.status', 'active')
    }

    const { data: expiredJobs, error: jobsError } = await query

    if (jobsError) {
      console.error(`Error fetching expired jobs for ${planCode}:`, jobsError)
      continue
    }

    if (!expiredJobs || expiredJobs.length === 0) {
      console.log(`No expired jobs found for ${planCode} plan`)
      continue
    }

    console.log(`Found ${expiredJobs.length} expired jobs for ${planCode} plan`)

    // ファイル削除処理
    const { deletedFiles } = await deleteJobFiles(supabase, expiredJobs)
    
    // ジョブレコード削除
    const jobIds = expiredJobs.map(job => job.id)
    const { error: deleteJobsError } = await supabase
      .from('jobs')
      .delete()
      .in('id', jobIds)

    if (deleteJobsError) {
      console.error(`Error deleting job records for ${planCode}:`, deleteJobsError)
    } else {
      totalDeletedJobs += expiredJobs.length
      totalDeletedFiles += deletedFiles
    }
  }

  console.log(`Plan-based cleanup completed: ${totalDeletedJobs} jobs, ${totalDeletedFiles} files deleted`)

  return { 
    deletedJobs: totalDeletedJobs, 
    deletedFiles: totalDeletedFiles,
    planBreakdown: RETENTION_DAYS
  }
}

// ジョブファイル削除処理
async function deleteJobFiles(supabase: any, jobs: any[]) {
  let deletedFiles = 0
  const deletePromises: Promise<any>[] = []

  for (const job of jobs) {
    // 入力ファイル削除（uta-uploads）
    if (job.instrumental_path) {
      const instPath = job.instrumental_path.replace('uta-uploads/', '')
      deletePromises.push(
        supabase.storage
          .from('uta-uploads')
          .remove([instPath])
          .then((result: any) => {
            if (result.error) {
              console.warn(`Failed to delete instrumental file: ${instPath}`, result.error)
            } else {
              deletedFiles++
              console.log(`Deleted instrumental: ${instPath}`)
            }
          })
      )
    }

    if (job.vocal_path) {
      const vocalPath = job.vocal_path.replace('uta-uploads/', '')
      deletePromises.push(
        supabase.storage
          .from('uta-uploads')
          .remove([vocalPath])
          .then((result: any) => {
            if (result.error) {
              console.warn(`Failed to delete vocal file: ${vocalPath}`, result.error)
            } else {
              deletedFiles++
              console.log(`Deleted vocal: ${vocalPath}`)
            }
          })
      )
    }

    // 結果ファイル削除（uta-results）
    if (job.result_path) {
      const resultPath = job.result_path.replace('uta-results/', '')
      deletePromises.push(
        supabase.storage
          .from('uta-results')
          .remove([resultPath])
          .then((result: any) => {
            if (result.error) {
              console.warn(`Failed to delete result file: ${resultPath}`, result.error)
            } else {
              deletedFiles++
              console.log(`Deleted result: ${resultPath}`)
            }
          })
      )
    }
  }

  // 全ファイル削除を並行実行
  await Promise.allSettled(deletePromises)

  return { deletedFiles }
}

// 期限切れIdempotencyキーの削除
async function deleteExpiredIdempotencyKeys(supabase: any) {
  console.log('Cleaning up expired idempotency keys')

  const { error } = await supabase
    .from('idempotency_keys')
    .delete()
    .lt('expires_at', new Date().toISOString())

  if (error) {
    console.error('Error deleting expired idempotency keys:', error)
    return { error: error.message }
  }

  console.log('Expired idempotency keys cleaned up')
  return { success: true }
}

// 期限切れクレジット履歴の削除（90日以上古い）
async function deleteExpiredCreditHistory(supabase: any) {
  console.log('Cleaning up old credit history (90+ days)')

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)

  const { error } = await supabase
    .from('credit_ledger')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .in('event', ['consume', 'rollback']) // 消費・ロールバック履歴のみ削除（付与・購入は保持）

  if (error) {
    console.error('Error deleting old credit history:', error)
    return { error: error.message }
  }

  console.log('Old credit history cleaned up')
  return { success: true }
}

Deno.serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const env = Deno.env.toObject() as Env
    
    // 環境変数チェック
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const retentionDays = parseInt(env.RETENTION_DAYS || '7')
    
    // Service Roleでクライアント作成
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log(`Starting cleanup process with ${retentionDays} days retention`)

    // 期限切れファイルとジョブを削除
    const fileCleanupResult = await deleteExpiredFiles(supabase, retentionDays)
    
    // 期限切れIdempotencyキーを削除
    const idempotencyCleanupResult = await deleteExpiredIdempotencyKeys(supabase)
    
    // 期限切れクレジット履歴を削除
    const creditHistoryCleanupResult = await deleteExpiredCreditHistory(supabase)

    // 結果レスポンス
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      retention_days: retentionDays,
      file_cleanup: fileCleanupResult,
      idempotency_cleanup: idempotencyCleanupResult,
      credit_history_cleanup: creditHistoryCleanupResult
    }

    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Cleanup function error:', error)
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})