'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Coins, TrendingUp, AlertCircle, Sparkles } from 'lucide-react'

interface CreditBalance {
  total: number
  available: number
  held: number
  trial: number
  monthly: number
  addon: number
  carryover: number
}

interface Props {
  className?: string
  showDetails?: boolean
  compact?: boolean
}

export default function CreditBalance({ 
  className = '', 
  showDetails = false,
  compact = false 
}: Props) {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBalance()
    
    // リアルタイム更新の設定
    const channel = supabase
      .channel('credit_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'credit_ledger'
      }, () => {
        fetchBalance()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('ログインが必要です')
        setLoading(false)
        return
      }
      const user = session.user

      // クレジット残高を取得
      const { data: ledger, error: ledgerError } = await supabase
        .from('credit_ledger')
        .select('amount, bucket')
        .eq('user_id', user.id)

      if (ledgerError) throw ledgerError

      // ホールド中のクレジットを取得
      const { data: holds, error: holdsError } = await supabase
        .from('credit_holds')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'held')

      if (holdsError) throw holdsError

      // 集計
      const total = ledger?.reduce((sum, entry) => sum + entry.amount, 0) || 0
      const heldAmount = holds?.reduce((sum, hold) => sum + hold.amount, 0) || 0
      
      const buckets = {
        trial: 0,
        monthly: 0,
        addon: 0,
        carryover: 0
      }

      ledger?.forEach(entry => {
        if (entry.bucket in buckets) {
          buckets[entry.bucket as keyof typeof buckets] += entry.amount
        }
      })

      setBalance({
        total,
        available: total - heldAmount,
        held: heldAmount,
        ...buckets
      })
      setError(null)
    } catch (err) {
      console.error('Failed to fetch credit balance:', err)
      setError('残高の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  if (!balance) return null

  // コンパクト表示
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Coins className="w-4 h-4 text-indigo-600" />
        <span className="font-semibold text-gray-900">
          {balance.available.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">C</span>
        {balance.held > 0 && (
          <span className="text-xs text-orange-600">
            ({balance.held.toFixed(1)} 予約中)
          </span>
        )}
      </div>
    )
  }

  // 詳細表示
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/50 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">クレジット残高</h3>
        </div>
        <div className="text-2xl font-bold text-indigo-600">
          {balance.available.toFixed(1)}
          <span className="text-sm font-normal text-gray-500 ml-1">C</span>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-indigo-200/50">
          {/* 内訳 */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {balance.trial > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">無料トライアル:</span>
                <span className="font-medium">{balance.trial.toFixed(1)} C</span>
              </div>
            )}
            {balance.monthly > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">月次クレジット:</span>
                <span className="font-medium">{balance.monthly.toFixed(1)} C</span>
              </div>
            )}
            {balance.addon > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">追加購入:</span>
                <span className="font-medium">{balance.addon.toFixed(1)} C</span>
              </div>
            )}
            {balance.carryover > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">繰越分:</span>
                <span className="font-medium">{balance.carryover.toFixed(1)} C</span>
              </div>
            )}
          </div>

          {/* 予約中 */}
          {balance.held > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-100/50 border border-orange-200/50">
              <span className="text-sm text-orange-700">処理中・予約:</span>
              <span className="font-medium text-orange-700">
                {balance.held.toFixed(1)} C
              </span>
            </div>
          )}

          {/* 合計 */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-200/50">
            <span className="text-sm font-medium text-gray-700">総残高:</span>
            <span className="font-bold text-gray-900">
              {balance.total.toFixed(1)} C
            </span>
          </div>
        </div>
      )}

      {/* クレジット不足の警告 */}
      {balance.available < 1 && (
        <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">
                クレジット残高が不足しています
              </p>
              <p className="text-xs text-red-600 mt-1">
                MIX処理には最低1クレジットが必要です
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 無料トライアル中の表示 */}
      {balance.trial > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <p className="text-sm text-purple-700">
              無料トライアルクレジット使用中
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * ヘッダー用のコンパクトなクレジット表示
 */
export function CreditBalanceCompact() {
  return <CreditBalance compact className="text-sm" />
}

/**
 * ダッシュボード用の詳細なクレジット表示
 */
export function CreditBalanceDetailed() {
  return <CreditBalance showDetails className="w-full max-w-sm" />
}