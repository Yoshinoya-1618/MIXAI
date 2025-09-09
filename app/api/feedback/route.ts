import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // ユーザー情報の取得（オプション）
    const { data: { user } } = await supabase.auth.getUser()
    
    // リクエストボディの取得
    const body = await request.json()
    const {
      type,
      category,
      rating,
      message,
      userEmail,
      userName,
      pageUrl
    } = body

    // バリデーション
    if (!type || !message) {
      return NextResponse.json(
        { error: 'タイプとメッセージは必須です' },
        { status: 400 }
      )
    }

    // メッセージの長さチェック
    if (message.length < 10) {
      return NextResponse.json(
        { error: 'メッセージは10文字以上入力してください' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'メッセージは2000文字以内で入力してください' },
        { status: 400 }
      )
    }

    // レーティングのバリデーション
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: '評価は1から5の間で選択してください' },
        { status: 400 }
      )
    }

    // User-Agentの取得
    const userAgent = request.headers.get('user-agent') || ''

    // フィードバックの保存
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        type,
        category,
        rating,
        message,
        page_url: pageUrl || request.headers.get('referer'),
        user_agent: userAgent,
        user_id: user?.id || null,
        user_email: userEmail || user?.email || null,
        user_name: userName || null,
        status: 'new'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving feedback:', error)
      return NextResponse.json(
        { error: 'フィードバックの送信に失敗しました' },
        { status: 500 }
      )
    }

    // 管理者への通知（将来的に実装）
    // await sendAdminNotification(data)

    return NextResponse.json(
      { 
        success: true,
        message: 'フィードバックを送信しました。ご協力ありがとうございます。',
        feedbackId: data.id
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 管理者権限チェック（オプション）
    const isAdmin = request.nextUrl.searchParams.get('admin') === 'true'
    if (isAdmin) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { error: '管理者権限が必要です' },
          { status: 403 }
        )
      }
    }

    // クエリパラメータの取得
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // フィードバックの取得クエリ
    let query = supabase
      .from('feedback')
      .select('*, feedback_responses(*)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 管理者でない場合は自分のフィードバックのみ
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    // フィルター適用
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json(
        { error: 'フィードバックの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      feedback: data || [],
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}