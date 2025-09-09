'use client'

import { useState } from 'react'
import { X, Copy, Shield, CreditCard, Activity, AlertTriangle, Lock } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UserDetailModalProps {
  user: any
  onClose: () => void
  onUpdate: () => void
}

export default function UserDetailModal({ user, onClose, onUpdate }: UserDetailModalProps) {
  const [creditAdjustment, setCreditAdjustment] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [newRole, setNewRole] = useState(user.roles || 'user')
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClientComponentClient()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const adjustCredits = async () => {
    if (!creditAdjustment || !adjustmentReason.trim()) {
      alert('調整額と理由を入力してください')
      return
    }

    setProcessing(true)
    try {
      const adjustment = parseInt(creditAdjustment)
      const newBalance = (user.credits || 0) + adjustment

      // クレジット更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', user.id)

      if (updateError) throw updateError

      // 監査ログ記録
      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: admin?.id,
          action: 'user:credit_adjustment',
          entity: `user:${user.id}`,
          before: { credits: user.credits || 0 },
          after: { credits: newBalance, adjustment, reason: adjustmentReason }
        })

      alert(`クレジットを調整しました (${adjustment > 0 ? '+' : ''}${adjustment})`)
      setCreditAdjustment('')
      setAdjustmentReason('')
      onUpdate()
    } catch (error) {
      console.error('Credit adjustment failed:', error)
      alert('クレジット調整に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const updateRole = async () => {
    if (newRole === user.roles) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roles: newRole })
        .eq('id', user.id)

      if (error) throw error

      // 監査ログ記録
      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: admin?.id,
          action: 'user:role_change',
          entity: `user:${user.id}`,
          before: { role: user.roles },
          after: { role: newRole }
        })

      alert('ロールを更新しました')
      onUpdate()
    } catch (error) {
      console.error('Role update failed:', error)
      alert('ロール更新に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const suspendUser = async () => {
    if (!confirm('このユーザーを停止しますか？')) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ suspended: true, suspended_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) throw error

      // 監査ログ記録
      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: admin?.id,
          action: 'user:suspend',
          entity: `user:${user.id}`
        })

      alert('ユーザーを停止しました')
      onUpdate()
    } catch (error) {
      console.error('User suspension failed:', error)
      alert('ユーザー停止に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  const reactivateUser = async () => {
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ suspended: false, suspended_at: null })
        .eq('id', user.id)

      if (error) throw error

      // 監査ログ記録
      const { data: { user: admin } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: admin?.id,
          action: 'user:reactivate',
          entity: `user:${user.id}`
        })

      alert('ユーザーを再有効化しました')
      onUpdate()
    } catch (error) {
      console.error('User reactivation failed:', error)
      alert('ユーザー再有効化に失敗しました')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              ユーザー詳細
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">基本情報</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ユーザーID</span>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-gray-900">{user.id}</code>
                      <button
                        onClick={() => copyToClipboard(user.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">メールアドレス</span>
                    <span className="text-sm text-gray-900">{user.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">登録日</span>
                    <span className="text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">最終ログイン</span>
                    <span className="text-sm text-gray-900">
                      {user.last_login_at 
                        ? new Date(user.last_login_at).toLocaleString('ja-JP')
                        : '未ログイン'}
                    </span>
                  </div>
                </div>
              </div>

              {/* クレジット管理 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  クレジット管理
                </h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">現在のクレジット</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {user.credits || 0}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        クレジット調整
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={creditAdjustment}
                          onChange={(e) => setCreditAdjustment(e.target.value)}
                          placeholder="+100 or -50"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <button
                          onClick={() => setCreditAdjustment('100')}
                          className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => setCreditAdjustment('-50')}
                          className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          -50
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        調整理由
                      </label>
                      <textarea
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="例: サポート対応による補償"
                      />
                    </div>
                    <button
                      onClick={adjustCredits}
                      disabled={!creditAdjustment || !adjustmentReason.trim() || processing}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      クレジットを調整
                    </button>
                  </div>
                </div>
              </div>

              {/* ロール管理 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  ロール管理
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="user">一般ユーザー</option>
                      <option value="read_only">読み取り専用</option>
                      <option value="support">サポート</option>
                      <option value="ops">運用</option>
                      <option value="admin">管理者</option>
                    </select>
                    <button
                      onClick={updateRole}
                      disabled={newRole === user.roles || processing}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                    >
                      更新
                    </button>
                  </div>
                </div>
              </div>

              {/* アカウント管理 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Lock className="h-4 w-4 mr-1" />
                  アカウント管理
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {user.suspended ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">このアカウントは停止中です</span>
                      </div>
                      {user.suspended_at && (
                        <p className="text-sm text-gray-600">
                          停止日時: {new Date(user.suspended_at).toLocaleString('ja-JP')}
                        </p>
                      )}
                      <button
                        onClick={reactivateUser}
                        disabled={processing}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        アカウントを再有効化
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={suspendUser}
                      disabled={processing}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      アカウントを停止
                    </button>
                  )}
                </div>
              </div>

              {/* 利用統計 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-1" />
                  利用統計
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">総ジョブ数</span>
                    <p className="text-lg font-semibold text-gray-900">{user.total_jobs || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">総クレジット使用</span>
                    <p className="text-lg font-semibold text-gray-900">{user.total_credits_used || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">最終利用日</span>
                    <p className="text-sm text-gray-900">
                      {user.last_job_at 
                        ? new Date(user.last_job_at).toLocaleDateString('ja-JP')
                        : '利用なし'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">プラン</span>
                    <p className="text-sm font-medium text-gray-900">{user.plan || 'free'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            {copied && (
              <span className="text-sm text-green-600">コピーしました！</span>
            )}
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}