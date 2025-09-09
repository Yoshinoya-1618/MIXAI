'use client'

import React, { useState, useEffect } from 'react'
import { MessageSquare, X, Send, Star, CheckCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'other'
  category?: string
  rating?: number
  message: string
  userEmail?: string
  userName?: string
  pageUrl?: string
}

export function FeedbackWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FeedbackData>({
    type: 'improvement',
    rating: undefined,
    message: '',
    userEmail: '',
    userName: '',
    pageUrl: ''
  })

  // MIXプロセス中のページを判定
  const hiddenPaths = [
    '/upload',
    '/preview',
    '/mix/standard',
    '/mix/lite',
    '/mix/creator',
    '/mix/freetrial',
    '/mix/prepaid',
    '/processing',
    '/status',
    '/result',
    '/checkout'
  ]

  // 現在のページがMIXプロセス中かどうかを判定
  const isHidden = hiddenPaths.some(path => pathname?.startsWith(path))
  
  // 完了画面は表示する
  const isCompletePage = pathname === '/complete'
  
  // フィードバックを表示するかどうか
  const shouldShow = !isHidden || isCompletePage

  useEffect(() => {
    // ページURLを設定
    if (typeof window !== 'undefined') {
      setFormData(prev => ({
        ...prev,
        pageUrl: window.location.href
      }))
    }
  }, [pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'フィードバックの送信に失敗しました')
      }

      setIsSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        setIsSuccess(false)
        setFormData({
          type: 'improvement',
          rating: undefined,
          message: '',
          userEmail: '',
          userName: '',
          pageUrl: window.location.href
        })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating: prev.rating === rating ? undefined : rating
    }))
  }

  const typeLabels = {
    bug: 'バグ報告',
    feature: '機能リクエスト',
    improvement: '改善提案',
    other: 'その他'
  }

  const categoryOptions = {
    bug: ['UI表示', '機能動作', 'パフォーマンス', 'データ', 'その他'],
    feature: ['新機能', '既存機能の拡張', 'インテグレーション', 'その他'],
    improvement: ['UI/UX', '音質', '処理速度', 'ワークフロー', 'その他'],
    other: ['質問', '要望', 'コメント', 'その他']
  }

  // MIXプロセス中のページでは非表示
  if (!shouldShow) {
    return null
  }

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
        aria-label="フィードバックを送る"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          フィードバック
        </span>
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* モーダルコンテンツ */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">フィードバック</h2>
                  <p className="text-sm text-white/90 mt-1">
                    ご意見・ご要望をお聞かせください
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="閉じる"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {isSuccess ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    送信完了しました
                  </h3>
                  <p className="text-sm text-gray-600">
                    貴重なご意見ありがとうございます
                  </p>
                </div>
              ) : (
                <>
                  {/* フィードバックタイプ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      種類を選択
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: value as any })}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            formData.type === value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* カテゴリー */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      詳細カテゴリー（任意）
                    </label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {categoryOptions[formData.type].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* 評価 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      満足度（任意）
                    </label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingClick(star)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              formData.rating && formData.rating >= star
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* メッセージ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メッセージ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      required
                      minLength={10}
                      maxLength={2000}
                      placeholder="具体的なご意見やご要望をお聞かせください..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.message.length}/2000文字
                    </p>
                  </div>

                  {/* 連絡先（任意） */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      返信をご希望の場合は連絡先をご入力ください（任意）
                    </p>
                    <div>
                      <input
                        type="text"
                        value={formData.userName || ''}
                        onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                        placeholder="お名前"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        value={formData.userEmail || ''}
                        onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                        placeholder="メールアドレス"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* エラーメッセージ */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* 送信ボタン */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.message}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>送信中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>送信する</span>
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    送信された内容は品質向上のために使用させていただきます
                  </p>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}