import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface CreditEstimate {
  base: number;
  addons: {
    harmony?: number;
    creatorUpgrade?: number;
  };
  total: number;
  description: string;
}

export interface CreditTransaction {
  jobId: string;
  amount: number;
  type: 'hold' | 'consume' | 'release';
  description: string;
}

export class CreditService {
  private supabase = createClientComponentClient();

  /**
   * クレジット見積もりを計算
   */
  calculateEstimate(options: {
    planCode: string;
    hasHarmony: boolean;
    upgradeToCreator?: boolean;
  }): CreditEstimate {
    const estimate: CreditEstimate = {
      base: 0,
      addons: {},
      total: 0,
      description: ''
    };

    // ベース処理のクレジット計算
    switch (options.planCode) {
      case 'freetrial':
        // 無料トライアル中は無償クレジット使用
        estimate.base = 1.0;
        estimate.description = '無料トライアル（無償クレジット使用）';
        break;
      
      case 'prepaid':
        estimate.base = 1.0;
        estimate.description = 'Standard相当MIX処理';
        
        // Creator機能アップグレード
        if (options.upgradeToCreator) {
          estimate.addons.creatorUpgrade = 0.5;
          estimate.description += ' + Creator機能';
        }
        break;
      
      case 'lite':
      case 'standard':
      case 'creator':
        // サブスクリプションプランは月次クレジットから消費
        estimate.base = 1.0;
        estimate.description = `${options.planCode}プラン MIX処理`;
        break;
      
      default:
        estimate.base = 1.0;
        estimate.description = 'MIX処理';
    }

    // ハモリは全プラン無料（要件定義による）
    if (options.hasHarmony) {
      estimate.addons.harmony = 0;
      estimate.description += ' + ハモリ（無料）';
    }

    // 合計計算
    estimate.total = estimate.base + 
      Object.values(estimate.addons).reduce((sum, val) => sum + (val || 0), 0);

    return estimate;
  }

  /**
   * 現在のクレジット残高を取得
   */
  async getCurrentBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('credit_ledger')
        .select('amount')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to get credit balance:', error);
        return 0;
      }

      return data?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return 0;
    }
  }

  /**
   * クレジットを予約（ホールド）
   */
  async holdCredits(transaction: CreditTransaction & { userId: string }): Promise<{
    success: boolean;
    holdId?: string;
    error?: string;
    currentBalance?: number;
  }> {
    try {
      // 現在の残高を確認
      const currentBalance = await this.getCurrentBalance(transaction.userId);
      
      if (currentBalance < transaction.amount) {
        return {
          success: false,
          error: 'クレジット残高が不足しています',
          currentBalance
        };
      }

      // ホールドレコードを作成
      const { data: hold, error: holdError } = await this.supabase
        .from('credit_holds')
        .insert({
          user_id: transaction.userId,
          job_id: transaction.jobId,
          amount: transaction.amount,
          status: 'held',
          description: transaction.description,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10分後に期限切れ
        })
        .select()
        .single();

      if (holdError) {
        console.error('Failed to create credit hold:', holdError);
        return {
          success: false,
          error: 'クレジットの予約に失敗しました'
        };
      }

      return {
        success: true,
        holdId: hold.id,
        currentBalance: currentBalance - transaction.amount
      };
    } catch (error) {
      console.error('Error holding credits:', error);
      return {
        success: false,
        error: 'クレジット予約中にエラーが発生しました'
      };
    }
  }

  /**
   * クレジットを消費（確定）
   */
  async consumeCredits(holdId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // ホールドレコードを取得
      const { data: hold, error: holdError } = await this.supabase
        .from('credit_holds')
        .select('*')
        .eq('id', holdId)
        .eq('user_id', userId)
        .eq('status', 'held')
        .single();

      if (holdError || !hold) {
        return {
          success: false,
          error: 'クレジット予約が見つかりません'
        };
      }

      // 現在の残高を取得
      const currentBalance = await this.getCurrentBalance(userId);
      const newBalance = currentBalance - hold.amount;

      // クレジット消費を記録
      const { error: consumeError } = await this.supabase
        .from('credit_ledger')
        .insert({
          user_id: userId,
          job_id: hold.job_id,
          amount: -hold.amount,
          balance_after: newBalance,
          type: 'consume',
          bucket: 'monthly', // TODO: プランに応じて変更
          description: hold.description,
          created_at: new Date().toISOString()
        });

      if (consumeError) {
        console.error('Failed to consume credits:', consumeError);
        return {
          success: false,
          error: 'クレジット消費の記録に失敗しました'
        };
      }

      // ホールドを消費済みに更新
      const { error: updateError } = await this.supabase
        .from('credit_holds')
        .update({
          status: 'consumed',
          consumed_at: new Date().toISOString()
        })
        .eq('id', holdId);

      if (updateError) {
        console.error('Failed to update hold status:', updateError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error consuming credits:', error);
      return {
        success: false,
        error: 'クレジット消費中にエラーが発生しました'
      };
    }
  }

  /**
   * クレジットを解放（キャンセル/失敗時）
   */
  async releaseCredits(holdId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // ホールドを解放済みに更新
      const { error: updateError } = await this.supabase
        .from('credit_holds')
        .update({
          status: 'released',
          released_at: new Date().toISOString()
        })
        .eq('id', holdId)
        .eq('user_id', userId)
        .eq('status', 'held');

      if (updateError) {
        console.error('Failed to release credit hold:', updateError);
        return {
          success: false,
          error: 'クレジット解放に失敗しました'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error releasing credits:', error);
      return {
        success: false,
        error: 'クレジット解放中にエラーが発生しました'
      };
    }
  }

  /**
   * 期限切れのホールドを自動解放
   */
  async releaseExpiredHolds(): Promise<number> {
    try {
      const { data: expiredHolds, error: fetchError } = await this.supabase
        .from('credit_holds')
        .select('id, user_id')
        .eq('status', 'held')
        .lt('expires_at', new Date().toISOString());

      if (fetchError || !expiredHolds) {
        console.error('Failed to fetch expired holds:', fetchError);
        return 0;
      }

      let releasedCount = 0;
      for (const hold of expiredHolds) {
        const result = await this.releaseCredits(hold.id, hold.user_id);
        if (result.success) {
          releasedCount++;
        }
      }

      return releasedCount;
    } catch (error) {
      console.error('Error releasing expired holds:', error);
      return 0;
    }
  }
}