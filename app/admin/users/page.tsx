export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import UsersTable from '../../../components/admin/UsersTable'
import { Users, CreditCard, Shield, TrendingUp } from 'lucide-react'

export default async function UsersManagement() {
  const supabase = createServerComponentClient({ cookies })
  
  // ユーザーデータ取得（ジョブ統計も含む）
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching users:', error)
  }

  // ジョブ統計を集計
  if (users) {
    const { data: jobStats } = await supabase
      .from('jobs')
      .select('user_id, credits_used')
      .in('user_id', users.map(u => u.id))

    // ユーザーごとの統計を計算
    users.forEach(user => {
      const userJobs = jobStats?.filter(j => j.user_id === user.id) || []
      user.total_jobs = userJobs.length
      user.total_credits_used = userJobs.reduce((sum, j) => sum + (j.credits_used || 0), 0)
    })
  }

  // 統計情報
  const stats = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter(u => !u.suspended).length || 0,
    suspendedUsers: users?.filter(u => u.suspended).length || 0,
    totalCredits: users?.reduce((sum, u) => sum + (u.credits || 0), 0) || 0,
    adminUsers: users?.filter(u => u.roles === 'admin').length || 0,
    supportUsers: users?.filter(u => u.roles === 'support' || u.roles === 'ops').length || 0
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          ユーザーアカウントとクレジットの管理
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalUsers}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
          <p className="text-xs text-gray-500 mt-1">
            アクティブ: {stats.activeUsers} / 停止: {stats.suspendedUsers}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalCredits.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">総クレジット</p>
          <p className="text-xs text-gray-500 mt-1">全ユーザー合計</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.adminUsers}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">管理者</p>
          <p className="text-xs text-gray-500 mt-1">管理権限保有者</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.supportUsers}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">サポート・運用</p>
          <p className="text-xs text-gray-500 mt-1">サポートスタッフ</p>
        </div>
      </div>

      {/* ユーザーテーブル */}
      <UsersTable initialUsers={users || []} />
    </div>
  )
}
