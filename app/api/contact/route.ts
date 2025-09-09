import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase管理者クライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, name, email, subject, message } = body

    // バリデーション
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // ユーザー情報を取得（ログインしている場合）
    const authHeader = request.headers.get('authorization')
    let userId = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id
    }

    // フィードバックテーブルに保存
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        type: 'contact', // お問い合わせはcontactタイプとして保存
        category: category || 'general',
        message: `【件名】${subject}\n\n${message}`,
        user_id: userId,
        user_email: email,
        user_name: name,
        page_url: '/contact',
        user_agent: request.headers.get('user-agent'),
        status: 'new',
        priority: category === 'technical' || category === 'bug' ? 'high' : 'medium',
        metadata: {
          subject,
          original_category: category,
          submission_time: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving contact message:', error)
      return NextResponse.json(
        { error: 'メッセージの送信に失敗しました' },
        { status: 500 }
      )
    }

    // 管理者に通知メールを送信（オプション）
    // await sendAdminNotification(data)

    return NextResponse.json({
      success: true,
      message: 'お問い合わせを受け付けました',
      id: data.id
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 管理者への通知（将来的に実装）
async function sendAdminNotification(contactData: any) {
  // Supabase Edge Functionsまたは外部メールサービスを使用
  // 例: SendGrid, AWS SES, Resend など
  console.log('Admin notification for new contact:', contactData.id)
}