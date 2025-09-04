'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../web/api'
import { AuthGuard } from '../../components/AuthGuard'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'

type Plan = {
  code: string
  name: string
  price_jpy: number
  monthly_credits: number
}

type Subscription = {
  id: string
  plan_code: string
  status: 'none' | 'active' | 'past_due' | 'canceled'
  current_period_start: string
  current_period_end: string
  auto_renew: boolean
  auto_buy_addon: boolean
}

type CreditBalance = {
  available_credits: number
  this_month_used: number
  next_grant_date: string | null
}

export default function SubscriptionsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [subRes, plansRes, creditsRes] = await Promise.all([
        apiFetch('/api/v1/subscriptions'),
        apiFetch('/api/v1/plans'),
        apiFetch('/api/v1/credits/balance')
      ])

      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData.subscription)
      }
      
      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(plansData.plans)
      }

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCreditBalance(creditsData)
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = async (planCode: string) => {
    if (updating) return
    
    setUpdating(true)
    try {
      const res = await apiFetch('/api/v1/subscriptions', {
        method: subscription?.status === 'active' ? 'PATCH' : 'POST',
        body: JSON.stringify({ plan_code: planCode })
      })
      
      if (res.ok) {
        await loadData()
      } else {
        throw new Error('プラン変更に失敗しました')
      }
    } catch (error) {
      alert('プラン変更に失敗しました。もう一度お試しください。')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('サブスクリプションを解約しますか？次回更新日で自動的に停止されます。')) {
      return
    }

    setUpdating(true)
    try {
      const res = await apiFetch('/api/v1/subscriptions', {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await loadData()
      } else {
        throw new Error('解約に失敗しました')
      }
    } catch (error) {
      alert('解約に失敗しました。もう一度お試しください。')
    } finally {
      setUpdating(false)
    }
  }

  const toggleAutoSettings = async (field: 'auto_renew' | 'auto_buy_addon', value: boolean) => {
    if (updating) return

    setUpdating(true)
    try {
      const res = await apiFetch('/api/v1/subscriptions', {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value })
      })
      
      if (res.ok) {
        await loadData()
      } else {
        throw new Error('設定変更に失敗しました')
      }
    } catch (error) {
      alert('設定変更に失敗しました。もう一度お試しください。')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[var(--bg)] text-gray-900">
          <StyleTokens />
          <Header />
          <div className="py-16 text-center">
            <div className="animate-pulse">読み込み中...</div>
          </div>
          <Footer />
        </main>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[var(--bg)] text-gray-900">
        <StyleTokens />
        <Header />
        
        <div className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-semibold">サブスクリプション管理</h1>
              <p className="mt-4 text-gray-700">プランの変更や設定を管理できます</p>
            </div>

            {/* 現在の状況 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <CurrentStatus subscription={subscription} />
              <CreditStatus balance={creditBalance} />
            </div>

            {/* プラン一覧 */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-6">利用可能プラン</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map(plan => (
                  <PlanCard
                    key={plan.code}
                    plan={plan}
                    currentPlan={subscription?.plan_code}
                    isActive={subscription?.status === 'active'}
                    onSelect={handlePlanChange}
                    disabled={updating}
                  />
                ))}
              </div>
            </div>

            {/* 設定 */}
            {subscription?.status === 'active' && (
              <div className="card p-6 mb-8">
                <h2 className="text-xl font-semibold mb-6">自動更新設定</h2>
                <div className="space-y-4">
                  <SettingToggle
                    label="自動更新"
                    description="次回更新日に自動的にプランを継続します"
                    checked={subscription.auto_renew}
                    onChange={(value) => toggleAutoSettings('auto_renew', value)}
                    disabled={updating}
                  />
                  <SettingToggle
                    label="不足時自動購入"
                    description="クレジットが不足した際に自動的に追加購入します"
                    checked={subscription.auto_buy_addon}
                    onChange={(value) => toggleAutoSettings('auto_buy_addon', value)}
                    disabled={updating}
                  />
                </div>
              </div>
            )}

            {/* 解約 */}
            {subscription?.status === 'active' && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4 text-red-700">サブスクリプションの解約</h2>
                <p className="text-gray-600 mb-4">
                  解約すると次回更新日（{subscription.current_period_end && new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}）でサービスが停止されます。
                </p>
                <button
                  onClick={handleCancelSubscription}
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? '処理中...' : '解約する'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <Footer />
      </main>
    </AuthGuard>
  )
}

function CurrentStatus({ subscription }: { subscription: Subscription | null }) {
  if (!subscription || subscription.status === 'none') {
    return (
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">現在の状況</h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">サブスクリプションなし</div>
          <div className="text-sm text-gray-400">都度課金でご利用いただけます</div>
        </div>
      </div>
    )
  }

  const statusLabels = {
    active: { label: 'アクティブ', color: 'text-green-600' },
    past_due: { label: '支払い期限切れ', color: 'text-red-600' },
    canceled: { label: '解約済み', color: 'text-gray-600' }
  }

  const status = statusLabels[subscription.status] || { label: subscription.status, color: 'text-gray-600' }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-4">現在のプラン</h2>
      <div className="space-y-3">
        <div>
          <div className="text-sm text-gray-600">プラン</div>
          <div className="font-semibold text-lg">{subscription.plan_code.toUpperCase()}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">ステータス</div>
          <div className={`font-semibold ${status.color}`}>{status.label}</div>
        </div>
        {subscription.current_period_end && (
          <div>
            <div className="text-sm text-gray-600">次回更新日</div>
            <div className="font-semibold">
              {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CreditStatus({ balance }: { balance: CreditBalance | null }) {
  if (!balance) return null

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-4">クレジット残高</h2>
      <div className="space-y-3">
        <div>
          <div className="text-sm text-gray-600">利用可能クレジット</div>
          <div className="font-semibold text-2xl text-blue-600">{balance.available_credits}C</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">今月の使用量</div>
          <div className="font-semibold">{balance.this_month_used}C</div>
        </div>
        {balance.next_grant_date && (
          <div>
            <div className="text-sm text-gray-600">次回付与予定</div>
            <div className="text-sm">
              {new Date(balance.next_grant_date).toLocaleDateString('ja-JP')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanCard({ 
  plan, 
  currentPlan, 
  isActive, 
  onSelect, 
  disabled 
}: { 
  plan: Plan
  currentPlan?: string
  isActive: boolean
  onSelect: (planCode: string) => void
  disabled: boolean
}) {
  const isCurrent = plan.code === currentPlan

  return (
    <div className={`card p-6 relative ${isCurrent ? 'border-blue-500 border-2' : ''}`}>
      {isCurrent && (
        <div className="absolute -top-2 left-4 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
          現在のプラン
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        <div className="text-2xl font-bold text-blue-600">
          ¥{plan.price_jpy.toLocaleString()}
          <span className="text-sm text-gray-600 font-normal">/月</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-600 mb-1">月次クレジット</div>
        <div className="font-semibold">{plan.monthly_credits}C</div>
      </div>

      <button
        onClick={() => onSelect(plan.code)}
        disabled={disabled || isCurrent}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors
          ${isCurrent 
            ? 'bg-gray-100 text-gray-500 cursor-default' 
            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
      >
        {disabled ? '処理中...' : isCurrent ? '選択中' : isActive ? 'プラン変更' : 'プラン開始'}
      </button>
    </div>
  )
}

function SettingToggle({ 
  label, 
  description, 
  checked, 
  onChange, 
  disabled 
}: { 
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}