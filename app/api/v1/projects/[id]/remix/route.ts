import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

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
    const body = await request.json()
    const { mode = 'AIMIX' } = body

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

    // 完了済みまたはアーカイブ済みのプロジェクトのみ再MIX可能
    if (project.status !== 'DONE' && project.status !== 'ARCHIVED') {
      return NextResponse.json({ 
        error: 'Can only remix completed or archived projects' 
      }, { status: 400 })
    }

    // クレジット残高チェック
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (creditsError || !userCredits || userCredits.balance < 0.5) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: 0.5,
        current: userCredits?.balance || 0
      }, { status: 402 })
    }

    // 既存のRemixSessionがあるか確認
    const { data: existingSession } = await supabase
      .from('remix_sessions')
      .select('*')
      .eq('project_id', projectId)
      .gte('expires_at', new Date().toISOString())
      .single()

    let remixSessionId = existingSession?.id

    // 新しいRemixSessionを作成（既存がない場合）
    if (!existingSession) {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24時間後

      const { data: newSession, error: sessionError } = await supabase
        .from('remix_sessions')
        .insert({
          id: uuidv4(),
          project_id: projectId,
          user_id: user.id,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          charged: true
        })
        .select()
        .single()

      if (sessionError) {
        return NextResponse.json({ 
          error: 'Failed to create remix session' 
        }, { status: 500 })
      }

      remixSessionId = newSession.id

      // クレジットを消費
      const { error: creditError } = await supabase
        .from('user_credits')
        .update({ 
          balance: userCredits.balance - 0.5,
          updated_at: now.toISOString()
        })
        .eq('user_id', user.id)

      if (creditError) {
        // クレジット消費に失敗した場合、セッションを削除
        await supabase
          .from('remix_sessions')
          .delete()
          .eq('id', remixSessionId)

        return NextResponse.json({ 
          error: 'Failed to charge credits' 
        }, { status: 500 })
      }

      // クレジット履歴の記録
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -0.5,
          type: 'REMIX',
          description: `Remix session for project: ${project.title}`,
          project_id: projectId,
          session_id: remixSessionId
        })
    }

    // モードに応じたリダイレクト先の決定
    let redirectUrl = ''
    switch (mode) {
      case 'AIMIX':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=ai-mix&remix=true`
        break
      case 'TWEAK':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=tweak&remix=true`
        break
      case 'MASTER':
        redirectUrl = `/mix/${project.plan.toLowerCase()}/${projectId}?step=mastering&remix=true`
        break
      default:
        return NextResponse.json({ 
          error: 'Invalid remix mode' 
        }, { status: 400 })
    }

    // イベントログの記録
    await supabase
      .from('event_logs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        event_type: 'REMIX_SESSION_STARTED',
        details: {
          mode,
          charge: existingSession ? 0 : 0.5,
          sessionId: remixSessionId
        }
      })

    return NextResponse.json({ 
      success: true,
      redirectUrl,
      sessionId: remixSessionId,
      charged: !existingSession,
      expiresAt: existingSession?.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error) {
    console.error('Remix error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}