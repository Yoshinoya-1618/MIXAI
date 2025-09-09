'use client'

import { X, Copy, ExternalLink, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface JobDetailModalProps {
  job: any
  onClose: () => void
}

export default function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('ja-JP')
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
              ジョブ詳細
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 基本情報 */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">基本情報</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ジョブID</span>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-gray-900">{job.id}</code>
                      <button
                        onClick={() => copyToClipboard(job.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ユーザーID</span>
                    <code className="text-sm font-mono text-gray-900">{job.user_id}</code>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">プラン</span>
                    <span className="text-sm font-medium text-gray-900">{job.plan}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ステータス</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'failed' ? 'bg-red-100 text-red-800' :
                      job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">クレジット使用</span>
                    <span className="text-sm font-medium text-gray-900">{job.credits_used || 0}</span>
                  </div>
                </div>
              </div>

              {/* タイムスタンプ */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">タイムスタンプ</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">作成日時</span>
                    <span className="text-sm text-gray-900">{formatDate(job.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">開始日時</span>
                    <span className="text-sm text-gray-900">{formatDate(job.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">完了日時</span>
                    <span className="text-sm text-gray-900">{formatDate(job.completed_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">処理時間</span>
                    <span className="text-sm text-gray-900">
                      {job.duration_ms ? `${(job.duration_ms / 1000).toFixed(2)}秒` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ファイルパス */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">ファイルパス</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Inst</span>
                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                      {job.inst_path || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Vocal</span>
                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                      {job.vocal_path || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Master</span>
                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                      {job.master_path || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Preview</span>
                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                      {job.preview_path || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* エラー情報 */}
              {job.error_message && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">エラー情報</h4>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800">{job.error_message}</p>
                        {job.error_details && (
                          <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                            {JSON.stringify(job.error_details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* メタデータ */}
              {job.metadata && Object.keys(job.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">メタデータ</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(job.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            {copied && (
              <span className="text-sm text-green-600">コピーしました！</span>
            )}
            <div className="flex-1" />
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