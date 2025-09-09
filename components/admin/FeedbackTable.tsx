'use client'

import { useState } from 'react'
import { 
  MessageSquare,
  Bug,
  Lightbulb,
  TrendingUp,
  HelpCircle,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Reply
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import FeedbackDetailModal from './FeedbackDetailModal'

interface Feedback {
  id: string
  type: 'bug' | 'feature' | 'improvement' | 'contact' | 'other'
  category?: string
  rating?: number
  message: string
  status: string
  user_id?: string
  user_email?: string
  user_name?: string
  page_url?: string
  created_at: string
  feedback_responses?: any[]
  metadata?: any
}

interface FeedbackTableProps {
  initialFeedbacks: Feedback[]
}

export default function FeedbackTable({ initialFeedbacks }: FeedbackTableProps) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [filter, setFilter] = useState('all')
  const supabase = createClientComponentClient()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4 text-red-500" />
      case 'feature':
        return <Lightbulb className="h-4 w-4 text-blue-500" />
      case 'improvement':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'contact':
        return <MessageSquare className="h-4 w-4 text-purple-500" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'bug': 'バグ報告',
      'feature': '機能要望',
      'improvement': '改善提案',
      'contact': 'お問い合わせ',
      'other': 'その他'
    }
    return labels[type] || type
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'investigating':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'new': '新規',
      'investigating': '調査中',
      'resolved': '解決済',
      'rejected': '却下'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'investigating':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('feedback')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setFeedbacks(feedbacks.map(f => 
        f.id === id ? { ...f, status: newStatus } : f
      ))

      // 監査ログに記録
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'feedback:status_change',
          entity: `feedback:${id}`,
          after: { status: newStatus }
        })
    }
  }

  const filteredFeedbacks = filter === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.status === filter)

  return (
    <>
      {/* フィルタータブ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex space-x-4">
          {['all', 'new', 'investigating', 'resolved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'すべて' : getStatusLabel(status)}
              {status !== 'all' && (
                <span className="ml-2 text-xs">
                  ({feedbacks.filter(f => f.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイプ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メッセージ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                評価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                送信者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFeedbacks.map((feedback) => (
              <tr key={feedback.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(feedback.type)}
                    <span className="text-sm text-gray-900">
                      {getTypeLabel(feedback.type)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(feedback.status)}
                    <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(feedback.status)}`}>
                      {getStatusLabel(feedback.status)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900 truncate max-w-xs">
                    {feedback.message}
                  </p>
                  {feedback.category && (
                    <span className="text-xs text-gray-500">
                      カテゴリー: {feedback.category}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {feedback.rating ? (
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < (feedback.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <p className="text-gray-900">{feedback.user_name || 'Anonymous'}</p>
                    <p className="text-gray-500 text-xs">{feedback.user_email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(feedback.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedFeedback(feedback)}
                      className="text-gray-600 hover:text-gray-900"
                      title="詳細表示"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {feedback.feedback_responses && feedback.feedback_responses.length > 0 && (
                      <span className="text-blue-600" title="返信あり">
                        <Reply className="h-4 w-4" />
                      </span>
                    )}
                    
                    {feedback.status === 'new' && (
                      <button
                        onClick={() => updateStatus(feedback.id, 'investigating')}
                        className="text-blue-600 hover:text-blue-900"
                        title="調査開始"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    )}
                    
                    {feedback.status === 'investigating' && (
                      <>
                        <button
                          onClick={() => updateStatus(feedback.id, 'resolved')}
                          className="text-green-600 hover:text-green-900"
                          title="解決済みにする"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(feedback.id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                          title="却下する"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredFeedbacks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">フィードバックが見つかりません</p>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusUpdate={(id, status) => updateStatus(id, status)}
        />
      )}
    </>
  )
}