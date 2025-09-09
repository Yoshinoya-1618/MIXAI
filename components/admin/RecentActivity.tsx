'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  MessageSquare,
  ChevronRight
} from 'lucide-react'

interface RecentActivityProps {
  type: 'jobs' | 'feedback'
}

export default function RecentActivity({ type }: RecentActivityProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRecentItems()
  }, [type])

  const fetchRecentItems = async () => {
    setLoading(true)
    
    if (type === 'jobs') {
      const { data } = await supabase
        .from('mix_jobs')
        .select('id, status, plan, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5)
      
      setItems(data || [])
    } else {
      const { data } = await supabase
        .from('feedback')
        .select('id, type, status, message, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      setItems(data || [])
    }
    
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
      case 'investigating':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'queued': '待機中',
      'processing': '処理中',
      'completed': '完了',
      'failed': '失敗',
      'cancelled': 'キャンセル',
      'new': '新規',
      'investigating': '調査中',
      'resolved': '解決済',
      'rejected': '却下'
    }
    return labels[status] || status
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'たった今'
    if (minutes < 60) return `${minutes}分前`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}時間前`
    return date.toLocaleDateString('ja-JP')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {type === 'jobs' ? '最近のジョブ' : '最近のフィードバック'}
          </h3>
          <Link 
            href={`/admin/${type === 'jobs' ? 'jobs' : 'feedback'}`}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            すべて見る
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            読み込み中...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            データがありません
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    {type === 'jobs' ? (
                      <>
                        <p className="text-sm font-medium text-gray-900">
                          {item.plan}プラン
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {item.id.slice(0, 8)}...
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900">
                          {item.type === 'bug' ? 'バグ報告' : 
                           item.type === 'feature' ? '機能要望' : 
                           item.type === 'improvement' ? '改善提案' : 'その他'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {item.message}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${item.status === 'completed' || item.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      item.status === 'failed' || item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      item.status === 'processing' || item.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'}
                  `}>
                    {getStatusLabel(item.status)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(item.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}