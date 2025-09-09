'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../web/api'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'
import { createClient } from '../../lib/supabase'

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // ユーザーセッションを確認
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handlePlanSelect = async (planCode: string) => {
    // チェックアウトページへ直接遷移
    router.push(`/checkout?plan=${planCode}`)
    return
    
    /* 以下の処理は不要になったためコメントアウト
    // Supabaseのセッションを確認
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // 未ログインの場合はログインページへ
      router.push(`/auth/login?callbackUrl=/pricing`)
      return
    }
    
    setLoading(planCode)
    
    try {
      // Stripe Checkout Sessionを作成
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_code: planCode,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }
      
      const { checkout_url } = await response.json()
      
      // Stripe Checkoutへリダイレクト
      window.location.href = checkout_url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('エラーが発生しました。もう一度お試しください。')
      setLoading(null)
    }
    */
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="pricing" />
      <AuroraBackground />
      
      <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25] mb-4">
            プラン料金
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            あなたの用途に最適なプランをお選びください。すべてのプランで高品質なAI音声処理をご利用いただけます
          </p>
        </div>

        {/* 7日間無料トライアルの大きなバナー */}
        <div className="mb-12">
          <div className="glass-card p-8 bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-2 border-indigo-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 mb-4">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                会員登録で7日間無料トライアル！
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                クレジットカード登録不要でCreator機能を体験
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6 text-left max-w-3xl mx-auto">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Creator全機能</div>
                    <div className="text-xs text-gray-600">カスタムテーマ・超高精度</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">無償1クレジット</div>
                    <div className="text-xs text-gray-600">1曲分のフルMIX可能</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">クレカ登録不要</div>
                    <div className="text-xs text-gray-600">メール認証だけでOK</div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => window.location.href = '/auth/register'}
                className="btn-primary px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                今すぐ無料で登録
              </button>
              
              <p className="text-xs text-gray-600 mt-4">
                <svg className="inline w-4 h-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                7日後にプリペイドプランへ自動移行
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {/* Prepaid Plan (No subscription) */}
          <div className="glass-card p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">プリペイド</h3>
            <p className="text-gray-600 mb-6 text-sm">プランなし・都度購入</p>
            
            <div className="mb-6">
              <div className="text-2xl font-bold mb-2">¥700</div>
              <div className="text-sm text-gray-600">1クレジット</div>
              <div className="text-sm font-semibold text-green-600 mt-1">必要な分だけ購入</div>
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">1曲のMIX = 1クレジット</span>
              </div>
              <div className="text-xs text-gray-500">
                サブスク不要・無期限有効
              </div>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">テーマ5種選択</div>
                  <div className="text-xs text-gray-600">汎用3種+ジャンル2種</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">高精度処理</div>
                  <div className="text-xs text-gray-600">ピッチ±20cent、ノイズ-10dB</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <StarIcon className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-purple-700">+0.5クレジットでCreator機能</div>
                  <div className="text-xs text-purple-600 font-semibold">カスタムテーマ・超高精度</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">出力形式</div>
                  <div className="text-xs text-gray-600">MP3/WAV/FLAC（保存7日間）</div>
                </div>
              </li>
            </ul>

            <button
              onClick={() => window.location.href = '/credits'}
              className="w-full btn-primary py-3 h-12 flex items-center justify-center"
            >
              クレジット購入へ
            </button>
          </div>

          {/* Lite Plan */}
          <div className="glass-card p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-6">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lite</h3>
            <p className="text-gray-600 mb-6 text-sm">手軽に始める基本プラン</p>
            
            <div className="mb-6">
              <div className="text-3xl font-bold mb-2">¥1,780</div>
              <div className="text-sm text-gray-600">月額（税込）</div>
              <div className="text-sm font-semibold text-indigo-600 mt-1">月間3クレジット</div>
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">月間3曲</span>までMIX可能
              </div>
              <div className="text-xs text-gray-500">
                実効単価：約¥593/曲
              </div>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">テーマ3種選択</div>
                  <div className="text-xs text-gray-600">Natural/Clear/Warm</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">標準精度処理</div>
                  <div className="text-xs text-gray-600">シンプルで迅速</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">ハモリ生成</div>
                  <div className="text-xs text-gray-600">無料</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">出力形式</div>
                  <div className="text-xs text-gray-600">MP3/WAV（保存7日間）</div>
                </div>
              </li>
            </ul>

            <button
              onClick={() => handlePlanSelect('lite')}
              disabled={loading === 'lite'}
              className="w-full btn-primary py-3 h-12 flex items-center justify-center"
            >
              {loading === 'lite' ? '処理中...' : 'このプランを選ぶ'}
            </button>
          </div>

          {/* Standard Plan */}
          <div className="glass-card p-6 text-center border-2 border-indigo-200 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-xs font-semibold rounded-full">
              人気No.1
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center mx-auto mb-6">
              <MusicIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Standard</h3>
            <p className="text-gray-600 mb-6 text-sm">プロ品質を目指す方へ</p>
            
            <div className="mb-6">
              <div className="text-3xl font-bold mb-2">¥3,980</div>
              <div className="text-sm text-gray-600">月額（税込）</div>
              <div className="text-sm font-semibold text-indigo-600 mt-1">月間6クレジット</div>
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">月間6曲</span>までMIX可能
              </div>
              <div className="text-xs text-gray-500">
                実効単価：約¥663/曲
              </div>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">テーマ5種+AI推奨</div>
                  <div className="text-xs text-gray-600">ジャンル別最適化</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">高精度処理</div>
                  <div className="text-xs text-gray-600">ピッチ±20cent、ノイズ-10dB</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">テーマ変更1回可</div>
                  <div className="text-xs text-gray-600">選び直しできる</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">出力形式拡張</div>
                  <div className="text-xs text-gray-600">MP3/WAV/FLAC（15日間）</div>
                </div>
              </li>
            </ul>

            <button
              onClick={() => handlePlanSelect('standard')}
              disabled={loading === 'standard'}
              className="w-full btn-primary py-3 h-12 flex items-center justify-center"
            >
              {loading === 'standard' ? '処理中...' : 'おすすめプランを選ぶ'}
            </button>
          </div>

          {/* Creator Plan */}
          <div className="glass-card p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6">
              <StarIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Creator</h3>
            <p className="text-gray-600 mb-6 text-sm">全機能を使いこなすプロ向け</p>
            
            <div className="mb-6">
              <div className="text-3xl font-bold mb-2">¥7,380</div>
              <div className="text-sm text-gray-600">月額（税込）</div>
              <div className="text-sm font-semibold text-indigo-600 mt-1">月間10クレジット</div>
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">月間10曲</span>までMIX可能
              </div>
              <div className="text-xs text-gray-500">
                実効単価：約¥738/曲
              </div>
              <div className="mt-3">
                <span className="inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                  HQ・ノイズ抑制付き
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">カスタムテーマ機能</div>
                  <div className="text-xs text-gray-600">ブレンド・微調整・保存</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">超高精度処理</div>
                  <div className="text-xs text-gray-600">ピッチ±10cent、ノイズ-14dB</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">参照曲解析</div>
                  <div className="text-xs text-gray-600">目標曲の特性を模倣</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">最長保存期間</div>
                  <div className="text-xs text-gray-600">30日間・最優先処理</div>
                </div>
              </li>
            </ul>

            <button
              onClick={() => handlePlanSelect('creator')}
              disabled={loading === 'creator'}
              className="w-full btn-primary py-3 h-12 flex items-center justify-center"
            >
              {loading === 'creator' ? '処理中...' : 'このプランを選ぶ'}
            </button>
          </div>
        </div>

        {/* 機能比較表 */}
        <div className="mt-24 mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">機能比較表</h2>
          <div className="glass-card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-gray-900">機能</th>
                  <th className="text-center px-4 py-4 font-medium text-gray-900">未加入（無料）</th>
                  <th className="text-center px-4 py-4 font-medium text-gray-900">Lite</th>
                  <th className="text-center px-4 py-4 font-medium text-gray-900">Standard</th>
                  <th className="text-center px-4 py-4 font-medium text-gray-900">Creator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 font-medium">月額料金</td>
                  <td className="text-center px-4 py-4">¥0</td>
                  <td className="text-center px-4 py-4">¥1,780</td>
                  <td className="text-center px-4 py-4">¥3,980</td>
                  <td className="text-center px-4 py-4">¥7,380</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">月間クレジット</td>
                  <td className="text-center px-4 py-4">0</td>
                  <td className="text-center px-4 py-4">3</td>
                  <td className="text-center px-4 py-4">6</td>
                  <td className="text-center px-4 py-4">10</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">フルMIX・マスタリング</td>
                  <td className="text-center px-4 py-4">
                    <div className="text-sm">1クレジット/曲</div>
                    <div className="text-xs text-purple-600 font-semibold">+0.5クレジットでCreator機能</div>
                  </td>
                  <td className="text-center px-4 py-4"><CheckIcon className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="text-center px-4 py-4"><CheckIcon className="w-5 h-5 text-green-600 mx-auto" /></td>
                  <td className="text-center px-4 py-4"><CheckIcon className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">ハモリ生成（オプション）</td>
                  <td className="text-center px-4 py-4 text-sm">無料</td>
                  <td className="text-center px-4 py-4 text-sm">無料</td>
                  <td className="text-center px-4 py-4 text-sm">無料</td>
                  <td className="text-center px-4 py-4 text-sm">無料</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">音量・音質調整項目</td>
                  <td className="text-center px-4 py-4">
                    <div className="text-sm">6項目</div>
                    <div className="text-xs text-purple-600">+0.5クレジットで7項目</div>
                  </td>
                  <td className="text-center px-4 py-4 text-sm">5項目</td>
                  <td className="text-center px-4 py-4 text-sm">6項目</td>
                  <td className="text-center px-4 py-4 text-sm">7項目</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">テーマ選択</td>
                  <td className="text-center px-4 py-4">
                    <div className="text-sm">5種類</div>
                    <div className="text-xs text-purple-600">+0.5クレジットでカスタム</div>
                  </td>
                  <td className="text-center px-4 py-4 text-sm">3種類</td>
                  <td className="text-center px-4 py-4 text-sm">5種類+AI推奨</td>
                  <td className="text-center px-4 py-4 text-sm">カスタムテーマ</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">HQマスター</td>
                  <td className="text-center px-4 py-4">
                    <div className="text-xs text-purple-600 font-semibold">+0.5クレジットで込み</div>
                  </td>
                  <td className="text-center px-4 py-4">—</td>
                  <td className="text-center px-4 py-4">—</td>
                  <td className="text-center px-4 py-4"><CheckIcon className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">強力ノイズ抑制</td>
                  <td className="text-center px-4 py-4">
                    <div className="text-xs text-purple-600 font-semibold">+0.5クレジットで込み</div>
                  </td>
                  <td className="text-center px-4 py-4">—</td>
                  <td className="text-center px-4 py-4">—</td>
                  <td className="text-center px-4 py-4"><CheckIcon className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">リファレンス解析</td>
                  <td className="text-center px-4 py-4">
                    <div className="text-xs text-purple-600 font-semibold">+0.5クレジットで利用可</div>
                  </td>
                  <td className="text-center px-4 py-4">—</td>
                  <td className="text-center px-4 py-4">—</td>
                  <td className="text-center px-4 py-4"><CheckIcon className="w-5 h-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">保存期間</td>
                  <td className="text-center px-4 py-4">7日</td>
                  <td className="text-center px-4 py-4">7日</td>
                  <td className="text-center px-4 py-4">15日</td>
                  <td className="text-center px-4 py-4">30日</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">実行優先度</td>
                  <td className="text-center px-4 py-4">通常</td>
                  <td className="text-center px-4 py-4">通常</td>
                  <td className="text-center px-4 py-4">優先</td>
                  <td className="text-center px-4 py-4">最優先</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">書き出し形式</td>
                  <td className="text-center px-4 py-4 text-sm">MP3/WAV/FLAC</td>
                  <td className="text-center px-4 py-4 text-sm">MP3/WAV</td>
                  <td className="text-center px-4 py-4 text-sm">MP3/WAV/FLAC</td>
                  <td className="text-center px-4 py-4 text-sm">MP3/WAV/FLAC/32bit float</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 無料トライアルCTA */}
        <div className="text-center mb-16">
          <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
            <h3 className="text-2xl font-bold mb-4">まずは無料でお試し！</h3>
            <p className="text-lg mb-6 opacity-95">
              会員登録で7日間Creator機能を無料体験
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <button 
                onClick={() => window.location.href = '/auth/register'}
                className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-gray-100 transition-all"
              >
                無料で会員登録
              </button>
              <div className="text-sm text-white/90">
                <div>✓ クレジットカード登録不要</div>
                <div>✓ 無償1クレジット付与</div>
              </div>
            </div>
          </div>
        </div>


        {/* クレジット購入セクション */}
        <div className="mb-16 p-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-4">サブスク不要のクレジット購入</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              必要な時に必要な分だけ購入。コンビニ・銀行振込でもOK
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">1クレジットでできること</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold">1C</span>
                  </div>
                  <div>
                    <div className="font-medium">フルMIX&マスタリング（1曲分）</div>
                    <div className="text-sm text-gray-600">最大60秒の楽曲を完全自動処理</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">0C</span>
                  </div>
                  <div>
                    <div className="font-medium">ハモリ全編生成</div>
                    <div className="text-sm text-gray-600">全プラン無料で利用可能</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 text-xs font-bold">+0.5C</span>
                  </div>
                  <div>
                    <div className="font-medium">Creator機能アップグレード</div>
                    <div className="text-sm text-gray-600">7軸調整・HQマスター・強力ノイズ抑制</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">クレジットパック</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-lg text-center">
                  <div className="font-bold text-2xl text-indigo-600">2クレジット</div>
                  <div className="text-sm text-gray-600">¥1,580</div>
                  <div className="text-xs text-gray-500">¥790/曲</div>
                </div>
                <div className="bg-white p-4 rounded-lg text-center">
                  <div className="font-bold text-2xl text-indigo-600">5クレジット</div>
                  <div className="text-sm text-gray-600">¥3,800</div>
                  <div className="text-xs text-gray-500">¥760/曲</div>
                </div>
                <div className="bg-white p-4 rounded-lg text-center border-2 border-indigo-300">
                  <div className="font-bold text-2xl text-indigo-600">8クレジット</div>
                  <div className="text-sm text-gray-600">¥5,920</div>
                  <div className="text-xs text-green-600 font-semibold">¥740/曲</div>
                  <div className="text-xs text-indigo-600">おすすめ</div>
                </div>
                <div className="bg-white p-4 rounded-lg text-center">
                  <div className="font-bold text-2xl text-indigo-600">12クレジット</div>
                  <div className="text-sm text-gray-600">¥8,400</div>
                  <div className="text-xs text-green-600 font-semibold">¥700/曲</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 p-6 rounded-xl mb-6">
            <h4 className="font-semibold mb-3">💡 どちらがお得？</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-indigo-600 mb-1">クレジット購入がおすすめの方</div>
                <ul className="text-gray-600 space-y-1">
                  <li>・月と1〜2曲しかMIXしない</li>
                  <li>・不定期に利用したい</li>
                  <li>・クレジットカードを使いたくない</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-indigo-600 mb-1">サブスクがおすすめの方</div>
                <ul className="text-gray-600 space-y-1">
                  <li>・月と3曲以上定期的にMIXする</li>
                  <li>・安定した単価で利用したい</li>
                  <li>・繰り越しで無駄なく使いたい</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <button 
              onClick={() => window.location.href = '/credits'}
              className="btn-primary px-8 py-3 mr-4"
            >
              クレジットを購入する
            </button>
            <p className="text-xs text-gray-600 mt-3">
              コンビニ決済・銀行振込対応
            </p>
          </div>
        </div>


        {/* FAQ Section */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-8">よくある質問</h2>
          <div className="grid gap-4 max-w-3xl mx-auto">
            <div className="glass-card p-6 text-left">
              <h3 className="font-medium mb-2">プラン変更はいつでもできますか？</h3>
              <p className="text-gray-600">
                はい、マイページからいつでもプラン変更・解約が可能です。変更は次回請求時から適用されます。
              </p>
            </div>
            <div className="glass-card p-6 text-left">
              <h3 className="font-medium mb-2">クレジットを使い切ったときは？</h3>
              <p className="text-gray-600">
                クレジットパックを2クレジット（¥1,580）から購入できます。コンビニ・銀行振込でも購入可能です。サブスクリプションの場合は、次回更新日（加入日から1ヶ月後）に新しいクレジットが付与されます。
              </p>
            </div>
            <div className="glass-card p-6 text-left">
              <h3 className="font-medium mb-2">クレジットの繰り越しはできますか？</h3>
              <p className="text-gray-600">
                サブスクリプションプランでは、未使用のクレジットは翌月に自動的に繰り越されます。繰り越し分から優先的に消費されます。ただし、プラン解約時には繰り越し分も含めて失効しますのでご注意ください。都度購入のクレジットは有効期限なく使用できます。
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}

// =========================================
// Shared Components
// =========================================


function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.blue} 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.magenta} 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: `linear-gradient(135deg, ${COLORS.magenta} 0%, ${COLORS.indigo} 100%)` }} />
    </div>
  )
}

// =========================================
// Icons
// =========================================

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
}