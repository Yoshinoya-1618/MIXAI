import Link from 'next/link'
import { ShieldOff, Home } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ShieldOff className="h-24 w-24 text-red-500 mx-auto" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          アクセス権限がありません
        </h2>
        
        <p className="text-gray-600 mb-8">
          このページにアクセスするには管理者権限が必要です。<br />
          権限が必要な場合は、システム管理者にお問い合わせください。
        </p>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center space-x-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>ホームに戻る</span>
          </Link>
          
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            別のアカウントでログイン
          </Link>
        </div>
      </div>
    </div>
  )
}