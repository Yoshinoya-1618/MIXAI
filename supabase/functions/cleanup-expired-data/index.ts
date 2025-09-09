import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * データ保存期間の自動削除
 * プラン別: freetrial/prepaid/Lite 7日, Standard 15日, Creator 30日
 */
serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 認証チェック（Cronジョブからの呼び出し）
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabaseクライアント初期化（サービスロール）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const results = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    }

    // プラン別の保存期間（日数）
    const retentionDays = {
      freetrial: 7,
      prepaid: 7,
      lite: 7,
      standard: 15,
      creator: 30
    }

    // 期限切れジョブを取得
    const { data: expiredJobs, error: fetchError } = await supabase
      .from('jobs')
      .select(`
        id,
        user_id,
        status,
        created_at,
        instrumental_path,
        vocal_path,
        harmony_path,
        output_path,
        preview_path,
        subscriptions!inner (
          plan_code
        )
      `)
      .eq('status', 'completed')
      .not('deleted_at', 'is', null)

    if (fetchError) {
      console.error('Failed to fetch expired jobs:', fetchError)
      results.errors.push(`Fetch error: ${fetchError.message}`)
      return new Response(
        JSON.stringify(results),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 各ジョブをチェックして削除
    for (const job of expiredJobs || []) {
      try {
        const planCode = job.subscriptions[0]?.plan_code || 'prepaid'
        const retention = retentionDays[planCode as keyof typeof retentionDays] || 7
        const expiryDate = new Date(job.created_at)
        expiryDate.setDate(expiryDate.getDate() + retention)

        if (now > expiryDate) {
          // ストレージからファイルを削除
          const filesToDelete = [
            job.instrumental_path,
            job.vocal_path,
            job.harmony_path,
            job.output_path,
            job.preview_path
          ].filter(Boolean)

          for (const filePath of filesToDelete) {
            const bucket = filePath.includes('public/') ? 'public' : 'audio-files'
            const path = filePath.replace(/^(public|audio-files)\//, '')
            
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove([path])

            if (deleteError) {
              console.error(`Failed to delete file ${path}:`, deleteError)
              results.errors.push(`File deletion error: ${path}`)
            } else {
              results.deletedFiles++
            }
          }

          // ジョブレコードを更新（物理削除はしない）
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              deleted_at: now.toISOString(),
              instrumental_path: null,
              vocal_path: null,
              harmony_path: null,
              output_path: null,
              preview_path: null,
              deletion_reason: 'expired'
            })
            .eq('id', job.id)

          if (updateError) {
            console.error(`Failed to update job ${job.id}:`, updateError)
            results.errors.push(`Job update error: ${job.id}`)
          } else {
            results.deletedJobs++
          }

          // システムログに記録
          await supabase
            .from('system_logs')
            .insert({
              type: 'data_cleanup',
              message: `Deleted expired job data: ${job.id}`,
              metadata: {
                job_id: job.id,
                user_id: job.user_id,
                plan_code: planCode,
                retention_days: retention,
                files_deleted: filesToDelete.length
              }
            })
        }
      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError)
        results.errors.push(`Job ${job.id}: ${jobError.message}`)
      }
    }

    // アーティファクトの期限切れ削除
    const { data: expiredArtifacts, error: artifactError } = await supabase
      .from('artifacts')
      .select('id, file_path')
      .lt('expires_at', now.toISOString())

    if (!artifactError && expiredArtifacts) {
      for (const artifact of expiredArtifacts) {
        try {
          // ファイル削除
          if (artifact.file_path) {
            const { error: deleteError } = await supabase.storage
              .from('artifacts')
              .remove([artifact.file_path])

            if (!deleteError) {
              results.deletedFiles++
            }
          }

          // レコード削除
          await supabase
            .from('artifacts')
            .delete()
            .eq('id', artifact.id)

        } catch (error) {
          console.error(`Error deleting artifact ${artifact.id}:`, error)
        }
      }
    }

    // 結果を返す
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        ...results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})