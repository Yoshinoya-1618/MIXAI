-- ================================================
-- Cron jobs setup for automated tasks
-- Version: 1.0.0
-- Date: 2025-01-09
-- ================================================

-- pg_cronエクステンションを有効化（Supabase Proプラン以上で利用可能）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 注意: pg_cronはSupabase Proプラン以上で利用可能です。
-- 無料プランの場合は、以下の代替方法を使用してください：
-- 1. GitHub Actions
-- 2. Vercel Cron Jobs
-- 3. 外部のcronサービス

-- pg_cronが利用可能な場合のジョブ設定例：
/*
-- トライアル期限切れ処理（毎日午前2時に実行）
SELECT cron.schedule(
  'expire-trials',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 古いログのクリーンアップ（毎週日曜日午前3時に実行）
SELECT cron.schedule(
  'cleanup-logs',
  '0 3 * * 0',
  'SELECT cleanup_old_logs();'
);

-- アーティファクトの期限切れ削除（毎日午前4時に実行）
SELECT cron.schedule(
  'cleanup-expired-artifacts',
  '0 4 * * *',
  $$
  DELETE FROM artifacts
  WHERE expires_at < NOW();
  $$
);
*/

-- ================================================
-- 代替案: GitHub Actionsを使用する場合
-- ================================================
-- .github/workflows/cron-jobs.yml ファイルを作成して以下の内容を記述：

/*
name: Scheduled Jobs

on:
  schedule:
    # 毎日午前2時（UTC）に実行
    - cron: '0 2 * * *'
  workflow_dispatch: # 手動実行も可能

jobs:
  expire-trials:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{}'
*/

-- ================================================
-- 代替案: Vercel Cron Jobsを使用する場合
-- ================================================
-- vercel.json に以下を追加：

/*
{
  "crons": [
    {
      "path": "/api/cron/expire-trials",
      "schedule": "0 2 * * *"
    }
  ]
}
*/

-- そして /api/cron/expire-trials/route.ts を作成

-- ================================================
-- 環境変数の設定（.env.local）
-- ================================================
-- CRON_SECRET=your-secure-random-string-here
-- この値をSupabase DashboardのEdge Function環境変数にも設定してください