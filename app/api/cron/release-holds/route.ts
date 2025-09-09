import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { CreditService } from '@/lib/credits'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * 期限切れクレジットホールドを解放するCronジョブ
 * 10分ごとに実行
 */
export async function GET(req: NextRequest) {
  try {
    // Vercel Cronの認証チェック
    const authHeader = headers().get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('Unauthorized cron request for release holds')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // クレジットサービスを使用して期限切れホールドを解放
    const creditService = new CreditService()
    const releasedCount = await creditService.releaseExpiredHolds()

    console.log(`Released ${releasedCount} expired credit holds`)

    return NextResponse.json({
      success: true,
      message: 'Expired holds released',
      releasedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Release holds cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}