import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, FileAudio, Clock, HardDrive, Trash2, Archive } from 'lucide-react'
import VaultTable from '../../../components/admin/VaultTable'

export const dynamic = 'force-dynamic'

export default async function VaultManagement() {
  const supabase = createServerComponentClient({ cookies })
  
  // 保管ファイル情報を取得
  const { data: vaultFiles, error } = await supabase
    .from('vault')
    .select(`
      *,
      profiles (email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching vault files:', error)
  }

  // ストレージ統計を計算
  const stats = {
    totalFiles: vaultFiles?.length || 0,
    totalSize: vaultFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0,
    activeFiles: vaultFiles?.filter(f => !f.deleted_at).length || 0,
    scheduledDeletion: vaultFiles?.filter(f => f.scheduled_deletion_at && !f.deleted_at).length || 0,
    averageRetention: 30, // days
    totalUsers: new Set(vaultFiles?.map(f => f.user_id)).size
  }

  // 保持ポリシー情報を取得
  const { data: retentionPolicies } = await supabase
    .from('retention_policies')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">保管庫管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          ファイルストレージと保持ポリシーの管理
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <FileAudio className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalFiles}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">総ファイル数</p>
          <p className="text-xs text-gray-500 mt-1">
            アクティブ: {stats.activeFiles}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">
              {(stats.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">総容量</p>
          <p className="text-xs text-gray-500 mt-1">使用中</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.scheduledDeletion}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">削除予定</p>
          <p className="text-xs text-gray-500 mt-1">ファイル</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Archive className="h-5 w-5 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.averageRetention}日</span>
          </div>
          <p className="text-sm font-medium text-gray-600">平均保持期間</p>
          <p className="text-xs text-gray-500 mt-1">デフォルト</p>
        </div>
      </div>

      {/* 保持ポリシー */}
      {retentionPolicies && retentionPolicies.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">保持ポリシー</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {retentionPolicies.map((policy) => (
              <div key={policy.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{policy.name}</span>
                  {policy.is_active && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      有効
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  対象: {policy.entity_type === 'job' ? 'ジョブファイル' : 
                        policy.entity_type === 'preview' ? 'プレビュー' : 
                        policy.entity_type === 'temp' ? '一時ファイル' : 'その他'}
                </p>
                <p className="text-sm text-gray-600">
                  保持期間: {policy.retention_days}日
                </p>
                {policy.conditions && (
                  <p className="text-xs text-gray-500 mt-2">
                    条件: {JSON.stringify(policy.conditions)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-900 mb-3">クイックアクション</h3>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-white border border-yellow-300 rounded-md text-sm text-yellow-700 hover:bg-yellow-100">
            <Trash2 className="h-4 w-4 mr-2" />
            期限切れファイルを削除
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-white border border-yellow-300 rounded-md text-sm text-yellow-700 hover:bg-yellow-100">
            <Archive className="h-4 w-4 mr-2" />
            古いファイルをアーカイブ
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-white border border-yellow-300 rounded-md text-sm text-yellow-700 hover:bg-yellow-100">
            <Database className="h-4 w-4 mr-2" />
            ストレージ最適化
          </button>
        </div>
      </div>

      {/* ファイルテーブル */}
      <VaultTable initialFiles={vaultFiles || []} />
    </div>
  )
}