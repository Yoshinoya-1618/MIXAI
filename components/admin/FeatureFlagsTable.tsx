'use client'

import { useState } from 'react'
import { 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  Users, 
  Edit2,
  Save,
  X,
  Percent
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface FeatureFlag {
  id: string
  name: string
  key: string
  description?: string
  is_enabled: boolean
  rollout_percentage?: number
  allowed_users?: string[]
  metadata?: any
  created_at: string
  updated_at: string
}

interface FeatureFlagsTableProps {
  initialFlags: FeatureFlag[]
}

export default function FeatureFlagsTable({ initialFlags }: FeatureFlagsTableProps) {
  const [flags, setFlags] = useState(initialFlags)
  const [editingFlag, setEditingFlag] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const supabase = createClientComponentClient()

  const toggleFlag = async (flag: FeatureFlag) => {
    const newValue = !flag.is_enabled
    
    const { error } = await supabase
      .from('feature_flags')
      .update({ 
        is_enabled: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', flag.id)

    if (!error) {
      setFlags(flags.map(f => 
        f.id === flag.id ? { ...f, is_enabled: newValue } : f
      ))

      // 監査ログ記録
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: user?.id,
          action: 'feature_flag:toggle',
          entity: `flag:${flag.key}`,
          before: { is_enabled: flag.is_enabled },
          after: { is_enabled: newValue }
        })
    }
  }

  const startEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag.id)
    setEditValues({
      description: flag.description || '',
      rollout_percentage: flag.rollout_percentage || 100,
      allowed_users: flag.allowed_users?.join(', ') || ''
    })
  }

  const saveEdit = async (flag: FeatureFlag) => {
    const updates = {
      description: editValues.description,
      rollout_percentage: parseInt(editValues.rollout_percentage),
      allowed_users: editValues.allowed_users
        ? editValues.allowed_users.split(',').map((u: string) => u.trim()).filter(Boolean)
        : [],
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('id', flag.id)

    if (!error) {
      setFlags(flags.map(f => 
        f.id === flag.id ? { ...f, ...updates } : f
      ))
      setEditingFlag(null)

      // 監査ログ記録
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: user?.id,
          action: 'feature_flag:update',
          entity: `flag:${flag.key}`,
          after: updates
        })
    }
  }

  const cancelEdit = () => {
    setEditingFlag(null)
    setEditValues({})
  }

  const getFlagStatusColor = (flag: FeatureFlag) => {
    if (!flag.is_enabled) return 'bg-gray-100 text-gray-800'
    if (flag.rollout_percentage && flag.rollout_percentage < 100) {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const getFlagStatus = (flag: FeatureFlag) => {
    if (!flag.is_enabled) return '無効'
    if (flag.rollout_percentage && flag.rollout_percentage < 100) {
      return `${flag.rollout_percentage}% 展開中`
    }
    if (flag.allowed_users && flag.allowed_users.length > 0) {
      return '限定公開'
    }
    return '有効'
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              機能フラグ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              展開率
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              対象ユーザー
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              更新日時
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {flags.map((flag) => (
            <tr key={flag.id} className="hover:bg-gray-50">
              {editingFlag === flag.id ? (
                <>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {flag.key}
                      </code>
                      <textarea
                        value={editValues.description}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        rows={2}
                        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                        placeholder="説明を入力..."
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleFlag(flag)}
                      className="flex items-center"
                    >
                      {flag.is_enabled ? (
                        <ToggleRight className="h-8 w-8 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editValues.rollout_percentage}
                        onChange={(e) => setEditValues({ ...editValues, rollout_percentage: e.target.value })}
                        className="w-20 text-sm border border-gray-300 rounded-md px-2 py-1"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editValues.allowed_users}
                      onChange={(e) => setEditValues({ ...editValues, allowed_users: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                      placeholder="user1@example.com, user2@example.com"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(flag.updated_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => saveEdit(flag)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {flag.key}
                      </code>
                      {flag.description && (
                        <p className="text-sm text-gray-500 mt-1">{flag.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleFlag(flag)}
                        className="flex items-center"
                      >
                        {flag.is_enabled ? (
                          <ToggleRight className="h-8 w-8 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFlagStatusColor(flag)}`}>
                        {getFlagStatus(flag)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm">
                      <Percent className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="font-medium">{flag.rollout_percentage || 100}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 text-gray-400 mr-1" />
                      {flag.allowed_users && flag.allowed_users.length > 0 ? (
                        <span>{flag.allowed_users.length} ユーザー</span>
                      ) : (
                        <span className="text-gray-500">全員</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      {new Date(flag.updated_at).toLocaleString('ja-JP')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => startEdit(flag)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {flags.length === 0 && (
        <div className="text-center py-12">
          <ToggleLeft className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">機能フラグが設定されていません</p>
        </div>
      )}
    </div>
  )
}