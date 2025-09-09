import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import FeatureFlagsTable from '../../../components/admin/FeatureFlagsTable'
import { ToggleLeft, Activity, Users, Clock } from 'lucide-react'

export default async function FeatureFlagsManagement() {
  const supabase = createServerComponentClient({ cookies })
  
  // 機能フラグデータ取得
  const { data: flags, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching feature flags:', error)
  }

  // 既存のフラグがない場合、デフォルトフラグを作成
  if (!flags || flags.length === 0) {
    const defaultFlags = [
      {
        name: '新MIXエンジン',
        key: 'new_mix_engine',
        description: '改良版のMIXエンジンを有効化',
        is_enabled: false,
        rollout_percentage: 0
      },
      {
        name: 'プレミアムプラン',
        key: 'premium_plan',
        description: 'プレミアムプランの表示と購入を有効化',
        is_enabled: true,
        rollout_percentage: 100
      },
      {
        name: 'AIフィードバック',
        key: 'ai_feedback',
        description: 'AI自動フィードバック機能',
        is_enabled: false,
        rollout_percentage: 10
      },
      {
        name: 'バッチ処理',
        key: 'batch_processing',
        description: '複数ファイルの一括処理',
        is_enabled: false,
        rollout_percentage: 0
      },
      {
        name: 'ソーシャル共有',
        key: 'social_sharing',
        description: 'SNSへの共有機能',
        is_enabled: true,
        rollout_percentage: 100
      }
    ]

    for (const flag of defaultFlags) {
      await supabase.from('feature_flags').insert(flag)
    }

    // 再取得
    const { data: newFlags } = await supabase
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (flags && newFlags) {
      flags.push(...newFlags)
    }
  }

  // 統計情報
  const stats = {
    total: flags?.length || 0,
    enabled: flags?.filter(f => f.is_enabled).length || 0,
    partialRollout: flags?.filter(f => f.is_enabled && f.rollout_percentage && f.rollout_percentage < 100).length || 0,
    limitedAccess: flags?.filter(f => f.allowed_users && f.allowed_users.length > 0).length || 0
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">機能フラグ管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          機能の有効化/無効化と段階的ロールアウト
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <ToggleLeft className="h-5 w-5 text-gray-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">総フラグ数</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.enabled}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">有効</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.partialRollout}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">段階展開中</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.limitedAccess}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">限定公開</p>
        </div>
      </div>

      {/* フラグテーブル */}
      <FeatureFlagsTable initialFlags={flags || []} />

      {/* 使用方法の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">機能フラグの使用方法</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>有効/無効:</strong> トグルボタンで機能の即座の有効化/無効化</li>
          <li>• <strong>展開率:</strong> 0-100%で段階的にユーザーに機能を公開</li>
          <li>• <strong>対象ユーザー:</strong> 特定のメールアドレスのユーザーのみに限定公開</li>
          <li>• <strong>編集:</strong> 鉛筆アイコンをクリックして詳細設定を変更</li>
        </ul>
      </div>
    </div>
  )
}