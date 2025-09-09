'use client'

import { useRouter } from 'next/navigation'
import Header from '../../../components/common/Header'
import Footer from '../../../components/common/Footer'
import StyleTokens from '../../../components/common/StyleTokens'

export default function SubscribeCancelPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gray-50">
      <StyleTokens />
      <Header currentPage="" />
      
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          {/* キャンセルアイコン */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">手続きがキャンセルされました</h1>
          <p className="text-gray-600 mb-8">
            サブスクリプションの登録はキャンセルされました。<br />
            プランをもう一度ご検討ください。
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/pricing')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              プラン選択に戻る
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ホームへ戻る
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              7日間無料トライアルについて
            </p>
            <p className="text-sm text-blue-800">
              初回登録時は7日間無料でCreator相当の機能をお試しいただけます。<br />
              期間中はいつでも解約可能で、料金は一切発生しません。
            </p>
          </div>

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