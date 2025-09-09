import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_DAYS = {
  Light: 7,
  Standard: 15,
  Creator: 30
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const excludeExpired = searchParams.get('excludeExpired') !== 'false'

    // プロジェクトの取得
    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    const { data: projects, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    // RemixSessionの取得
    const projectIds = projects?.map(p => p.id) || []
    const { data: remixSessions } = await supabase
      .from('remix_sessions')
      .select('*')
      .in('project_id', projectIds)
      .gte('expires_at', new Date().toISOString())

    // プロジェクトデータの整形
    const now = new Date()
    const formattedProjects = projects?.map(project => {
      const createdAt = new Date(project.created_at)
      const plan = project.plan as keyof typeof PLAN_DAYS
      const expiresAt = new Date(createdAt.getTime() + PLAN_DAYS[plan] * 24 * 60 * 60 * 1000)
      const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const isExpired = remainingDays < 0
      const isNearExpiration = remainingDays <= 3 && remainingDays >= 0

      // RemixSessionの情報
      const remixSession = remixSessions?.find(s => s.project_id === project.id)
      const hasRemixSession = !!remixSession
      const remixSessionRemainingHours = remixSession 
        ? Math.ceil((new Date(remixSession.expires_at).getTime() - now.getTime()) / (60 * 60 * 1000))
        : 0

      return {
        id: project.id,
        title: project.title || `プロジェクト ${project.id.slice(0, 8)}`,
        status: project.status,
        plan: project.plan,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        expiresAt: expiresAt.toISOString(),
        remainingDays,
        isNearExpiration,
        isExpired,
        hasRemixSession,
        remixSessionRemainingHours: hasRemixSession ? remixSessionRemainingHours : undefined,
        checkpoints: project.checkpoints,
        thumbnailUrl: project.thumbnail_url,
        progress: getProgress(project.status)
      }
    }) || []

    // 期限切れを除外
    const filteredProjects = excludeExpired 
      ? formattedProjects.filter(p => !p.isExpired)
      : formattedProjects

    return NextResponse.json({
      projects: filteredProjects,
      total: filteredProjects.length
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

function getProgress(status: string): number {
  const progressMap: Record<string, number> = {
    'UPLOADED': 10,
    'PREPPED': 25,
    'AI_MIX_OK': 40,
    'TWEAKING': 55,
    'MASTERING': 70,
    'REVIEW': 85,
    'DONE': 100,
    'ARCHIVED': 100,
  }
  return progressMap[status] || 0
}