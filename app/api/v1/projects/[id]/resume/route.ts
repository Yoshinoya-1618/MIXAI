import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const projectId = params.id

    // プロジェクトの取得と権限チェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // ステータスに応じたリダイレクト先の決定
    let redirectUrl = ''
    switch (project.status) {
      case 'PREPPED':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=ai-mix`
        break
      case 'AI_MIX_OK':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=tweak`
        break
      case 'TWEAKING':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=tweak&resume=true`
        break
      case 'MASTERING':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=mastering`
        break
      case 'REVIEW':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=review`
        break
      default:
        return NextResponse.json({ 
          error: 'Cannot resume from this status' 
        }, { status: 400 })
    }

    // イベントログの記録
    await supabase
      .from('event_logs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        event_type: 'RESUME_CLICKED',
        details: {
          fromStatus: project.status
        }
      })

    return NextResponse.json({ 
      success: true,
      redirectUrl,
      project: {
        id: project.id,
        status: project.status,
        title: project.title
      }
    })

  } catch (error) {
    console.error('Resume error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}