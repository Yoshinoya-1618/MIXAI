import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import FeedbackTable from '../../../components/admin/FeedbackTable'
import FeedbackStats from '../../../components/admin/FeedbackStats'

export default async function FeedbackManagement() {
  const supabase = createServerComponentClient({ cookies })
  
  // フィードバックデータ取得
  const { data: feedbacks, error } = await supabase
    .from('feedback')
    .select(`
      *,
      feedback_responses (*)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching feedback:', error)
  }

  // 統計情報の計算
  const stats = {
    total: feedbacks?.length || 0,
    new: feedbacks?.filter(f => f.status === 'new').length || 0,
    investigating: feedbacks?.filter(f => f.status === 'investigating').length || 0,
    resolved: feedbacks?.filter(f => f.status === 'resolved').length || 0,
    byType: {
      bug: feedbacks?.filter(f => f.type === 'bug').length || 0,
      feature: feedbacks?.filter(f => f.type === 'feature').length || 0,
      improvement: feedbacks?.filter(f => f.type === 'improvement').length || 0,
      other: feedbacks?.filter(f => f.type === 'other').length || 0
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">フィードバック管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          ユーザーからのフィードバックと対応状況
        </p>
      </div>

      {/* 統計情報 */}
      <FeedbackStats stats={stats} />

      {/* フィードバックテーブル */}
      <FeedbackTable initialFeedbacks={feedbacks || []} />
    </div>
  )
}