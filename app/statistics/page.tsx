'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

interface UsageStats {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  totalProcessingTime: number // 秒
  averageProcessingTime: number // 秒
  totalStorageUsed: number // MB
  mostUsedPlan: string
  mostUsedGenre: string
  monthlyUsage: MonthlyUsage[]
  planUsage: PlanUsage[]
  genreDistribution: GenreStats[]
  dailyActivity: DailyActivity[]
}

interface MonthlyUsage {
  month: string
  jobs: number
  storageUsed: number
  processingTime: number
}

interface PlanUsage {
  plan: string
  count: number
  percentage: number
}

interface GenreStats {
  genre: string
  count: number
  averageRating: number
}

interface DailyActivity {
  date: string
  jobs: number
  peakHour: number
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'trends'>('overview')

  useEffect(() => {
    fetchStatistics()
  }, [timeRange])

  const fetchStatistics = async () => {
    try {
      // Mock data - 実際のAPIエンドポイントに置き換える
      const mockStats: UsageStats = {
        totalJobs: 127,
        completedJobs: 118,
        failedJobs: 9,
        totalProcessingTime: 15420, // 4.3時間
        averageProcessingTime: 131, // 2分11秒
        totalStorageUsed: 2847, // MB
        mostUsedPlan: 'Standard',
        mostUsedGenre: 'J-Pop',
        monthlyUsage: [
          { month: '2024-01', jobs: 23, storageUsed: 542, processingTime: 2890 },
          { month: '2024-02', jobs: 31, storageUsed: 721, processingTime: 3940 },
          { month: '2024-03', jobs: 28, storageUsed: 634, processingTime: 3210 },
          { month: '2024-04', jobs: 45, storageUsed: 950, processingTime: 5380 }
        ],
        planUsage: [
          { plan: 'Lite', count: 42, percentage: 33.1 },
          { plan: 'Standard', count: 67, percentage: 52.8 },
          { plan: 'Creator', count: 18, percentage: 14.1 }
        ],
        genreDistribution: [
          { genre: 'J-Pop', count: 48, averageRating: 4.2 },
          { genre: 'Rock', count: 35, averageRating: 4.0 },
          { genre: 'Electronic', count: 22, averageRating: 4.1 },
          { genre: 'Jazz', count: 12, averageRating: 4.4 },
          { genre: 'Classical', count: 10, averageRating: 4.3 }
        ],
        dailyActivity: [
          { date: '2024-04-01', jobs: 3, peakHour: 14 },
          { date: '2024-04-02', jobs: 5, peakHour: 20 },
          { date: '2024-04-03', jobs: 2, peakHour: 10 },
          { date: '2024-04-04', jobs: 8, peakHour: 15 },
          { date: '2024-04-05', jobs: 4, peakHour: 19 }
        ]
      }

      setTimeout(() => {
        setStats(mockStats)
        setLoading(false)
      }, 1000)

    } catch (error) {
      console.error('Failed to fetch statistics:', error)
      setError('統計データの取得に失敗しました')
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}時間${minutes}分`
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`
    } else {
      return `${secs}秒`
    }
  }

  const formatStorage = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`
    }
    return `${mb}MB`
  }

  const getSuccessRate = (): number => {
    if (!stats) return 0
    return Math.round((stats.completedJobs / stats.totalJobs) * 100)
  }

  if (loading) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <Header currentPage="statistics" />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="statistics" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">利用統計</h1>
              <p className="mt-2 text-gray-600">あなたのMIXAI使用状況の詳細分析</p>
            </div>
            
            {/* フィルターとビューモード */}
            <div className="mt-4 sm:mt-0 flex gap-4">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <option value="7d">過去7日</option>
                <option value="30d">過去30日</option>
                <option value="90d">過去90日</option>
                <option value="1y">過去1年</option>
                <option value="all">全期間</option>
              </select>
              
              <div className="flex bg-gray-100 rounded">
                {[
                  { key: 'overview', label: '概要' },
                  { key: 'detailed', label: '詳細' },
                  { key: 'trends', label: '傾向' }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key as any)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === mode.key
                        ? 'bg-[var(--brand)] text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {stats && (
          <>
            {/* 概要カード */}
            {viewMode === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">総処理数</h3>
                    <IconMusic className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalJobs}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    成功率: {getSuccessRate()}%
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">総処理時間</h3>
                    <IconClock className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatTime(stats.totalProcessingTime)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    平均: {formatTime(stats.averageProcessingTime)}
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">使用容量</h3>
                    <IconStorage className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatStorage(stats.totalStorageUsed)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ファイル平均: {formatStorage(Math.round(stats.totalStorageUsed / stats.totalJobs))}
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">人気プラン</h3>
                    <IconTrend className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stats.mostUsedPlan}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    人気ジャンル: {stats.mostUsedGenre}
                  </div>
                </div>
              </div>
            )}

            {/* 詳細統計 */}
            {viewMode === 'detailed' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* プラン使用状況 */}
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">プラン別使用状況</h3>
                  <div className="space-y-4">
                    {stats.planUsage.map((plan) => (
                      <div key={plan.plan} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            plan.plan === 'Lite' ? 'bg-blue-500' :
                            plan.plan === 'Standard' ? 'bg-green-500' : 'bg-purple-500'
                          }`} />
                          <span className="font-medium">{plan.plan}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{plan.count}回</div>
                          <div className="text-sm text-gray-500">{plan.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ジャンル分析 */}
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">ジャンル別分析</h3>
                  <div className="space-y-4">
                    {stats.genreDistribution.map((genre) => (
                      <div key={genre.genre} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{genre.genre}</div>
                          <div className="text-sm text-gray-500">
                            {genre.count}回 • 評価 {genre.averageRating}/5.0
                          </div>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[var(--brand)] h-2 rounded-full"
                            style={{ width: `${(genre.count / Math.max(...stats.genreDistribution.map(g => g.count))) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* トレンド分析 */}
            {viewMode === 'trends' && (
              <div className="space-y-8">
                {/* 月別使用状況 */}
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">月別使用傾向</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2">月</th>
                          <th className="text-right py-2">処理数</th>
                          <th className="text-right py-2">使用容量</th>
                          <th className="text-right py-2">処理時間</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.monthlyUsage.map((month) => (
                          <tr key={month.month} className="border-b border-gray-100">
                            <td className="py-2 font-medium">
                              {new Date(month.month).toLocaleDateString('ja-JP', { 
                                year: 'numeric', 
                                month: 'long' 
                              })}
                            </td>
                            <td className="text-right py-2">{month.jobs}回</td>
                            <td className="text-right py-2">{formatStorage(month.storageUsed)}</td>
                            <td className="text-right py-2">{formatTime(month.processingTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 日別アクティビティ */}
                <div className="card p-6">
                  <h3 className="text-xl font-semibold mb-4">最近のアクティビティ</h3>
                  <div className="space-y-3">
                    {stats.dailyActivity.map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">
                            {new Date(day.date).toLocaleDateString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            ピーク時間: {day.peakHour}時
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{day.jobs}</div>
                          <div className="text-sm text-gray-500">処理</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* データエクスポート */}
            <div className="mt-8 text-center">
              <div className="card p-6 inline-block">
                <h3 className="text-lg font-semibold mb-2">データのエクスポート</h3>
                <p className="text-gray-600 mb-4">
                  利用統計をCSVファイルでダウンロードできます
                </p>
                <button className="btn-ghost">
                  <IconDownload className="w-4 h-4 mr-2" />
                  統計データをダウンロード
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </main>
  )
}

// アイコンコンポーネント
function IconMusic({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  )
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function IconStorage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
    </svg>
  )
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}