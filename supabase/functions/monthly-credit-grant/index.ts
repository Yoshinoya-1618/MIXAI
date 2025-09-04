// Monthly Credit Grant Edge Function
// Called monthly to grant credits to active subscribers

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

serve(async (req: Request) => {
  try {
    const env = Deno.env.toObject() as Env
    
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 現在アクティブなサブスクリプションを取得
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, plan_code, status,
        current_period_start, current_period_end,
        plans!inner (monthly_credits, name)
      `)
      .eq('status', 'active')
      .lte('current_period_end', new Date().toISOString())

    if (subscriptionError) {
      throw subscriptionError
    }

    let processedCount = 0
    const results = []

    for (const subscription of subscriptions || []) {
      try {
        // クレジット付与
        const { error: grantError } = await supabase
          .from('credit_ledger')
          .insert({
            user_id: subscription.user_id,
            event: 'grant',
            credits: subscription.plans.monthly_credits,
            reason: `Monthly credits for ${subscription.plans.name} plan - ${new Date().toISOString().slice(0, 7)}`
          })

        if (grantError) {
          console.error('Failed to grant credits:', grantError)
          results.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            status: 'error',
            error: grantError.message
          })
          continue
        }

        // サブスクリプション期間を更新
        const nextPeriodStart = new Date(subscription.current_period_end)
        const nextPeriodEnd = new Date(nextPeriodStart)
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            current_period_start: nextPeriodStart.toISOString(),
            current_period_end: nextPeriodEnd.toISOString()
          })
          .eq('id', subscription.id)

        if (updateError) {
          console.error('Failed to update subscription period:', updateError)
          results.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            status: 'partial_error',
            error: updateError.message
          })
          continue
        }

        results.push({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          status: 'success',
          credits_granted: subscription.plans.monthly_credits
        })
        processedCount++

      } catch (error) {
        console.error('Error processing subscription:', error)
        results.push({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed_subscriptions: processedCount,
      total_subscriptions: subscriptions?.length || 0,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Monthly credit grant failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})