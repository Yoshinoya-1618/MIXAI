import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase Admin Client（サーバーサイド用）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    // Cronジョブの認証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const results = {
      deletedFiles: 0,
      deletedJobs: 0,
      deletedPreviews: 0,
      cleanedStorage: 0,
      errors: [] as string[]
    }

    // 1. 期限切れファイルの削除（scheduled_deletion_atが過去のもの）
    const { data: expiredFiles, error: filesError } = await supabaseAdmin
      .from('vault')
      .select('*')
      .lte('scheduled_deletion_at', now.toISOString())
      .is('deleted_at', null)

    if (filesError) {
      results.errors.push(`Failed to fetch expired files: ${filesError.message}`)
    } else if (expiredFiles && expiredFiles.length > 0) {
      // ストレージから実際のファイルを削除
      for (const file of expiredFiles) {
        try {
          // ファイルパスからバケット名とパスを抽出
          const pathParts = file.file_path.split('/')
          const bucket = pathParts[0]
          const path = pathParts.slice(1).join('/')
          
          const { error: deleteError } = await supabaseAdmin.storage
            .from(bucket)
            .remove([path])
          
          if (!deleteError) {
            // データベースレコードを削除済みとしてマーク
            await supabaseAdmin
              .from('vault')
              .update({ 
                deleted_at: now.toISOString(),
                scheduled_deletion_at: null
              })
              .eq('id', file.id)
            
            results.deletedFiles++
            results.cleanedStorage += file.file_size || 0
          }
        } catch (error) {
          results.errors.push(`Failed to delete file ${file.id}: ${error}`)
        }
      }
    }

    // 2. 古いジョブデータの削除（保持ポリシーに基づく）
    const { data: retentionPolicies } = await supabaseAdmin
      .from('retention_policies')
      .select('*')
      .eq('is_active', true)
      .eq('entity_type', 'job')

    if (retentionPolicies && retentionPolicies.length > 0) {
      for (const policy of retentionPolicies) {
        const cutoffDate = new Date(now.getTime() - (policy.retention_days * 24 * 60 * 60 * 1000))
        
        // 条件に基づいてジョブを選択
        let query = supabaseAdmin
          .from('jobs')
          .select('*')
          .lte('created_at', cutoffDate.toISOString())

        // ポリシーの条件を適用
        if (policy.conditions?.status) {
          query = query.eq('status', policy.conditions.status)
        }
        if (policy.conditions?.plan) {
          query = query.eq('plan', policy.conditions.plan)
        }

        const { data: oldJobs, error: jobsError } = await query

        if (jobsError) {
          results.errors.push(`Failed to fetch old jobs: ${jobsError.message}`)
        } else if (oldJobs && oldJobs.length > 0) {
          for (const job of oldJobs) {
            try {
              // 関連ファイルを削除
              const filePaths = [
                job.inst_path,
                job.vocal_path,
                job.master_path,
                job.preview_path
              ].filter(Boolean)

              for (const filePath of filePaths) {
                try {
                  const pathParts = filePath.split('/')
                  const bucket = pathParts[0]
                  const path = pathParts.slice(1).join('/')
                  
                  await supabaseAdmin.storage
                    .from(bucket)
                    .remove([path])
                } catch (error) {
                  // ファイル削除エラーは無視（既に削除されている可能性）
                }
              }

              // ジョブレコードを削除
              await supabaseAdmin
                .from('jobs')
                .delete()
                .eq('id', job.id)

              results.deletedJobs++
            } catch (error) {
              results.errors.push(`Failed to delete job ${job.id}: ${error}`)
            }
          }
        }
      }
    }

    // 3. 一時プレビューファイルの削除（24時間以上経過）
    const previewCutoff = new Date(now.getTime() - (24 * 60 * 60 * 1000))
    
    try {
      const { data: previewFiles } = await supabaseAdmin.storage
        .from('previews')
        .list('temp', {
          limit: 100
        })

      if (previewFiles && previewFiles.length > 0) {
        const filesToDelete = previewFiles
          .filter(file => {
            const createdAt = new Date(file.created_at)
            return createdAt < previewCutoff
          })
          .map(file => `temp/${file.name}`)

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabaseAdmin.storage
            .from('previews')
            .remove(filesToDelete)

          if (!deleteError) {
            results.deletedPreviews = filesToDelete.length
          }
        }
      }
    } catch (error) {
      results.errors.push(`Failed to clean preview files: ${error}`)
    }

    // 4. 監査ログのアーカイブ（90日以上前のログ）
    const auditCutoff = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
    
    try {
      // 古い監査ログを取得
      const { data: oldLogs, error: logsError } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .lte('created_at', auditCutoff.toISOString())
        .limit(1000)

      if (!logsError && oldLogs && oldLogs.length > 0) {
        // アーカイブテーブルに移動（実装が必要な場合）
        // ここでは単純に削除
        const { error: deleteError } = await supabaseAdmin
          .from('audit_logs')
          .delete()
          .lte('created_at', auditCutoff.toISOString())

        if (deleteError) {
          results.errors.push(`Failed to archive audit logs: ${deleteError.message}`)
        }
      }
    } catch (error) {
      results.errors.push(`Failed to process audit logs: ${error}`)
    }

    // 5. 削除されたユーザーのデータクリーンアップ
    try {
      const { data: deletedUsers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('deleted', true)
        .lte('deleted_at', new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString())

      if (deletedUsers && deletedUsers.length > 0) {
        for (const user of deletedUsers) {
          // ユーザーの全データを削除
          await supabaseAdmin.from('jobs').delete().eq('user_id', user.id)
          await supabaseAdmin.from('vault').delete().eq('user_id', user.id)
          await supabaseAdmin.from('feedback').delete().eq('user_id', user.id)
          // プロファイルを完全削除
          await supabaseAdmin.from('profiles').delete().eq('id', user.id)
        }
      }
    } catch (error) {
      results.errors.push(`Failed to clean deleted user data: ${error}`)
    }

    // クリーンアップ結果を監査ログに記録
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: 'system',
        action: 'system:cleanup',
        metadata: {
          ...results,
          executed_at: now.toISOString()
        }
      })

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      results: {
        ...results,
        cleanedStorageGB: (results.cleanedStorage / (1024 * 1024 * 1024)).toFixed(2)
      },
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Cleanup cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GETリクエストも処理（ヘルスチェック用）
export async function GET(request: Request) {
  // Cronジョブの認証
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    status: 'ready',
    service: 'cleanup-cron',
    timestamp: new Date().toISOString()
  })
}