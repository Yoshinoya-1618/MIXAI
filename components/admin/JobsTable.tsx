'use client'

import { useState } from 'react'
import { 
  PlayCircle, 
  PauseCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  Download,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import JobDetailModal from './JobDetailModal'

interface Job {
  id: string
  user_id: string
  plan: string
  status: string
  credits_used: number
  created_at: string
  started_at?: string
  completed_at?: string
  duration_ms?: number
  error_message?: string
  profiles?: {
    display_name?: string
    email?: string
  }
}

interface JobsTableProps {
  initialJobs: Job[]
}

export default function JobsTable({ initialJobs }: JobsTableProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'queued': '待機中',
      'processing': '処理中',
      'completed': '完了',
      'failed': '失敗',
      'cancelled': 'キャンセル'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'queued':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleRetry = async (jobId: string) => {
    setLoading(jobId)
    
    try {
      const { error } = await supabase
        .from('mix_jobs')
        .update({ 
          status: 'queued',
          error_message: null,
          started_at: null,
          completed_at: null
        })
        .eq('id', jobId)

      if (!error) {
        setJobs(jobs.map(job => 
          job.id === jobId 
            ? { ...job, status: 'queued', error_message: undefined }
            : job
        ))
      }
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleCancel = async (jobId: string) => {
    if (!confirm('このジョブをキャンセルしますか？')) return
    
    setLoading(jobId)
    
    try {
      const { error } = await supabase
        .from('mix_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (!error) {
        setJobs(jobs.map(job => 
          job.id === jobId 
            ? { ...job, status: 'cancelled' }
            : job
        ))

        // 監査ログに記録
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: (await supabase.auth.getUser()).data.user?.id,
            action: 'job:cancel',
            entity: `mix_jobs:${jobId}`,
            reason: 'Manual cancellation from admin panel'
          })
      }
    } catch (error) {
      console.error('Cancel failed:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ジョブID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                プラン
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                処理時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                クレジット
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(job.status)}
                    <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}>
                      {getStatusLabel(job.status)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-sm font-mono text-blue-600 hover:text-blue-800"
                  >
                    {job.id.slice(0, 8)}...
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="text-gray-900">
                      {job.profiles?.display_name || 'Unknown'}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {job.profiles?.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {job.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(job.duration_ms)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {job.credits_used}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(job.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="text-gray-600 hover:text-gray-900"
                      title="詳細表示"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={loading === job.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        title="再実行"
                      >
                        <RefreshCw className={`h-4 w-4 ${loading === job.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    
                    {(job.status === 'queued' || job.status === 'processing') && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={loading === job.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="キャンセル"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">ジョブが見つかりません</p>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </>
  )
}