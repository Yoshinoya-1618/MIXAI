export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import JobsTable from '../../../components/admin/JobsTable'
import JobsFilters from '../../../components/admin/JobsFilters'

export default async function JobsManagement() {
  const supabase = createServerComponentClient({ cookies })
  
  // 初期データ取得
  const { data: jobs, error } = await supabase
    .from('mix_jobs')
    .select(`
      *,
      profiles:user_id (
        id,
        display_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching jobs:', error)
  }

  // 統計情報
  const { data: stats } = await supabase
    .rpc('get_job_stats', {})
    .single()

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ジョブ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            MIXジョブの状態管理と詳細確認
          </p>
        </div>
        
        {/* クイック統計 */}
        <div className="flex space-x-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">処理中</p>
            <p className="text-lg font-semibold text-blue-600">
              {jobs?.filter(j => j.status === 'processing').length || 0}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">待機中</p>
            <p className="text-lg font-semibold text-yellow-600">
              {jobs?.filter(j => j.status === 'queued').length || 0}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">失敗</p>
            <p className="text-lg font-semibold text-red-600">
              {jobs?.filter(j => j.status === 'failed').length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <JobsFilters />

      {/* ジョブテーブル */}
      <JobsTable initialJobs={jobs || []} />
    </div>
  )
}
