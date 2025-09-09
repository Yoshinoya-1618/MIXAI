import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = registerSchema.parse(body)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {}
        }
      }
    )

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // 新規ユーザーにfreetrialプランとクレジットを付与
    if (data.user) {
      // プロフィール作成（トライアル情報含む）
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          trial_started_at: new Date().toISOString(),
          trial_consumed: false
        })

      // freetrialサブスクリプション作成
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7)

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: data.user.id,
          plan_code: 'freetrial',
          status: 'trialing',
          trial_ends_at: trialEndDate.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString()
        })

      // 無償1クレジット付与
      await supabase
        .from('credit_ledger')
        .insert({
          user_id: data.user.id,
          amount: 1.0,
          balance_after: 1.0,
          type: 'grant',
          bucket: 'trial',
          description: '無料トライアル特典（1クレジット）'
        })
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
      confirmation_sent: !data.session, // セッションがない場合は確認メールが送信された
      trial_info: data.user ? {
        plan: 'freetrial',
        credits: 1.0,
        expires_in_days: 7
      } : null
    })

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Register error:', error)
    return NextResponse.json(
      { error: '新規登録に失敗しました' },
      { status: 500 }
    )
  }
}