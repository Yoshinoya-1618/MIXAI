/**
 * Cronジョブ設定スクリプト
 * 
 * このスクリプトは、Vercel Cron JobsまたはSupabase Edge Functionsの
 * Cronジョブを設定するための参考実装です。
 * 
 * 使用方法:
 * 1. Vercel Cron Jobs: vercel.jsonに設定を追加
 * 2. Supabase Edge Functions: supabase/functions/にファンクションを作成
 * 3. 外部Cronサービス: cron-job.org, cronitor.io等を使用
 */

// Vercel Cron Jobs設定例（vercel.jsonに追加）
export const vercelCronConfig = {
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"  // 毎日午前3時（UTC）
    },
    {
      "path": "/api/cron/stats",
      "schedule": "0 */6 * * *"  // 6時間ごと
    },
    {
      "path": "/api/cron/backup",
      "schedule": "0 0 * * 0"  // 毎週日曜日の午前0時
    }
  ]
}

// Supabase Edge Functions Cron設定例
export const supabaseCronSQL = `
-- Supabase pg_cron extension を使用した定期ジョブの設定

-- 1. 拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. クリーンアップジョブを作成
SELECT cron.schedule(
  'cleanup-expired-files',
  '0 3 * * *',  -- 毎日午前3時
  $$
    UPDATE vault 
    SET deleted_at = NOW() 
    WHERE scheduled_deletion_at < NOW() 
    AND deleted_at IS NULL;
  $$
);

-- 3. 統計更新ジョブを作成
SELECT cron.schedule(
  'update-statistics',
  '0 */6 * * *',  -- 6時間ごと
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY job_statistics;
  $$
);

-- 4. 古い監査ログのアーカイブ
SELECT cron.schedule(
  'archive-audit-logs',
  '0 0 * * 0',  -- 毎週日曜日
  $$
    INSERT INTO audit_logs_archive
    SELECT * FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ジョブの一覧を確認
SELECT * FROM cron.job;

-- ジョブを削除する場合
-- SELECT cron.unschedule('cleanup-expired-files');
`

// 環境変数設定例
export const requiredEnvVars = {
  // Cronジョブ認証用シークレット
  CRON_SECRET: 'your-secure-random-string-here',
  
  // Supabase Service Role Key（管理者権限）
  SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
  
  // その他の必要な環境変数
  NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key'
}

// Cronジョブのテスト用スクリプト
export async function testCronJob(jobPath: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    throw new Error('CRON_SECRET is not set')
  }
  
  try {
    const response = await fetch(`${baseUrl}${jobPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Cron job executed successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to execute cron job:', error)
    throw error
  }
}

// 使用例
if (require.main === module) {
  // CLIから直接実行された場合
  const jobPath = process.argv[2] || '/api/cron/cleanup'
  
  testCronJob(jobPath)
    .then(result => {
      console.log('Test completed:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('Test failed:', error)
      process.exit(1)
    })
}

export default {
  vercelCronConfig,
  supabaseCronSQL,
  requiredEnvVars,
  testCronJob
}