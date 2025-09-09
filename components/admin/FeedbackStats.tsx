'use client'

import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  TrendingUp, 
  HelpCircle,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'

interface FeedbackStatsProps {
  stats: {
    total: number
    new: number
    investigating: number
    resolved: number
    byType: {
      bug: number
      feature: number
      improvement: number
      contact: number
      other: number
    }
  }
}

export default function FeedbackStats({ stats }: FeedbackStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* ステータス別統計 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <span className="text-2xl font-bold text-gray-900">{stats.new}</span>
        </div>
        <p className="text-sm font-medium text-gray-600">新規</p>
        <p className="text-xs text-gray-500 mt-1">要対応</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <Clock className="h-5 w-5 text-blue-500" />
          <span className="text-2xl font-bold text-gray-900">{stats.investigating}</span>
        </div>
        <p className="text-sm font-medium text-gray-600">調査中</p>
        <p className="text-xs text-gray-500 mt-1">対応中</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-2xl font-bold text-gray-900">{stats.resolved}</span>
        </div>
        <p className="text-sm font-medium text-gray-600">解決済</p>
        <p className="text-xs text-gray-500 mt-1">完了</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <MessageSquare className="h-5 w-5 text-gray-500" />
          <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
        </div>
        <p className="text-sm font-medium text-gray-600">合計</p>
        <p className="text-xs text-gray-500 mt-1">全フィードバック</p>
      </div>

      {/* タイプ別統計 */}
      <div className="md:col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">タイプ別分布</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Bug className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.byType.bug}</p>
            <p className="text-xs text-gray-500">バグ報告</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <Lightbulb className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.byType.feature}</p>
            <p className="text-xs text-gray-500">機能要望</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.byType.improvement}</p>
            <p className="text-xs text-gray-500">改善提案</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <HelpCircle className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{stats.byType.other}</p>
            <p className="text-xs text-gray-500">その他</p>
          </div>
        </div>
      </div>
    </div>
  )
}