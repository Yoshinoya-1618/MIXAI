// app/api/v1/user/files/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseWithRLS } from '../../../_lib/auth'
import { unauthorized, handleApiError } from '../../../_lib/errors'
import { checkRateLimit, addRateLimitHeaders } from '../../../_lib/ratelimit'

// プラン別保存期間（Edge Functionと同期）
const RETENTION_DAYS = {
  lite: 7,      // 無料プラン: 7日
  standard: 30, // Standardプラン: 30日  
  creator: 90   // Creatorプラン: 90日
}

// GET /v1/user/files - ユーザーのファイル一覧と削除予定日
export async function GET(req: NextRequest) {
  // レート制限チェック
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    let supabase
    try {
      supabase = getSupabaseWithRLS(req)
    } catch (resp: any) {
      return resp
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return unauthorized('ユーザー情報を取得できません')
    const uid = userRes.user.id

    // ユーザーの現在のプランを取得
    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: uid })
      .maybeSingle()

    const currentPlan = (subscription as any)?.plan_code || 'lite'
    const retentionDays = RETENTION_DAYS[currentPlan as keyof typeof RETENTION_DAYS] || 7

    // ユーザーのジョブ一覧を取得
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        instrumental_path,
        vocal_path,
        result_path
      `)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
    }

    // 各ジョブの削除予定日と残り日数を計算
    const jobsWithExpiration = jobs?.map(job => {
      const createdDate = new Date(job.created_at)
      const expirationDate = new Date(createdDate)
      expirationDate.setDate(expirationDate.getDate() + retentionDays)
      
      const now = new Date()
      const remainingDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      const isExpired = remainingDays <= 0
      const isNearExpiration = remainingDays <= 3 && remainingDays > 0

      return {
        ...job,
        expirationDate: expirationDate.toISOString(),
        remainingDays: Math.max(0, remainingDays),
        isExpired,
        isNearExpiration,
        hasFiles: !!(job.instrumental_path || job.vocal_path || job.result_path),
        retentionDays
      }
    }) || []

    // 統計情報
    const stats = {
      totalJobs: jobsWithExpiration.length,
      activeJobs: jobsWithExpiration.filter(job => !job.isExpired).length,
      expiredJobs: jobsWithExpiration.filter(job => job.isExpired).length,
      nearExpirationJobs: jobsWithExpiration.filter(job => job.isNearExpiration).length,
      currentPlan,
      retentionDays
    }

    const response = NextResponse.json({
      jobs: jobsWithExpiration,
      stats,
      planInfo: {
        code: currentPlan,
        retentionDays,
        description: getPlanDescription(currentPlan)
      }
    })

    return addRateLimitHeaders(response, req)

  } catch (error) {
    return handleApiError(error, 'ユーザーファイル取得')
  }
}

/**
 * プラン説明文取得
 */
function getPlanDescription(planCode: string): string {
  switch (planCode) {
    case 'lite':
      return '無料プラン - ファイルは7日間保存されます'
    case 'standard':
      return 'Standardプラン - ファイルは30日間保存されます'
    case 'creator':
      return 'Creatorプラン - ファイルは90日間保存されます'
    default:
      return 'ファイル保存期間についてはプランをご確認ください'
  }
}