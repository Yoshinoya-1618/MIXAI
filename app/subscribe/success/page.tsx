'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../../../components/common/Header'
import Footer from '../../../components/common/Footer'
import StyleTokens from '../../../components/common/StyleTokens'

function SubscribeSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  
  useEffect(() => {
    if (sessionId) {
      // セッション情報を取得（実装は後で追加）
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [sessionId])
  
  // 次回請求日を計算（7日後）
  const getNextBillingDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toLocaleDateString('ja-JP')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <StyleTokens />
      <Header currentPage="" />
      
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          {/* 成功アイコン */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">無料トライアルを開始しました</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 mb-2">
              7日間は<strong>¥0</strong>でCreator相当の機能をご利用いただけます
            </p>
            <p className="text-sm text-blue-800">
              次回請求日: <strong>{getNextBillingDate()}</strong>
            </p>
          </div>

          <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-sm mb-2">登録内容</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">プラン</span>
                <span className="font-medium">Standard</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">月額料金</span>
                <span className="font-medium">¥2,980（税込）</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">月次付与クレジット</span>
                <span className="font-medium">6C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">トライアル付与クレジット</span>
                <span className="font-medium">2C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">保存期間</span>
                <span className="font-medium">15日間</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">自動更新</span>
                <span className="font-medium text-green-600">有効</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">次のステップ</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/upload')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                今すぐアップロード
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ダッシュボード
              </button>
            </div>
            
            <div className="mt-4 space-y-2">
              <a
                href="#"
                className="block text-sm text-blue-600 hover:underline"
              >
                請求書を確認
              </a>
              <a
                href="/mypage"
                className="block text-sm text-blue-600 hover:underline"
              >
                サブスクリプションを管理
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-500">
              トライアル期間中でも、いつでも解約できます。
              解約した場合、期間終了まではサービスをご利用いただけます。
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <StyleTokens />
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <SubscribeSuccessContent />
    </Suspense>
  )
}