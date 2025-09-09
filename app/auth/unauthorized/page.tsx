import Link from 'next/link'
import { ShieldOff, Home, ArrowLeft } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full px-6 py-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          {/* アイコン */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ShieldOff className="h-10 w-10 text-red-600" />
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            アクセス権限がありません
          </h1>

          {/* 説明 */}
          <p className="text-gray-600 mb-8">
            このページへのアクセスには管理者権限が必要です。
            権限が必要な場合は、システム管理者にお問い合わせください。
          </p>

          {/* エラーコード */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-500">エラーコード</p>
            <p className="text-lg font-mono font-semibold text-gray-900">403 FORBIDDEN</p>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              ホームに戻る
            </Link>

            <button
              onClick={() => window.history.back()}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              前のページに戻る
            </button>
          </div>

          {/* ヘルプテキスト */}
          <p className="text-sm text-gray-500 mt-8">
            お困りの場合は、
            <Link href="/help" className="text-blue-600 hover:text-blue-800 underline">
              ヘルプセンター
            </Link>
            をご確認ください。
          </p>
        </div>
      </div>
    </div>
  )
}