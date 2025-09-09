import { NextRequest, NextResponse } from 'next/server'
import { unauthorized, handleApiError } from '../_lib/errors'
import { getSupabaseWithRLS } from '../_lib/auth'
import { checkRateLimit, addRateLimitHeaders } from '../_lib/ratelimit'

type Plan = "freetrial" | "prepaid" | "Light" | "Standard" | "Creator"
type Status = "UPLOADED"|"PREPPED"|"AI_MIX_OK"|"TWEAKING"|"MASTERING"|"REVIEW"|"DONE"|"ARCHIVED"

interface DashboardJob {
  id: string
  title: string
  status: Status
  plan: Plan
  createdAt: string
  updatedAt: string
  duration_s?: number
  instrumental_path?: string
  vocal_path?: string
  result_path?: string
}

const PLAN_DAYS: Record<Plan, number> = { 
  freetrial: 7,
  prepaid: 7,
  Light: 7, 
  Standard: 15, 
  Creator: 30 
}

function daysLeft(createdAtISO: string, plan: Plan): number {
  const created = new Date(createdAtISO).getTime()
  const expires = created + PLAN_DAYS[plan] * 86400000
  return Math.ceil((expires - Date.now()) / 86400000)
}

function isExpired(createdAt: string, plan: Plan): boolean {
  return daysLeft(createdAt, plan) < 0
}

function mapJobStatus(dbStatus: string): Status {
  const statusMap: Record<string, Status> = {
    'uploaded': 'UPLOADED',
    'analyzing': 'UPLOADED',
    'prepping': 'PREPPED',
    'prep_ready': 'PREPPED',
    'ai_mixing': 'AI_MIX_OK',
    'ai_ok': 'AI_MIX_OK',
    'editing': 'TWEAKING',
    'mastering': 'MASTERING',
    'rendering': 'REVIEW',
    'complete': 'DONE',
    'archived': 'ARCHIVED',
    'failed': 'ARCHIVED'
  }
  return statusMap[dbStatus] || 'UPLOADED'
}

function getPlanFromCode(planCode?: string): Plan {
  const planMap: Record<string, Plan> = {
    'freetrial': 'freetrial',
    'prepaid': 'prepaid',
    'lite': 'Light',
    'standard': 'Standard',
    'creator': 'Creator'
  }
  return planMap[planCode?.toLowerCase() || ''] || 'prepaid'
}

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

    // ユーザー認証チェック
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return unauthorized('ユーザー情報を取得できません')
    const uid = userRes.user.id

    // ユーザーのジョブを取得（カラムの存在を考慮）
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id, 
        status, 
        created_at, 
        updated_at, 
        instrumental_path, 
        vocal_path, 
        result_path,
        error
      `)
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })

    if (jobsError) {
      console.error('ジョブ取得エラー:', jobsError)
      // カラムが存在しない場合でも処理を続行
      if (jobsError.code === '42703') {
        console.warn('一部のカラムが存在しません。基本情報のみで続行します。')
        // 基本的なカラムのみで再試行
        const { data: basicJobs, error: basicError } = await supabase
          .from('jobs')
          .select('id, status, created_at, updated_at')
          .eq('user_id', uid)
          .order('updated_at', { ascending: false })
        
        if (basicError) {
          return handleApiError(basicError, 'ジョブ取得（基本）')
        }
        
        // 基本データを使用
        const dashboardJobs: DashboardJob[] = (basicJobs || []).map(job => ({
          id: job.id,
          title: `プロジェクト ${job.id.slice(0, 8)}`,
          status: mapJobStatus(job.status),
          plan: 'Light' as Plan,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        }))
        
        const activeJobs = dashboardJobs.filter(job => !isExpired(job.createdAt, job.plan))
        
        return NextResponse.json({
          projects: activeJobs,
          metrics: {
            totalJobs: activeJobs.length,
            activeJobs: activeJobs.filter(j => j.status !== "DONE" && j.status !== "ARCHIVED").length,
            completedJobs: activeJobs.filter(j => j.status === "DONE").length,
            aiOkJobs: activeJobs.filter(j => j.status === "AI_MIX_OK").length,
            soonExpireJobs: activeJobs.filter(j => daysLeft(j.createdAt, j.plan) <= 3).length
          },
          planInfo: {
            plan: 'Light' as Plan,
            status: 'none',
            credits: 0
          }
        })
      }
      return handleApiError(jobsError, 'ジョブ取得')
    }

    // ユーザーのサブスクリプション情報を取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code, status')
      .eq('user_id', uid)
      .single()

    // クレジット残高を取得（credit_ledgerテーブルから計算）
    const { data: creditLedger } = await supabase
      .from('credit_ledger')
      .select('credits')
      .eq('user_id', uid)
    
    const creditBalance = creditLedger?.reduce((sum, entry) => sum + (entry.credits || 0), 0) || 0

    // ジョブデータを変換（カラムの存在を考慮）
    const dashboardJobs: DashboardJob[] = (jobs || []).map(job => {
      // プランを決定（plan_codeが存在しない可能性を考慮）
      const plan = subscription?.plan_code 
        ? getPlanFromCode(subscription.plan_code)
        : 'Light' as Plan
      
      // ファイル名から曲名を生成
      let title = `プロジェクト ${job.id.slice(0, 8)}`
      if (job.vocal_path) {
        const fileName = job.vocal_path.split('/').pop()?.replace(/\.[^/.]+$/, '')
        if (fileName) {
          title = fileName
        }
      }

      return {
        id: job.id,
        title,
        status: mapJobStatus(job.status),
        plan,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        instrumental_path: job.instrumental_path,
        vocal_path: job.vocal_path,
        result_path: job.result_path
      }
    })

    // 期限切れでないジョブのみフィルタ
    const activeJobs = dashboardJobs.filter(job => !isExpired(job.createdAt, job.plan))

    // メトリクスを計算
    const metrics = {
      totalJobs: activeJobs.length,
      activeJobs: activeJobs.filter(j => j.status !== "DONE" && j.status !== "ARCHIVED").length,
      completedJobs: activeJobs.filter(j => j.status === "DONE").length,
      aiOkJobs: activeJobs.filter(j => j.status === "AI_MIX_OK").length,
      soonExpireJobs: activeJobs.filter(j => daysLeft(j.createdAt, j.plan) <= 3).length
    }

    // 現在のプラン情報
    const currentPlan = getPlanFromCode(subscription?.plan_code)
    const planInfo = {
      plan: currentPlan,
      status: subscription?.status || 'none',
      credits: creditBalance || 0
    }

    const response = NextResponse.json({
      projects: activeJobs,
      metrics,
      planInfo
    })

    // レート制限ヘッダー追加
    return addRateLimitHeaders(response, req)
  } catch (error) {
    return handleApiError(error, 'ダッシュボード取得')
  }
}