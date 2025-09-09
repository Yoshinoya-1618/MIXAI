import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import AuditLogTable from '../../../components/admin/AuditLogTable'
import { Shield, Activity, AlertTriangle, Clock } from 'lucide-react'

export default async function AuditLogsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // 監査ログデータ取得（最新1000件）
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('Error fetching audit logs:', error)
  }

  // アクター情報を追加
  if (logs) {
    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', actorIds)

    logs.forEach(log => {
      const profile = profiles?.find(p => p.id === log.actor_id)
      if (profile) {
        log.actor_email = profile.email
      }
    })
  }

  // 統計情報を計算
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats = {
    total: logs?.length || 0,
    last24h: logs?.filter(l => new Date(l.created_at) > last24h).length || 0,
    last7d: logs?.filter(l => new Date(l.created_at) > last7d).length || 0,
    securityEvents: logs?.filter(l => l.action.startsWith('security:')).length || 0,
    authEvents: logs?.filter(l => l.action.startsWith('auth:')).length || 0,
    adminActions: logs?.filter(l => 
      l.action.includes('role_change') || 
      l.action.includes('credit_adjustment') ||
      l.action.includes('suspend')
    ).length || 0
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">監査ログ</h1>
        <p className="text-sm text-gray-500 mt-1">
          システム内のすべてのアクティビティとセキュリティイベント
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.last24h}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">過去24時間</p>
          <p className="text-xs text-gray-500 mt-1">アクティビティ</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.last7d}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">過去7日間</p>
          <p className="text-xs text-gray-500 mt-1">アクティビティ</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.securityEvents}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">セキュリティ</p>
          <p className="text-xs text-gray-500 mt-1">イベント</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.adminActions}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">管理操作</p>
          <p className="text-xs text-gray-500 mt-1">実行済み</p>
        </div>
      </div>

      {/* アクティビティグラフ（簡易版） */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">最近のアクティビティ傾向</h3>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => {
            const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
            const dayLogs = logs?.filter(l => {
              const logDate = new Date(l.created_at)
              return logDate.toDateString() === date.toDateString()
            }).length || 0
            const maxLogs = Math.max(...[...Array(7)].map((_, j) => {
              const d = new Date(now.getTime() - (6 - j) * 24 * 60 * 60 * 1000)
              return logs?.filter(l => {
                const ld = new Date(l.created_at)
                return ld.toDateString() === d.toDateString()
              }).length || 0
            }))
            const height = maxLogs > 0 ? (dayLogs / maxLogs) * 100 : 0

            return (
              <div key={i} className="flex flex-col items-center">
                <div className="w-full bg-gray-100 rounded relative" style={{ height: '100px' }}>
                  <div 
                    className="absolute bottom-0 w-full bg-blue-500 rounded"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </span>
                <span className="text-xs font-medium text-gray-700">{dayLogs}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ログテーブル */}
      <AuditLogTable initialLogs={logs || []} />
    </div>
  )
}