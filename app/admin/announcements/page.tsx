'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  category: 'general' | 'update' | 'maintenance' | 'important'
  priority: number
  is_active: boolean
  published_at: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export default function AnnouncementsAdmin() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as const,
    priority: 0,
    is_active: true,
    expires_at: ''
  })

  useEffect(() => {
    checkAuth()
    fetchAnnouncements()
  }, [])

  const checkAuth = async () => {
    // 認証チェック（簡易的な実装）
    const response = await fetch('/api/auth/session')
    if (!response.ok) {
      router.push('/auth/login')
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements?includeExpired=true&limit=100')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements)
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements([data.announcement, ...announcements])
        setIsCreating(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'お知らせの作成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to create announcement:', error)
      alert('お知らせの作成に失敗しました')
    }
  }

  const handleUpdate = async (id: string) => {
    const announcement = announcements.find(a => a.id === id)
    if (!announcement) return

    try {
      const response = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...formData
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(announcements.map(a => 
          a.id === id ? data.announcement : a
        ))
        setEditingId(null)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'お知らせの更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update announcement:', error)
      alert('お知らせの更新に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このお知らせを削除しますか？')) return

    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAnnouncements(announcements.filter(a => a.id !== id))
      } else {
        alert('お知らせの削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error)
      alert('お知らせの削除に失敗しました')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !isActive })
      })

      if (response.ok) {
        setAnnouncements(announcements.map(a => 
          a.id === id ? { ...a, is_active: !isActive } : a
        ))
      }
    } catch (error) {
      console.error('Failed to toggle announcement:', error)
    }
  }

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      priority: announcement.priority,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at ? 
        new Date(announcement.expires_at).toISOString().slice(0, 16) : ''
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      priority: 0,
      is_active: true,
      expires_at: ''
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'important':
        return 'bg-red-100 text-red-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">お知らせ管理</h1>
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>新規作成</span>
                </button>
              )}
            </div>
          </div>

          {/* 新規作成フォーム */}
          {isCreating && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">タイトル</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">内容</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">カテゴリー</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="general">お知らせ</option>
                      <option value="update">アップデート</option>
                      <option value="maintenance">メンテナンス</option>
                      <option value="important">重要</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">優先度</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">有効期限（オプション）</label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleCreate}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>作成</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      resetForm()
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    <span>キャンセル</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* お知らせ一覧 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイトル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    優先度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公開日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {announcements.map((announcement) => (
                  <tr key={announcement.id} className={!announcement.is_active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded ${
                          announcement.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {announcement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="text-xs">{announcement.is_active ? '公開中' : '非公開'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === announcement.id ? (
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{announcement.title}</div>
                          <div className="text-sm text-gray-500">{announcement.content.slice(0, 50)}...</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryStyle(announcement.category)}`}>
                        {announcement.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {announcement.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(announcement.published_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {editingId === announcement.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(announcement.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                resetForm()
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(announcement)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(announcement.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}