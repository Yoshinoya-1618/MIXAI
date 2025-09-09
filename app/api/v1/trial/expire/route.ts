import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    // 内部APIまたはcronジョブからの呼び出しを想定
    // 実際の本番環境では適切な認証を追加する必要があります
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // サービスロールキーを使用
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // 期限切れのトライアルを取得
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('plan_code', 'freetrial')
      .eq('status', 'trialing')
      .lt('trial_ends_at', new Date().toISOString());

    if (fetchError) {
      console.error('Failed to fetch expired trials:', fetchError);
      return NextResponse.json(
        { error: 'トライアル期限切れ処理に失敗しました' },
        { status: 500 }
      );
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return NextResponse.json({
        success: true,
        message: '期限切れのトライアルはありません',
        processed: 0
      });
    }

    let processedCount = 0;
    const errors: any[] = [];

    for (const trial of expiredTrials) {
      try {
        // 1. サブスクリプションをprepaidに変更
        const { error: updateSubError } = await supabase
          .from('subscriptions')
          .update({
            plan_code: 'prepaid',
            status: 'none',
            trial_ends_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', trial.user_id);

        if (updateSubError) {
          throw updateSubError;
        }

        // 2. トライアルクレジットの残高を取得
        const { data: creditBalance } = await supabase
          .from('credit_ledger')
          .select('amount')
          .eq('user_id', trial.user_id)
          .eq('bucket', 'trial');

        const trialCredits = creditBalance?.reduce((sum, entry) => sum + entry.amount, 0) || 0;

        // 3. トライアルクレジットを失効
        if (trialCredits > 0) {
          const { error: expireError } = await supabase
            .from('credit_ledger')
            .insert({
              user_id: trial.user_id,
              amount: -trialCredits,
              balance_after: 0,
              type: 'expire',
              bucket: 'trial',
              description: '無料トライアル期限切れによる失効'
            });

          if (expireError) {
            throw expireError;
          }
        }

        // 4. プロファイルのトライアル消費フラグを更新
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            trial_consumed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', trial.user_id);

        if (profileError) {
          throw profileError;
        }

        processedCount++;
      } catch (error) {
        console.error(`Failed to process trial for user ${trial.user_id}:`, error);
        errors.push({
          user_id: trial.user_id,
          error: error
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${processedCount}件のトライアルを処理しました`,
      processed: processedCount,
      total: expiredTrials.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Trial expiration process error:', error);
    return NextResponse.json(
      { error: error.message || 'トライアル期限切れ処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 現在のトライアル状況を取得
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーのトライアル情報を取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code, status, trial_ends_at')
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_started_at, trial_consumed')
      .eq('id', user.id)
      .single();

    // クレジット残高を取得
    const { data: creditLedger } = await supabase
      .from('credit_ledger')
      .select('amount, bucket')
      .eq('user_id', user.id);

    const trialCredits = creditLedger
      ?.filter(entry => entry.bucket === 'trial')
      .reduce((sum, entry) => sum + entry.amount, 0) || 0;

    const totalCredits = creditLedger
      ?.reduce((sum, entry) => sum + entry.amount, 0) || 0;

    let trialStatus = 'not_started';
    let remainingDays = 0;

    if (subscription?.plan_code === 'freetrial' && subscription.status === 'trialing') {
      trialStatus = 'active';
      if (subscription.trial_ends_at) {
        const endDate = new Date(subscription.trial_ends_at);
        const now = new Date();
        remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
    } else if (profile?.trial_consumed) {
      trialStatus = 'expired';
    }

    return NextResponse.json({
      trial: {
        status: trialStatus,
        started_at: profile?.trial_started_at,
        ends_at: subscription?.trial_ends_at,
        remaining_days: remainingDays,
        consumed: profile?.trial_consumed || false
      },
      credits: {
        trial: trialCredits,
        total: totalCredits
      },
      current_plan: subscription?.plan_code || 'prepaid'
    });

  } catch (error: any) {
    console.error('Trial status fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'トライアル情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}