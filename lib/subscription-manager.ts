/**
 * サブスクリプション管理
 * プラン変更時のクレジット処理を含む
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export type PlanCode = 'freetrial' | 'prepaid' | 'lite' | 'standard' | 'creator'

interface PlanInfo {
  code: PlanCode
  name: string
  price: number
  monthlyCredits: number
  features: string[]
  retentionDays: number
}

export const PLAN_INFO: Record<PlanCode, PlanInfo> = {
  freetrial: {
    code: 'freetrial',
    name: 'Free Trial',
    price: 0,
    monthlyCredits: 1,
    features: ['Creator相当機能', '7日間無料', 'クレジットカード不要'],
    retentionDays: 7
  },
  prepaid: {
    code: 'prepaid',
    name: 'Prepaid',
    price: 0,
    monthlyCredits: 0,
    features: ['都度購入', 'Standard相当機能', 'Creator機能は+0.5C'],
    retentionDays: 7
  },
  lite: {
    code: 'lite',
    name: 'Lite',
    price: 1780,
    monthlyCredits: 2,
    features: ['月2クレジット', '基本3テーマ', '標準精度処理'],
    retentionDays: 7
  },
  standard: {
    code: 'standard',
    name: 'Standard',
    price: 3980,
    monthlyCredits: 5,
    features: ['月5クレジット', '7テーマ', '高精度処理', '微調整機能'],
    retentionDays: 15
  },
  creator: {
    code: 'creator',
    name: 'Creator',
    price: 7380,
    monthlyCredits: 12,
    features: ['月12クレジット', '全12テーマ', '超高精度処理', '全機能'],
    retentionDays: 30
  }
}

export class SubscriptionManager {
  private supabase = createClientComponentClient()

  /**
   * 現在のサブスクリプションを取得
   */
  async getCurrentSubscription(userId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data
  }

  /**
   * プラン変更処理
   */
  async changePlan(
    userId: string,
    fromPlan: PlanCode,
    toPlan: PlanCode
  ): Promise<{ success: boolean; message: string }> {
    try {
      // トランザクション開始
      const now = new Date().toISOString()

      // 1. 既存のサブスクリプションをキャンセル
      const { error: cancelError } = await this.supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: now,
          ended_at: now
        })
        .eq('user_id', userId)
        .eq('plan_code', fromPlan)
        .in('status', ['active', 'trialing'])

      if (cancelError) throw cancelError

      // 2. 新しいサブスクリプションを作成
      const newPlan = PLAN_INFO[toPlan]
      const { data: newSub, error: createError } = await this.supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_code: toPlan,
          status: 'active',
          current_period_start: now,
          current_period_end: this.getNextBillingDate(now),
          created_at: now
        })
        .select()
        .single()

      if (createError) throw createError

      // 3. クレジット処理
      await this.handlePlanChangeCredits(userId, fromPlan, toPlan)

      // 4. システムログに記録
      await this.supabase
        .from('system_logs')
        .insert({
          type: 'plan_change',
          message: `Plan changed from ${fromPlan} to ${toPlan}`,
          metadata: {
            user_id: userId,
            from_plan: fromPlan,
            to_plan: toPlan,
            subscription_id: newSub.id
          }
        })

      return {
        success: true,
        message: `プランを${PLAN_INFO[toPlan].name}に変更しました`
      }
    } catch (error) {
      console.error('Plan change error:', error)
      return {
        success: false,
        message: 'プラン変更に失敗しました'
      }
    }
  }

  /**
   * プラン変更時のクレジット処理
   */
  private async handlePlanChangeCredits(
    userId: string,
    fromPlan: PlanCode,
    toPlan: PlanCode
  ) {
    const fromInfo = PLAN_INFO[fromPlan]
    const toInfo = PLAN_INFO[toPlan]

    // アップグレードの場合
    if (toInfo.price > fromInfo.price) {
      // 差額分のクレジットを付与
      const creditDiff = toInfo.monthlyCredits - fromInfo.monthlyCredits
      if (creditDiff > 0) {
        await this.addCredits(userId, creditDiff, 'monthly', 'プランアップグレード')
      }
    }
    // ダウングレードの場合
    else if (toInfo.price < fromInfo.price) {
      // 未使用クレジットを繰越バケットに移動
      await this.carryOverUnusedCredits(userId)
    }

    // 新プランの月次クレジットを付与
    if (toInfo.monthlyCredits > 0) {
      await this.addCredits(
        userId, 
        toInfo.monthlyCredits, 
        'monthly',
        `${toInfo.name}プラン月次クレジット`
      )
    }
  }

  /**
   * クレジットを追加
   */
  private async addCredits(
    userId: string,
    amount: number,
    bucket: 'trial' | 'monthly' | 'addon' | 'carryover',
    description: string
  ) {
    // 現在の残高を取得
    const { data: currentBalance } = await this.supabase
      .from('credit_ledger')
      .select('amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const balanceAfter = (currentBalance?.amount || 0) + amount

    const { error } = await this.supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        amount,
        balance_after: balanceAfter,
        type: 'grant',
        bucket,
        description,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to add credits:', error)
      throw error
    }
  }

  /**
   * 未使用クレジットを繰越
   */
  private async carryOverUnusedCredits(userId: string) {
    // 現在の月次クレジット残高を取得
    const { data: monthlyCredits } = await this.supabase
      .from('credit_ledger')
      .select('amount')
      .eq('user_id', userId)
      .eq('bucket', 'monthly')

    const monthlyTotal = monthlyCredits?.reduce((sum, c) => sum + c.amount, 0) || 0

    if (monthlyTotal > 0) {
      // 月次クレジットを消費
      await this.addCredits(
        userId,
        -monthlyTotal,
        'monthly',
        'プランダウングレードによる消費'
      )

      // 繰越バケットに移動
      await this.addCredits(
        userId,
        monthlyTotal,
        'carryover',
        'プランダウングレードによる繰越'
      )
    }
  }

  /**
   * 次の請求日を計算
   */
  private getNextBillingDate(from: string): string {
    const date = new Date(from)
    date.setMonth(date.getMonth() + 1)
    return date.toISOString()
  }

  /**
   * プランのアップグレード可否をチェック
   */
  canUpgrade(currentPlan: PlanCode, targetPlan: PlanCode): boolean {
    const planOrder: PlanCode[] = ['freetrial', 'prepaid', 'lite', 'standard', 'creator']
    const currentIndex = planOrder.indexOf(currentPlan)
    const targetIndex = planOrder.indexOf(targetPlan)
    return targetIndex > currentIndex
  }

  /**
   * プランのダウングレード可否をチェック
   */
  canDowngrade(currentPlan: PlanCode, targetPlan: PlanCode): boolean {
    // フリートライアルからはダウングレード不可
    if (currentPlan === 'freetrial') return false
    
    // prepaidへの変更は常に可能
    if (targetPlan === 'prepaid') return true
    
    const planOrder: PlanCode[] = ['prepaid', 'lite', 'standard', 'creator']
    const currentIndex = planOrder.indexOf(currentPlan)
    const targetIndex = planOrder.indexOf(targetPlan)
    return targetIndex < currentIndex && targetIndex >= 0
  }
}