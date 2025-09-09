'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

interface Plan {
  id: string
  name: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  features: string[]
  limits: {
    jobsPerMonth: number
    storageGB: number
    maxFileSize: number
    processingTime: number
  }
  popular?: boolean
  current?: boolean
}

interface Subscription {
  id: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    fetchSubscriptionData()
  }, [billingPeriod])

  const fetchSubscriptionData = async () => {
    try {
      // Mock data - 実際のAPIエンドポイントに置き換える
      const mockPlans: Plan[] = [
        {
          id: 'lite',
          name: 'Lite',
          price: billingPeriod === 'monthly' ? 980 : 9800,
          billingPeriod,
          features: [
            '5軸MIX調整',
            'ハーモニー生成',
            'MP3/WAVエクスポート',
            '基本的な音質改善',
            'メールサポート'
          ],
          limits: {
            jobsPerMonth: 20,
            storageGB: 5,
            maxFileSize: 50,
            processingTime: 180
          }
        },
        {
          id: 'standard',
          name: 'Standard',
          price: billingPeriod === 'monthly' ? 1980 : 19800,
          billingPeriod,
          features: [
            '6軸MIX調整',
            'ジャンル自動検出',
            '高品質エフェクト',
            '複数フォーマット対応',
            'プライオリティサポート',
            '処理履歴保存30日'
          ],
          limits: {
            jobsPerMonth: 100,
            storageGB: 20,
            maxFileSize: 100,
            processingTime: 300
          },
          popular: true,
          current: true
        },
        {
          id: 'creator',
          name: 'Creator',
          price: billingPeriod === 'monthly' ? 4980 : 49800,
          billingPeriod,
          features: [
            '7軸MIX調整',
            'リファレンストラック解析',
            'プレミアムAIエンジン',
            'WAV 32bit/96kHz対応',
            '24/7サポート',
            '処理履歴保存90日',
            'API アクセス'
          ],
          limits: {
            jobsPerMonth: 500,
            storageGB: 100,
            maxFileSize: 500,
            processingTime: 600
          }
        }
      ]

      const mockSubscription: Subscription = {
        id: 'sub_123',
        planId: 'standard',
        status: 'active',
        currentPeriodStart: '2024-04-01',
        currentPeriodEnd: '2024-05-01',
        cancelAtPeriodEnd: false
      }

      setTimeout(() => {
        setPlans(mockPlans)
        setCurrentSubscription(mockSubscription)
        setLoading(false)
      }, 1000)

    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
      setError('サブスクリプション情報の取得に失敗しました')
      setLoading(false)
    }
  }

  const handlePlanChange = async (planId: string) => {
    setProcessingPlan(planId)
    setError('')

    try {
      // 実際の決済処理を実装
      // Stripe、PayPal、または他の決済サービスとの連携
      
      // Mock処理
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 成功時の処理
      setCurrentSubscription(prev => prev ? { ...prev, planId } : null)
      
      // 成功メッセージ表示
      alert('プランが正常に変更されました！')

    } catch (error: any) {
      setError(error.message || 'プラン変更に失敗しました')
    } finally {
      setProcessingPlan(null)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      // キャンセル処理を実装
      await new Promise(resolve => setTimeout(resolve, 1000))

      setCurrentSubscription(prev => 
        prev ? { ...prev, cancelAtPeriodEnd: true } : null
      )
      setShowCancelDialog(false)
      
      alert('サブスクリプションをキャンセルしました。現在の期間終了時に停止されます。')

    } catch (error: any) {
      setError(error.message || 'キャンセルに失敗しました')
    }
  }

  const formatPrice = (price: number, period: string) => {
    return `¥${price.toLocaleString()}${period === 'monthly' ? '/月' : '/年'}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      trialing: 'bg-blue-100 text-blue-800'
    }

    const labels = {
      active: '有効',
      canceled: 'キャンセル済み',
      past_due: '支払い遅延',
      trialing: '無料体験中'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <Header currentPage="subscription" />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="subscription" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold">サブスクリプション管理</h1>
          <p className="mt-2 text-gray-600">プランの変更や課金情報を管理できます</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 現在のサブスクリプション情報 */}
        {currentSubscription && (
          <div className="card p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">現在のプラン</h2>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-bold text-[var(--brand)]">
                    {plans.find(p => p.id === currentSubscription.planId)?.name}
                  </span>
                  {getStatusBadge(currentSubscription.status)}
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>期間: {formatDate(currentSubscription.currentPeriodStart)} - {formatDate(currentSubscription.currentPeriodEnd)}</p>
                  {currentSubscription.cancelAtPeriodEnd && (
                    <p className="text-red-600 font-medium">
                      {formatDate(currentSubscription.currentPeriodEnd)}に自動キャンセルされます
                    </p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                {!currentSubscription.cancelAtPeriodEnd && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    サブスクリプションをキャンセル
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 料金体系切り替え */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-[var(--brand)] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              月額払い
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-[var(--brand)] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              年額払い (2ヶ月分お得)
            </button>
          </div>
        </div>

        {/* プラン一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card p-8 relative ${
                plan.popular ? 'ring-2 ring-[var(--brand)] shadow-lg' : ''
              } ${plan.current ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[var(--brand)] text-white px-3 py-1 rounded-full text-xs font-medium">
                    人気
                  </span>
                </div>
              )}

              {plan.current && (
                <div className="absolute top-4 right-4">
                  <IconCheck className="w-6 h-6 text-blue-600" />
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-[var(--brand)] mb-2">
                  {formatPrice(plan.price, plan.billingPeriod)}
                </div>
                {billingPeriod === 'yearly' && (
                  <div className="text-sm text-gray-500">
                    月額換算: ¥{Math.round(plan.price / 12).toLocaleString()}
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <IconCheckSmall className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="space-y-2 mb-6 text-xs text-gray-600">
                <div>月間処理数: {plan.limits.jobsPerMonth}回</div>
                <div>ストレージ: {plan.limits.storageGB}GB</div>
                <div>最大ファイルサイズ: {plan.limits.maxFileSize}MB</div>
                <div>処理時間上限: {plan.limits.processingTime}秒</div>
              </div>

              {plan.current ? (
                <div className="w-full py-3 text-center text-blue-600 font-medium border border-blue-200 rounded">
                  現在のプラン
                </div>
              ) : (
                <button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={processingPlan === plan.id}
                  className={`w-full py-3 px-4 rounded font-medium transition-colors ${
                    plan.popular
                      ? 'bg-[var(--brand)] text-white hover:bg-[var(--brandAlt)]'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processingPlan === plan.id ? '処理中...' : 'このプランに変更'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* キャンセル確認ダイアログ */}
        {showCancelDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">サブスクリプションのキャンセル</h3>
              <p className="text-gray-600 mb-6">
                サブスクリプションをキャンセルすると、現在の期間終了時にプランが無効になります。
                キャンセル後も期間終了まではすべての機能をご利用いただけます。
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  キャンセルしない
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  キャンセルする
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 請求履歴 */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">請求履歴</h2>
          <div className="space-y-4">
            {[
              { date: '2024-04-01', amount: 1980, plan: 'Standard', status: '支払い済み' },
              { date: '2024-03-01', amount: 1980, plan: 'Standard', status: '支払い済み' },
              { date: '2024-02-01', amount: 980, plan: 'Lite', status: '支払い済み' }
            ].map((bill, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{formatDate(bill.date)}</div>
                  <div className="text-sm text-gray-600">{bill.plan}プラン</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">¥{bill.amount.toLocaleString()}</div>
                  <div className="text-sm text-green-600">{bill.status}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button className="text-[var(--brand)] hover:underline text-sm font-medium">
              すべての請求履歴を表示
            </button>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}

// アイコンコンポーネント
function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function IconCheckSmall({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}