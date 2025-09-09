import { NextRequest, NextResponse } from 'next/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await req.json();
    const { title, instrumental_path, vocal_path } = body;

    // ユーザーの現在のプランを取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_code, status')
      .eq('user_id', user.id)
      .single();

    let planCode = 'prepaid'; // デフォルトはprepaid
    
    if (subscription && !subError) {
      // トライアル期間中かチェック
      if (subscription.plan_code === 'freetrial' && subscription.status === 'trialing') {
        planCode = 'freetrial';
      } else if (subscription.plan_code && subscription.status === 'active') {
        // アクティブなサブスクリプションがある場合
        planCode = subscription.plan_code;
      }
    } else {
      // サブスクリプションがない場合、プロフィールをチェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_started_at, trial_consumed')
        .eq('id', user.id)
        .single();

      if (profile && profile.trial_started_at && !profile.trial_consumed) {
        const trialStart = new Date(profile.trial_started_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 7) {
          planCode = 'freetrial';
        }
      }
    }

    // ジョブを作成
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        status: 'uploaded',
        plan_code: planCode,
        instrumental_path,
        vocal_path,
        title: title || `プロジェクト ${new Date().toLocaleDateString('ja-JP')}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json({ error: 'ジョブの作成に失敗しました' }, { status: 500 });
    }

    // プランに応じたルートを返す
    let redirectPath = '/mix/prepaid';
    switch (planCode) {
      case 'freetrial':
        redirectPath = '/mix/freetrial';
        break;
      case 'prepaid':
        redirectPath = '/mix/prepaid';
        break;
      case 'lite':
        redirectPath = '/mix/lite';
        break;
      case 'standard':
        redirectPath = '/mix/standard';
        break;
      case 'creator':
        redirectPath = '/mix/creator';
        break;
    }

    return NextResponse.json({
      success: true,
      job,
      redirectPath: `${redirectPath}/${job.id}`,
      plan: planCode
    });

  } catch (error: any) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: error.message || 'ジョブの作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}