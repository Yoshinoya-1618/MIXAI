'use client'

import { useState } from 'react'
import { 
  Shield, 
  User, 
  Activity, 
  Calendar,
  Search,
  Filter,
  FileText,
  CreditCard,
  Settings,
  Key,
  AlertTriangle
} from 'lucide-react'

interface AuditLog {
  id: string
  actor_id: string
  actor_email?: string
  action: string
  entity?: string
  before?: any
  after?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

interface AuditLogTableProps {
  initialLogs: AuditLog[]
}

export default function AuditLogTable({ initialLogs }: AuditLogTableProps) {
  const [logs] = useState(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const getActionIcon = (action: string) => {
    if (action.startsWith('user:')) return <User className="h-4 w-4 text-blue-500" />
    if (action.startsWith('job:')) return <Activity className="h-4 w-4 text-green-500" />
    if (action.startsWith('credit:')) return <CreditCard className="h-4 w-4 text-yellow-500" />
    if (action.startsWith('auth:')) return <Key className="h-4 w-4 text-purple-500" />
    if (action.startsWith('feature_flag:')) return <Settings className="h-4 w-4 text-gray-500" />
    if (action.startsWith('security:')) return <Shield className="h-4 w-4 text-red-500" />
    return <FileText className="h-4 w-4 text-gray-500" />
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'auth:login': 'ログイン',
      'auth:logout': 'ログアウト',
      'auth:2fa_enabled': '2FA有効化',
      'auth:2fa_disabled': '2FA無効化',
      'user:created': 'ユーザー作成',
      'user:updated': 'ユーザー更新',
      'user:deleted': 'ユーザー削除',
      'user:suspend': 'ユーザー停止',
      'user:reactivate': 'ユーザー再有効化',
      'user:role_change': 'ロール変更',
      'user:credit_adjustment': 'クレジット調整',
      'job:created': 'ジョブ作成',
      'job:completed': 'ジョブ完了',
      'job:failed': 'ジョブ失敗',
      'job:cancelled': 'ジョブキャンセル',
      'credit:purchase': 'クレジット購入',
      'credit:used': 'クレジット使用',
      'credit:refund': 'クレジット返金',
      'feature_flag:toggle': 'フラグ切替',
      'feature_flag:update': 'フラグ更新',
      'security:suspicious_activity': '不審なアクティビティ',
      'security:access_denied': 'アクセス拒否',
      'feedback:status_change': 'フィードバックステータス変更'
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    if (action.includes('failed') || action.includes('denied')) return 'text-red-600'
    if (action.includes('suspicious')) return 'text-orange-600'
    if (action.includes('created') || action.includes('completed')) return 'text-green-600'
    if (action.includes('updated') || action.includes('change')) return 'text-blue-600'
    return 'text-gray-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = actionFilter === 'all' ||
      (actionFilter === 'auth' && log.action.startsWith('auth:')) ||
      (actionFilter === 'user' && log.action.startsWith('user:')) ||
      (actionFilter === 'job' && log.action.startsWith('job:')) ||
      (actionFilter === 'credit' && log.action.startsWith('credit:')) ||
      (actionFilter === 'security' && log.action.startsWith('security:'))
    
    return matchesSearch && matchesAction
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
                placeholder="アクション、ユーザー、エンティティで検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">すべてのアクション</option>
            <option value="auth">認証</option>
            <option value="user">ユーザー管理</option>
            <option value="job">ジョブ</option>
            <option value="credit">クレジット</option>
            <option value="security">セキュリティ</option>
          </select>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                実行者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                対象
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IPアドレス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                詳細
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    {formatDate(log.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getActionIcon(log.action)}
                    <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <p className="text-gray-900">{log.actor_email || 'System'}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {log.actor_id?.substring(0, 8)}...
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.entity || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {log.ip_address || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    表示
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">監査ログが見つかりません</p>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setSelectedLog(null)}
            />
            
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                監査ログ詳細
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">日時</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedLog.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">アクション</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getActionLabel(selectedLog.action)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">実行者</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.actor_email || 'System'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">対象</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.entity || '-'}
                    </p>
                  </div>
                </div>
                
                {selectedLog.before && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">変更前</label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.after && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">変更後</label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">IPアドレス</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">
                      {selectedLog.ip_address || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">ユーザーエージェント</label>
                    <p className="mt-1 text-sm text-gray-900 text-xs">
                      {selectedLog.user_agent || '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
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