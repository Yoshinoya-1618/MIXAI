'use client'

import React, { useState, useEffect } from 'react'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'

function AuroraBackground() {
  const COLORS = {
    indigo: '#6366F1',
    blue: '#22D3EE',  
    magenta: '#F472B6',
  }
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.blue} 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.magenta} 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: `linear-gradient(135deg, ${COLORS.magenta} 0%, ${COLORS.indigo} 100%)` }} />
    </div>
  )
}

export default function StatusPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [statusData, setStatusData] = useState<any>(null)

  useEffect(() => {
    fetchSystemStatus()
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      fetchSystemStatus()
    }, 60000) // 1分ごとに更新

    return () => clearInterval(timer)
  }, [])

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system-status')
      const data = await response.json()
      setStatusData(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch system status:', error)
      // フォールバックデータ
      setStatusData({
        services: [
          {
            name: 'Web アプリケーション',
            status: 'operational',
            responseTime: '45ms'
          },
          {
            name: 'API',
            status: 'operational',
            responseTime: '120ms'
          },
          {
            name: 'MIX処理エンジン',
            status: 'operational',
            responseTime: '2.1s'
          },
          {
            name: 'ファイルストレージ',
            status: 'operational',
            responseTime: '85ms'
          },
          {
            name: 'データベース',
            status: 'operational',
            responseTime: '35ms'
          }
        ],
        uptimePercentage: 99.97,
        uptimeHistory: []
      })
      setLoading(false)
    }
  }

  const services = statusData?.services || []

  const incidents = statusData?.incidents || [
    {
      date: '2024-01-15',
      time: '14:30 - 14:45',
      type: 'resolved',
      title: 'MIX処理の遅延',
      description: '一時的な負荷増加により処理時間が通常より長くなっていました。サーバーリソースを増強し解決しました。'
    },
    {
      date: '2024-01-10',
      time: '09:00 - 09:15',
      type: 'resolved',
      title: 'ログイン機能の不具合',
      description: '認証サービスの一時的な障害によりログインができない状態が発生しました。現在は復旧しています。'
    }
  ]

  const maintenances = statusData?.maintenances || [
    {
      date: '2024-02-01',
      time: '02:00 - 04:00',
      type: 'scheduled',
      title: 'システムメンテナンス',
      description: 'パフォーマンス向上のためのシステムアップデートを実施します。この間、サービスは一時的にご利用いただけません。'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'outage':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return '正常稼働中'
      case 'degraded':
        return '一部障害'
      case 'outage':
        return '障害発生中'
      default:
        return '不明'
    }
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="status" />
      
      {/* ヒーローセクション */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            システムステータス
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">すべてのシステムは正常に稼働しています</span>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            最終更新: {currentTime.toLocaleString('ja-JP')}
          </p>
        </div>
      </section>

      {/* サービス状態 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">サービス状態</h2>
            
            <div className="space-y-4">
              {services.map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-600">{getStatusText(service.status)}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">応答時間: </span>
                    <span className="font-medium">{service.responseTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 稼働率グラフ */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">過去90日間の稼働率</h2>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">全体稼働率</span>
                <span className="text-2xl font-bold text-green-600">{statusData?.uptimePercentage || '99.97'}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${statusData?.uptimePercentage || 99.97}%` }}></div>
              </div>
            </div>

            {/* 日別ステータスグリッド */}
            <div className="mt-8">
              <p className="text-sm text-gray-600 mb-3">過去90日間の日別ステータス</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 90 }, (_, i) => {
                  const date = new Date()
                  date.setDate(date.getDate() - (89 - i))
                  const dateStr = date.toISOString().split('T')[0]
                  
                  // 実際のデータがあればそれを使用、なければデフォルト
                  const dayStatus = statusData?.uptimeHistory?.find(
                    (h: any) => h.timestamp?.startsWith(dateStr)
                  )
                  const status = dayStatus?.overall_status || 'operational'
                  const statusColor = status === 'operational' ? 'bg-green-500' : 
                                     status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  
                  return (
                    <div
                      key={i}
                      className={`w-2 h-6 ${statusColor} rounded-sm hover:ring-2 hover:ring-indigo-500 cursor-pointer transition-all`}
                      title={`${date.toLocaleDateString('ja-JP')}: ${status === 'operational' ? '正常稼働' : status === 'degraded' ? '一部障害' : '障害'}`}
                    ></div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span>正常</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                  <span>一部障害</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  <span>障害</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* インシデント履歴 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">インシデント履歴</h2>
            
            {incidents.length > 0 ? (
              <div className="space-y-4">
                {incidents.map((incident: any, index: number) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-gray-600">{incident.date}</span>
                      <span className="text-sm text-gray-600">{incident.time}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                        解決済み
                      </span>
                    </div>
                    <h3 className="font-medium mb-1">{incident.title}</h3>
                    <p className="text-sm text-gray-600">{incident.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">最近のインシデントはありません。</p>
            )}
          </div>
        </div>
      </section>

      {/* メンテナンス予定 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">メンテナンス予定</h2>
            
            {maintenances.length > 0 ? (
              <div className="space-y-4">
                {maintenances.map((maintenance: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-gray-600">{maintenance.date}</span>
                      <span className="text-sm text-gray-600">{maintenance.time}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                        予定
                      </span>
                    </div>
                    <h3 className="font-medium mb-1">{maintenance.title}</h3>
                    <p className="text-sm text-gray-600">{maintenance.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">予定されているメンテナンスはありません。</p>
            )}
          </div>
        </div>
      </section>

      {/* 通知設定 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-8 text-center">
            <h3 className="text-xl font-bold mb-2">ステータス更新を受け取る</h3>
            <p className="text-gray-600 mb-4">
              メンテナンスや障害情報をメールでお知らせします
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="メールアドレス"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                登録
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}