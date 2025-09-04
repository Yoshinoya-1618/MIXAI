// app/api/v1/credits/purchase/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../_lib/auth'
import { ApiError, errorResponse } from '../../../_lib/errors'
import { validateJson } from '../../../_lib/json'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PurchaseCreditsSchema = z.object({
  credits: z.number().min(0.5).max(50),
  reason: z.string().optional()
})

// POST /v1/credits/purchase - 追加クレジット単発購入
export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)
    const body = await validateJson(request, PurchaseCreditsSchema)

    const creditPrice = parseInt(process.env.ADDON_CREDIT_PRICE_JPY || '300')
    const totalPrice = Math.round(body.credits * creditPrice)

    // TODO: Stripe決済処理をここに実装
    // 今は仮実装として直接クレジットを付与

    // クレジット付与
    const { data: creditEntry, error } = await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        event: 'purchase',
        credits: body.credits,
        reason: body.reason || `Purchased ${body.credits} credits (¥${totalPrice})`
      })
      .select()
      .single()

    if (error) {
      throw new ApiError(500, error.message)
    }

    // 現在の残高を取得
    const { data: balance } = await supabase
      .rpc('get_credit_balance', { user_uuid: userId })

    return Response.json({
      purchase: {
        id: creditEntry.id,
        credits: body.credits,
        price_jpy: totalPrice,
        new_balance: balance || 0
      }
    })

  } catch (error) {
    return errorResponse(500, { code: 'credit_purchase_error', message: 'クレジット購入に失敗しました', details: error })
  }
}