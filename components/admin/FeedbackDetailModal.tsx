'use client'

import { useState } from 'react'
import { X, Send, Star, Globe, User, Calendar } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface FeedbackDetailModalProps {
  feedback: any
  onClose: () => void
  onStatusUpdate: (id: string, status: string) => void
}

export default function FeedbackDetailModal({ 
  feedback, 
  onClose, 
  onStatusUpdate 
}: FeedbackDetailModalProps) {
  const [response, setResponse] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [sending, setSending] = useState(false)
  const supabase = createClientComponentClient()

  const sendResponse = async () => {
    if (!response.trim()) return
    
    setSending(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_id: feedback.id,
          message: response,
          is_public: isPublic,
          created_by: user?.id
        })

      if (!error) {
        alert('返信を送信しました')
        setResponse('')
        onClose()
      }
    } catch (error) {
      console.error('Failed to send response:', error)
      alert('返信の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* オーバーレイ */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* モーダル */}
        <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              フィードバック詳細
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* 基本情報 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">タイプ</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {feedback.type === 'bug' ? 'バグ報告' :
                     feedback.type === 'feature' ? '機能要望' :
                     feedback.type === 'improvement' ? '改善提案' : 'その他'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">カテゴリー</label>
                  <p className="mt-1 text-sm text-gray-900">{feedback.category || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">ステータス</label>
                  <select
                    value={feedback.status}
                    onChange={(e) => onStatusUpdate(feedback.id, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  >
                    <option value="new">新規</option>
                    <option value="investigating">調査中</option>
                    <option value="resolved">解決済</option>
                    <option value="rejected">却下</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">評価</label>
                  <div className="mt-1 flex items-center">
                    {feedback.rating ? (
                      [...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < feedback.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">未評価</span>
                    )}
                  </div>
                </div>
              </div>

              {/* メッセージ */}
              <div>
                <label className="text-sm font-medium text-gray-500">メッセージ</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {feedback.message}
                  </p>
                </div>
              </div>

              {/* ユーザー情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    送信者
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {feedback.user_name || 'Anonymous'}
                  </p>
                  {feedback.user_email && (
                    <p className="text-xs text-gray-500">{feedback.user_email}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    送信日時
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(feedback.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>

              {/* ページURL */}
              {feedback.page_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <Globe className="h-4 w-4 mr-1" />
                    送信元ページ
                  </label>
                  <a
                    href={feedback.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {feedback.page_url}
                  </a>
                </div>
              )}

              {/* 既存の返信 */}
              {feedback.feedback_responses && feedback.feedback_responses.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">返信履歴</label>
                  <div className="mt-2 space-y-2">
                    {feedback.feedback_responses.map((res: any) => (
                      <div key={res.id} className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-900">{res.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(res.created_at).toLocaleString('ja-JP')}
                          {res.is_public && ' (公開)'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 返信フォーム */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-700">返信を送信</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="返信メッセージを入力..."
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      ユーザーに表示する
                    </span>
                  </label>
                  <button
                    onClick={sendResponse}
                    disabled={!response.trim() || sending}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    <span>返信を送信</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}