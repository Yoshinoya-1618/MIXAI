import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアントの作成（サービスロールキー使用）
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 認証チェック（cronまたは管理者のみ実行可能）
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
      // 通常のユーザー認証もチェック
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
        authHeader?.replace('Bearer ', '') ?? ''
      )
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // 管理者権限チェック
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // 期限切れトライアルの取得
    const now = new Date().toISOString()
    const { data: expiredTrials, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('user_id, trial_ends_at')
      .eq('plan_code', 'freetrial')
      .eq('status', 'trialing')
      .lt('trial_ends_at', now)

    if (fetchError) {
      console.error('Failed to fetch expired trials:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired trials', details: fetchError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No expired trials found',
          processed: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${expiredTrials.length} expired trials to process`)

    let processedCount = 0
    const errors: any[] = []

    // 各トライアルユーザーを処理
    for (const trial of expiredTrials) {
      try {
        // トランザクション的な処理
        // 1. サブスクリプションをprepaidに変更
        const { error: updateSubError } = await supabaseClient
          .from('subscriptions')
          .update({
            plan_code: 'prepaid',
            status: 'none',
            trial_ends_at: null,
            updated_at: now
          })
          .eq('user_id', trial.user_id)

        if (updateSubError) {
          throw updateSubError
        }

        // 2. トライアルクレジットの残高を取得
        const { data: creditBalance, error: creditError } = await supabaseClient
          .from('credit_ledger')
          .select('amount')
          .eq('user_id', trial.user_id)
          .eq('bucket', 'trial')

        if (creditError) {
          console.error(`Failed to get credit balance for user ${trial.user_id}:`, creditError)
        }

        const trialCredits = creditBalance?.reduce((sum, entry) => sum + entry.amount, 0) || 0

        // 3. トライアルクレジットを失効（残高がある場合）
        if (trialCredits > 0) {
          // 現在の総残高を取得
          const { data: totalBalance } = await supabaseClient
            .from('credit_ledger')
            .select('amount')
            .eq('user_id', trial.user_id)

          const totalCredits = totalBalance?.reduce((sum, entry) => sum + entry.amount, 0) || 0
          const newBalance = Math.max(0, totalCredits - trialCredits)

          // クレジット失効エントリを追加
          const { error: expireError } = await supabaseClient
            .from('credit_ledger')
            .insert({
              user_id: trial.user_id,
              amount: -trialCredits,
              balance_after: newBalance,
              type: 'expire',
              bucket: 'trial',
              description: '無料トライアル期限切れによる失効',
              created_at: now
            })

          if (expireError) {
            console.error(`Failed to expire credits for user ${trial.user_id}:`, expireError)
            throw expireError
          }
        }

        // 4. プロファイルのトライアル消費フラグを更新
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({
            trial_consumed: true,
            updated_at: now
          })
          .eq('id', trial.user_id)

        if (profileError) {
          console.error(`Failed to update profile for user ${trial.user_id}:`, profileError)
          // プロファイル更新エラーは致命的ではないので続行
        }

        // 5. 通知メールを送信（オプション）
        // TODO: SendGridやResendなどのメール送信サービスを統合
        
        processedCount++
        console.log(`Successfully processed trial for user ${trial.user_id}`)
      } catch (error) {
        console.error(`Failed to process trial for user ${trial.user_id}:`, error)
        errors.push({
          user_id: trial.user_id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // 処理結果のログを記録
    const { error: logError } = await supabaseClient
      .from('system_logs')
      .insert({
        type: 'trial_expiration',
        message: `Processed ${processedCount} expired trials`,
        metadata: {
          total: expiredTrials.length,
          processed: processedCount,
          errors: errors.length,
          error_details: errors
        },
        created_at: now
      })

    if (logError) {
      console.error('Failed to log processing result:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedCount} of ${expiredTrials.length} expired trials`,
        processed: processedCount,
        total: expiredTrials.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Trial expiration process error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})