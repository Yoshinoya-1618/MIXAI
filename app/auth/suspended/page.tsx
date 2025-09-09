import Link from 'next/link'
import { UserX, Mail, HelpCircle } from 'lucide-react'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full px-6 py-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          {/* アイコン */}
          <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <UserX className="h-10 w-10 text-orange-600" />
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            アカウントが停止されています
          </h1>

          {/* 説明 */}
          <p className="text-gray-600 mb-8">
            お客様のアカウントは現在停止中です。
            サービスの利用を再開するには、サポートチームにお問い合わせください。
          </p>

          {/* 停止理由 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 text-left">
            <h3 className="text-sm font-semibold text-orange-900 mb-2">
              アカウント停止の一般的な理由:
            </h3>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• 利用規約違反</li>
              <li>• 不正な活動の検出</li>
              <li>• 支払いの問題</li>
              <li>• セキュリティ上の理由</li>
            </ul>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <a
              href="mailto:support@mixai.com"
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Mail className="h-5 w-5 mr-2" />
              サポートに連絡する
            </a>

            <Link
              href="/help/suspended-account"
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <HelpCircle className="h-5 w-5 mr-2" />
              詳細を確認する
            </Link>
          </div>

          {/* サポート情報 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              サポート営業時間
            </p>
            <p className="text-sm font-semibold text-gray-900">
              平日 9:00 - 18:00 (JST)
            </p>
            <p className="text-xs text-gray-500 mt-2">
              通常1-2営業日以内に返信いたします
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}