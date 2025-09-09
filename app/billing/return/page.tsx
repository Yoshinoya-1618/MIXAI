'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Header from '../../../components/common/Header'
import Footer from '../../../components/common/Footer'
import StyleTokens from '../../../components/common/StyleTokens'

function BillingReturnContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const event = searchParams.get('event')

  const getTitle = () => {
    switch (event) {
      case 'updated':
        return 'プラン変更が完了しました'
      case 'cancelled':
        return '解約手続きが完了しました'
      default:
        return 'お支払い情報を更新しました'
    }
  }

  const getMessage = () => {
    switch (event) {
      case 'updated':
        return 'プランの変更が正常に処理されました。新しいプランの内容はマイページでご確認いただけます。'
      case 'cancelled':
        return 'サブスクリプションの解約を受け付けました。現在の請求期間の末日まではサービスをご利用いただけます。'
      default:
        return 'お支払い情報の更新が完了しました。次回の請求から新しい支払方法が使用されます。'
    }
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

          <h1 className="text-2xl font-bold mb-4">{getTitle()}</h1>
          <p className="text-gray-600 mb-8">
            {getMessage()}
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/mypage')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              マイページへ戻る
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ダッシュボードへ
            </button>
          </div>

          {event === 'cancelled' && (
            <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-900 font-medium mb-2">
                解約後のデータについて
              </p>
              <p className="text-sm text-yellow-800">
                解約後も現在の請求期間末まではサービスをご利用いただけます。<br />
                データは期間終了後30日間保持されますが、その後は削除されます。
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
            <a
              href="/contact"
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              お問い合わせフォーム
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function BillingReturnPage() {
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
      <BillingReturnContent />
    </Suspense>
  )
}