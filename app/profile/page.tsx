'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

interface User {
  email?: string
  created_at?: string
  last_sign_in_at?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          setFullName(session.user.user_metadata?.full_name || '')
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
        setError('ユーザー情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName
        }
      })

      if (error) throw error

      setMessage('プロフィールを更新しました')
      setEditing(false)
      
      // ユーザー情報を再取得
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
    } catch (error: any) {
      setError(error.message || 'プロフィールの更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('確認用テキストが正しく入力されていません')
      return
    }

    setDeleting(true)
    setError('')

    try {
      // まず、関連データを削除するAPIを呼び出し（実装時）
      // await fetch('/api/user/delete-data', { method: 'DELETE' })

      // アカウントを削除
      const { error } = await supabase.rpc('delete_user')
      
      if (error) throw error

      // サインアウトしてホームページにリダイレクト
      await supabase.auth.signOut()
      window.location.href = '/?message=' + encodeURIComponent('アカウントが正常に削除されました')

    } catch (error: any) {
      setError(error.message || 'アカウント削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <Header currentPage="profile" />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="profile" />
      
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="card">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brandAlt)] flex items-center justify-center text-white text-2xl font-medium mx-auto mb-4">
                {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 
                 user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h1 className="text-2xl font-semibold">マイプロフィール</h1>
              <p className="mt-2 text-gray-600">
                アカウント情報を管理できます
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  メールアドレスは変更できません
                </p>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                {editing ? (
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="表示名を入力"
                    className="input"
                    disabled={saving}
                  />
                ) : (
                  <div className="input bg-gray-50 flex items-center justify-between">
                    <span className="text-gray-700">
                      {user?.user_metadata?.full_name || '未設定'}
                    </span>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-[var(--brand)] hover:text-[var(--brandAlt)] text-sm font-medium"
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>

              {editing && (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setFullName(user?.user_metadata?.full_name || '')
                      setError('')
                      setMessage('')
                    }}
                    className="btn-ghost"
                    disabled={saving}
                  >
                    キャンセル
                  </button>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント情報</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">登録日時</span>
                    <span className="text-gray-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最終ログイン</span>
                    <span className="text-gray-900">
                      {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 危険な操作セクション */}
              <div className="border-t border-red-200 pt-6 mt-6">
                <h3 className="text-lg font-medium text-red-600 mb-4 flex items-center gap-2">
                  <IconWarning className="w-5 h-5" />
                  危険な操作
                </h3>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">アカウントの削除</h4>
                  <p className="text-sm text-red-700 mb-4">
                    アカウントを削除すると、すべてのデータ（ファイル、処理履歴、設定など）が永久に失われます。
                    この操作は取り消すことができません。
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      アカウントを削除する
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-red-800 mb-2">
                          本当にアカウントを削除しますか？確認のため、以下のボックスに <strong>DELETE</strong> と入力してください：
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="DELETE と入力"
                          className="w-full px-3 py-2 border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          disabled={deleting}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting || deleteConfirmText !== 'DELETE'}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deleting ? '削除中...' : 'アカウントを削除'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false)
                            setDeleteConfirmText('')
                            setError('')
                          }}
                          disabled={deleting}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            プロフィールの変更やアカウントに関するご質問は、
            <a href="/help" className="text-[var(--brand)] hover:underline ml-1">
              サポートページ
            </a>
            からお問い合わせください。
          </p>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}