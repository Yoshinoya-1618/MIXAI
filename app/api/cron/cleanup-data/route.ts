import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * データ自動削除のCronジョブエンドポイント
 * 毎日午前3時（UTC）に実行
 */
export async function GET(req: NextRequest) {
  try {
    // Vercel Cronの認証チェック
    const authHeader = headers().get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('Unauthorized cron request for data cleanup')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Supabase Edge Functionを呼び出し
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cleanup-expired-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString()
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Edge function error:', error)
      return NextResponse.json(
        { error: 'Edge function failed', details: error },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('Data cleanup result:', result)

    return NextResponse.json({
      success: true,
      message: 'Data cleanup completed',
      ...result
    })
  } catch (error) {
    console.error('Data cleanup cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}