'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function AuroraBackground() {
  const COLORS = {
    indigo: '#6366F1',
    blue: '#22D3EE',  
    magenta: '#F472B6',
  }
  
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

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState('プリペイド')
  const [nextBillingDate, setNextBillingDate] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login?redirect=/billing')
      return
    }
    
    // ダミーデータをセット
    setCurrentPlan('Standard')
    setNextBillingDate('2024-02-01')
    setTransactions([
      {
        id: 1,
        date: '2024-01-01',
        description: 'Standard プラン',
        amount: 3980,
        status: '支払済み',
        invoice: '#INV-2024-001'
      },
      {
        id: 2,
        date: '2023-12-15',
        description: 'クレジット購入 (5クレジット)',
        amount: 3300,
        status: '支払済み',
        invoice: '#INV-2023-012'
      },
      {
        id: 3,
        date: '2023-12-01',
        description: 'Standard プラン',
        amount: 3980,
        status: '支払済み',
        invoice: '#INV-2023-011'
      }
    ])
    setLoading(false)
  }

  const downloadInvoice = (invoiceId: string) => {
    console.log('Downloading invoice:', invoiceId)
    // 実際のダウンロード処理
  }

  if (loading) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <AuroraBackground />
        <Header currentPage="billing" />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="billing" />
      
      {/* ヒーローセクション */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            請求と支払い
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            現在のプラン、請求履歴、支払い方法を管理できます。
          </p>
        </div>
      </section>

      {/* 現在のプラン */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">現在のプラン</h2>
              <button 
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
              >
                プランを変更
              </button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">プラン名</p>
                <p className="text-xl font-bold">{currentPlan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">月額料金</p>
                <p className="text-xl font-bold">¥3,980</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">次回請求日</p>
                <p className="text-xl font-bold">{nextBillingDate}</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-indigo-900">今月の利用状況</span>
              </div>
              <p className="text-sm text-indigo-700">
                6クレジット中 3クレジット使用済み（残り3クレジット）
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 支払い方法 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">支払い方法</h2>
              <button className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium">
                支払い方法を追加
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-gray-600">有効期限: 12/2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">デフォルト</span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 請求履歴 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">請求履歴</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">日付</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">説明</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">金額</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">ステータス</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">請求書</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm">{transaction.date}</td>
                      <td className="py-4 px-4 text-sm">{transaction.description}</td>
                      <td className="py-4 px-4 text-sm font-medium">¥{transaction.amount.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                          {transaction.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button 
                          onClick={() => downloadInvoice(transaction.invoice)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          ダウンロード
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center">
              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                さらに表示
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* プラン解約 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8">
            <h3 className="text-lg font-bold mb-2">プランの解約</h3>
            <p className="text-sm text-gray-600 mb-4">
              プランを解約すると、次回更新日以降はプリペイドプランに切り替わります。
              保存されているプロジェクトは引き続きアクセス可能です。
            </p>
            <button className="text-red-600 hover:text-red-700 text-sm font-medium">
              プランを解約する
            </button>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}