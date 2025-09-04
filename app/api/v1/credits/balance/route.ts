// app/api/v1/credits/balance/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../_lib/auth'
import { errorResponse } from '../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /v1/credits/balance - 現在のクレジット残高取得
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)

    const { data: balance } = await supabase
      .rpc('get_credit_balance', { user_uuid: userId })

    return Response.json({
      balance: balance || 0
    })

  } catch (error) {
    return errorResponse(500, { code: 'credit_balance_error', message: 'クレジット残高の取得に失敗しました', details: error })
  }
}