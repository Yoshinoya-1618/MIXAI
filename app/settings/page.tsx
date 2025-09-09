'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'
import { Switch } from '../../components/ui/switch'

interface UserSettings {
  notifications: {
    email: boolean
    browser: boolean
    processing: boolean
    marketing: boolean
  }
  privacy: {
    dataCollection: boolean
    analytics: boolean
    personalizedAds: boolean
  }
  processing: {
    autoDeleteAfterDays: number
    defaultQuality: 'high' | 'medium' | 'low'
    defaultFormat: 'mp3' | 'wav' | 'flac'
    aiOptimization: boolean
  }
  interface: {
    theme: 'light' | 'dark' | 'auto'
    language: 'ja' | 'en'
    compactView: boolean
    showTips: boolean
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      browser: true,
      processing: true,
      marketing: false
    },
    privacy: {
      dataCollection: true,
      analytics: true,
      personalizedAds: false
    },
    processing: {
      autoDeleteAfterDays: 30,
      defaultQuality: 'high',
      defaultFormat: 'mp3',
      aiOptimization: true
    },
    interface: {
      theme: 'auto',
      language: 'ja',
      compactView: false,
      showTips: true
    }
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'processing' | 'interface'>('notifications')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // 実際のAPIから設定を読み込み
      // const { data } = await supabase.from('user_settings').select('*')
      
      // Mock処理
      setTimeout(() => {
        setLoading(false)
      }, 500)

    } catch (error) {
      console.error('Failed to load settings:', error)
      setError('設定の読み込みに失敗しました')
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      // 実際のAPIに設定を保存
      // await supabase.from('user_settings').upsert(settings)
      
      // Mock処理
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('設定が保存されました')
      setTimeout(() => setMessage(''), 3000)

    } catch (error: any) {
      setError(error.message || '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const resetToDefaults = () => {
    if (confirm('すべての設定をデフォルト値にリセットしますか？この操作は元に戻せません。')) {
      setSettings({
        notifications: {
          email: true,
          browser: true,
          processing: true,
          marketing: false
        },
        privacy: {
          dataCollection: true,
          analytics: true,
          personalizedAds: false
        },
        processing: {
          autoDeleteAfterDays: 30,
          defaultQuality: 'high',
          defaultFormat: 'mp3',
          aiOptimization: true
        },
        interface: {
          theme: 'auto',
          language: 'ja',
          compactView: false,
          showTips: true
        }
      })
    }
  }

  const tabs = [
    { id: 'notifications', label: '通知', icon: IconBell },
    { id: 'privacy', label: 'プライバシー', icon: IconShield },
    { id: 'processing', label: '処理設定', icon: IconCog },
    { id: 'interface', label: 'インターフェース', icon: IconPalette }
  ]

  if (loading) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <AuroraBackground />
        <Header currentPage="settings" />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="settings" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">設定</h1>
          <p className="mt-2 text-gray-600">アプリケーションの動作をカスタマイズできます</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* サイドバータブ */}
          <div className="lg:w-64">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[var(--brand)] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 設定コンテンツ */}
          <div className="flex-1">
            <div className="card p-8">
              
              {/* 通知設定 */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">通知設定</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">メール通知</h3>
                        <p className="text-sm text-gray-600">重要な情報をメールで受信</p>
                      </div>
                      <Switch
                        checked={settings.notifications.email}
                        onCheckedChange={(value) => updateSetting('notifications', 'email', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">ブラウザ通知</h3>
                        <p className="text-sm text-gray-600">デスクトップ通知を表示</p>
                      </div>
                      <Switch
                        checked={settings.notifications.browser}
                        onCheckedChange={(value) => updateSetting('notifications', 'browser', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">処理完了通知</h3>
                        <p className="text-sm text-gray-600">音声処理が完了したときに通知</p>
                      </div>
                      <Switch
                        checked={settings.notifications.processing}
                        onCheckedChange={(value) => updateSetting('notifications', 'processing', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">マーケティング情報</h3>
                        <p className="text-sm text-gray-600">新機能やキャンペーンの情報</p>
                      </div>
                      <Switch
                        checked={settings.notifications.marketing}
                        onCheckedChange={(value) => updateSetting('notifications', 'marketing', value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* プライバシー設定 */}
              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">プライバシー設定</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">データ収集</h3>
                        <p className="text-sm text-gray-600">サービス改善のためのデータ収集</p>
                      </div>
                      <Switch
                        checked={settings.privacy.dataCollection}
                        onCheckedChange={(value) => updateSetting('privacy', 'dataCollection', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">利用分析</h3>
                        <p className="text-sm text-gray-600">匿名化された利用統計の収集</p>
                      </div>
                      <Switch
                        checked={settings.privacy.analytics}
                        onCheckedChange={(value) => updateSetting('privacy', 'analytics', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">パーソナライズド広告</h3>
                        <p className="text-sm text-gray-600">興味に基づいた広告の表示</p>
                      </div>
                      <Switch
                        checked={settings.privacy.personalizedAds}
                        onCheckedChange={(value) => updateSetting('privacy', 'personalizedAds', value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 処理設定 */}
              {activeTab === 'processing' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">処理設定</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block font-medium mb-2">自動削除期間</label>
                      <select
                        value={settings.processing.autoDeleteAfterDays}
                        onChange={(e) => updateSetting('processing', 'autoDeleteAfterDays', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      >
                        <option value={7}>7日後</option>
                        <option value={30}>30日後</option>
                        <option value={90}>90日後</option>
                        <option value={365}>1年後</option>
                      </select>
                      <p className="text-sm text-gray-600 mt-1">
                        処理済みファイルの自動削除タイミング
                      </p>
                    </div>

                    <div>
                      <label className="block font-medium mb-2">デフォルト品質</label>
                      <select
                        value={settings.processing.defaultQuality}
                        onChange={(e) => updateSetting('processing', 'defaultQuality', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      >
                        <option value="high">高品質（処理時間長）</option>
                        <option value="medium">標準品質</option>
                        <option value="low">低品質（処理時間短）</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium mb-2">デフォルト形式</label>
                      <select
                        value={settings.processing.defaultFormat}
                        onChange={(e) => updateSetting('processing', 'defaultFormat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      >
                        <option value="mp3">MP3（圧縮音声）</option>
                        <option value="wav">WAV（無圧縮）</option>
                        <option value="flac">FLAC（可逆圧縮）</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">AI最適化</h3>
                        <p className="text-sm text-gray-600">AI による自動最適化を有効化</p>
                      </div>
                      <Switch
                        checked={settings.processing.aiOptimization}
                        onCheckedChange={(value) => updateSetting('processing', 'aiOptimization', value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* インターフェース設定 */}
              {activeTab === 'interface' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">インターフェース設定</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block font-medium mb-2">テーマ</label>
                      <select
                        value={settings.interface.theme}
                        onChange={(e) => updateSetting('interface', 'theme', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      >
                        <option value="auto">自動（システム設定に従う）</option>
                        <option value="light">ライトテーマ</option>
                        <option value="dark">ダークテーマ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium mb-2">言語</label>
                      <select
                        value={settings.interface.language}
                        onChange={(e) => updateSetting('interface', 'language', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      >
                        <option value="ja">日本語</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">コンパクトビュー</h3>
                        <p className="text-sm text-gray-600">より多くの情報を一度に表示</p>
                      </div>
                      <Switch
                        checked={settings.interface.compactView}
                        onCheckedChange={(value) => updateSetting('interface', 'compactView', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">ヒント表示</h3>
                        <p className="text-sm text-gray-600">操作ヒントやツールチップを表示</p>
                      </div>
                      <Switch
                        checked={settings.interface.showTips}
                        onCheckedChange={(value) => updateSetting('interface', 'showTips', value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 保存ボタン */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={resetToDefaults}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  デフォルトにリセット
                </button>
                
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : '設定を保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}

// アイコンコンポーネント
function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  )
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

function IconCog({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function IconPalette({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
    </svg>
  )
}

function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl" 
           style={{ background: `linear-gradient(135deg, var(--indigo) 0%, var(--blue) 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" 
           style={{ background: `linear-gradient(135deg, var(--blue) 0%, var(--magenta) 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: `linear-gradient(135deg, var(--magenta) 0%, var(--indigo) 100%)` }} />
    </div>
  )
}