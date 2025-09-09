import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Briefcase, 
  AlertCircle, 
  Clock, 
  CreditCard,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import DashboardCard from '../../components/admin/DashboardCard'
import RecentActivity from '../../components/admin/RecentActivity'

export default async function AdminDashboard() {
  const supabase = createServerComponentClient({ cookies })
  
  // 今日の統計データを取得
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // ジョブ統計
  const { data: jobStats } = await supabase
    .from('mix_jobs')
    .select('status, credits_used')
    .gte('created_at', today.toISOString())

  const totalJobs = jobStats?.length || 0
  const failedJobs = jobStats?.filter(j => j.status === 'failed').length || 0
  const failureRate = totalJobs > 0 ? (failedJobs / totalJobs * 100).toFixed(1) : '0'
  const totalCredits = jobStats?.reduce((sum, j) => sum + (j.credits_used || 0), 0) || 0

  // 平均処理時間（簡易版）
  const { data: processingTimes } = await supabase
    .from('mix_jobs')
    .select('duration_ms')
    .eq('status', 'completed')
    .gte('created_at', today.toISOString())
    .not('duration_ms', 'is', null)

  const avgProcessingTime = processingTimes?.length > 0
    ? Math.round(processingTimes.reduce((sum, j) => sum + j.duration_ms, 0) / processingTimes.length / 1000)
    : 0

  // 未対応フィードバック
  const { count: unhandledFeedback } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new')

  // アクティブユーザー数
  const { count: activeUsers } = await supabase
    .from('mix_jobs')
    .select('user_id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="今日のジョブ"
          value={totalJobs.toString()}
          subtitle={`失敗: ${failedJobs}件`}
          icon={<Briefcase className="h-6 w-6" />}
          trend={totalJobs > 50 ? 'up' : 'neutral'}
        />
        
        <DashboardCard
          title="失敗率"
          value={`${failureRate}%`}
          subtitle={`${failedJobs}/${totalJobs}件`}
          icon={<AlertCircle className="h-6 w-6" />}
          trend={parseFloat(failureRate) > 5 ? 'down' : 'neutral'}
          trendBad={true}
        />
        
        <DashboardCard
          title="平均処理時間"
          value={`${avgProcessingTime}秒`}
          subtitle="完了ジョブのみ"
          icon={<Clock className="h-6 w-6" />}
          trend={avgProcessingTime > 60 ? 'down' : 'neutral'}
          trendBad={avgProcessingTime > 60}
        />
        
        <DashboardCard
          title="クレジット消費"
          value={totalCredits.toFixed(1)}
          subtitle={`${activeUsers || 0}ユーザー`}
          icon={<CreditCard className="h-6 w-6" />}
          trend="neutral"
        />
      </div>

      {/* サブ統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard
          title="未対応フィードバック"
          value={(unhandledFeedback || 0).toString()}
          subtitle="要対応"
          icon={<MessageSquare className="h-6 w-6" />}
          bgColor="bg-yellow-50"
          iconColor="text-yellow-600"
        />
        
        <DashboardCard
          title="アクティブユーザー"
          value={(activeUsers || 0).toString()}
          subtitle="本日利用"
          icon={<Users className="h-6 w-6" />}
          bgColor="bg-green-50"
          iconColor="text-green-600"
        />
        
        <DashboardCard
          title="システム状態"
          value="正常"
          subtitle="全サービス稼働中"
          icon={<TrendingUp className="h-6 w-6" />}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* 最近のアクティビティ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity type="jobs" />
        <RecentActivity type="feedback" />
      </div>

      {/* アラート・通知エリア */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              システム通知
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>ストレージ使用率: 42% (84GB / 200GB)</li>
                <li>次回自動削除: 明日 03:30 JST</li>
                <li>保留中の承認リクエスト: 0件</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}