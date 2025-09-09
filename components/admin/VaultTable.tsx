'use client'

import { useState } from 'react'
import { 
  FileAudio, 
  Download, 
  Trash2, 
  Clock,
  User,
  HardDrive,
  Calendar,
  Search,
  Filter,
  Eye,
  Archive
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface VaultFile {
  id: string
  user_id: string
  file_path: string
  file_type: string
  file_size: number
  job_id?: string
  created_at: string
  accessed_at?: string
  scheduled_deletion_at?: string
  deleted_at?: string
  metadata?: any
  profiles?: {
    email: string
  }
}

interface VaultTableProps {
  initialFiles: VaultFile[]
}

export default function VaultTable({ initialFiles }: VaultTableProps) {
  const [files, setFiles] = useState(initialFiles)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null)
  const supabase = createClientComponentClient()

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileTypeIcon = (type: string) => {
    const color = type === 'audio' ? 'text-blue-500' :
                  type === 'preview' ? 'text-green-500' :
                  type === 'master' ? 'text-purple-500' :
                  'text-gray-500'
    return <FileAudio className={`h-4 w-4 ${color}`} />
  }

  const getFileTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'audio': 'オーディオ',
      'preview': 'プレビュー',
      'master': 'マスター',
      'inst': 'インスト',
      'vocal': 'ボーカル'
    }
    return labels[type] || type
  }

  const deleteFile = async (file: VaultFile) => {
    if (!confirm('このファイルを削除しますか？')) return

    const { error } = await supabase
      .from('vault')
      .update({ 
        deleted_at: new Date().toISOString(),
        scheduled_deletion_at: null
      })
      .eq('id', file.id)

    if (!error) {
      setFiles(files.map(f => 
        f.id === file.id 
          ? { ...f, deleted_at: new Date().toISOString() }
          : f
      ))

      // 監査ログ記録
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: user?.id,
          action: 'vault:delete',
          entity: `file:${file.id}`,
          after: { file_path: file.file_path }
        })
    }
  }

  const scheduleDeletion = async (file: VaultFile, days: number) => {
    const deletionDate = new Date()
    deletionDate.setDate(deletionDate.getDate() + days)

    const { error } = await supabase
      .from('vault')
      .update({ 
        scheduled_deletion_at: deletionDate.toISOString()
      })
      .eq('id', file.id)

    if (!error) {
      setFiles(files.map(f => 
        f.id === file.id 
          ? { ...f, scheduled_deletion_at: deletionDate.toISOString() }
          : f
      ))

      alert(`${days}日後に削除予定を設定しました`)
    }
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = searchTerm === '' ||
      file.file_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.job_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === 'all' || file.file_type === typeFilter
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && !file.deleted_at) ||
      (statusFilter === 'deleted' && file.deleted_at) ||
      (statusFilter === 'scheduled' && file.scheduled_deletion_at && !file.deleted_at)
    
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <>
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ファイルパス、ジョブID、ユーザーで検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">すべてのタイプ</option>
            <option value="audio">オーディオ</option>
            <option value="preview">プレビュー</option>
            <option value="master">マスター</option>
            <option value="inst">インスト</option>
            <option value="vocal">ボーカル</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="active">アクティブ</option>
            <option value="scheduled">削除予定</option>
            <option value="deleted">削除済み</option>
            <option value="all">すべて</option>
          </select>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ファイル
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイプ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                サイズ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <tr key={file.id} className={`hover:bg-gray-50 ${file.deleted_at ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="text-gray-900 font-mono text-xs truncate max-w-xs">
                      {file.file_path.split('/').pop()}
                    </p>
                    {file.job_id && (
                      <p className="text-xs text-gray-500">
                        Job: {file.job_id.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getFileTypeIcon(file.file_type)}
                    <span className="text-sm text-gray-900">
                      {getFileTypeLabel(file.file_type)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm">
                    <HardDrive className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-gray-900">{formatFileSize(file.file_size)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-gray-900">
                      {file.profiles?.email || file.user_id.substring(0, 8) + '...'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    {formatDate(file.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {file.deleted_at ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      削除済み
                    </span>
                  ) : file.scheduled_deletion_at ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(file.scheduled_deletion_at).toLocaleDateString('ja-JP')} 削除予定
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      アクティブ
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedFile(file)}
                      className="text-gray-600 hover:text-gray-900"
                      title="詳細"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {!file.deleted_at && (
                      <>
                        <button
                          onClick={() => scheduleDeletion(file, 7)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="7日後に削除"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteFile(file)}
                          className="text-red-600 hover:text-red-900"
                          title="今すぐ削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredFiles.length === 0 && (
          <div className="text-center py-12">
            <Archive className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">ファイルが見つかりません</p>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setSelectedFile(null)}
            />
            
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ファイル詳細
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ファイルパス</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono break-all">
                    {selectedFile.file_path}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">タイプ</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getFileTypeLabel(selectedFile.file_type)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">サイズ</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatFileSize(selectedFile.file_size)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">作成日時</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedFile.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">最終アクセス</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedFile.accessed_at ? formatDate(selectedFile.accessed_at) : '未アクセス'}
                    </p>
                  </div>
                </div>
                
                {selectedFile.scheduled_deletion_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">削除予定日</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedFile.scheduled_deletion_at)}
                    </p>
                  </div>
                )}
                
                {selectedFile.metadata && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">メタデータ</label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedFile.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}