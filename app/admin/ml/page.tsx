// app/admin/ml/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface MLModel {
  id: number
  name: string
  version: string
  uri: string
  framework: string
  input_dim: number
  output_dim: number
  metrics: any
  is_active: boolean
  rollout_percentage: number
  created_at: string
}

interface TrainingJob {
  id: number
  task: string
  status: string
  config: any
  metrics: any
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

interface MLStats {
  total_features: number
  unique_users: number
  total_labels: number
  active_models: number
  avg_latency_1d: number
  training_consents: number
}

export default function MLManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<MLModel[]>([])
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([])
  const [stats, setStats] = useState<MLStats | null>(null)
  const [featureFlags, setFeatureFlags] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState<'models' | 'training' | 'features' | 'monitoring'>('models')

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }

    // 管理者権限チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', session.user.id)
      .single()

    if (!profile?.roles || !['admin', 'ops'].includes(profile.roles)) {
      router.push('/')
    }
  }

  const loadData = async () => {
    try {
      // モデル一覧
      const { data: modelsData } = await supabase
        .from('model_registry')
        .select('*')
        .order('created_at', { ascending: false })

      // 学習ジョブ
      const { data: jobsData } = await supabase
        .from('training_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // 統計情報
      const { data: statsData } = await supabase
        .from('ml_stats')
        .select('*')
        .single()

      // フィーチャーフラグ
      const { data: flagsData } = await supabase
        .from('feature_flags')
        .select('*')
        .in('key', ['enable_cpu_ml', 'enable_master_regression', 'enable_preset_recommendation', 'enable_align_confidence'])

      setModels(modelsData || [])
      setTrainingJobs(jobsData || [])
      setStats(statsData)
      setFeatureFlags(flagsData || [])
    } catch (error) {
      console.error('Failed to load ML data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleModelActive = async (modelId: number, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('model_registry')
        .update({ is_active: !currentActive })
        .eq('id', modelId)

      if (!error) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to toggle model:', error)
    }
  }

  const updateRolloutPercentage = async (modelId: number, percentage: number) => {
    try {
      const { error } = await supabase
        .from('model_registry')
        .update({ rollout_percentage: percentage })
        .eq('id', modelId)

      if (!error) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to update rollout:', error)
    }
  }

  const startTrainingJob = async (task: string) => {
    try {
      const { data, error } = await supabase
        .from('training_jobs')
        .insert({
          task,
          config: {
            hyperparameters: {
              learningRate: 0.001,
              maxIterations: 1000,
              regularization: 0.01,
              validationSplit: 0.2
            }
          }
        })
        .select()
        .single()

      if (!error && data) {
        // 学習ジョブをWorkerで実行（実際にはバックエンドで処理）
        console.log('Training job created:', data)
        loadData()
      }
    } catch (error) {
      console.error('Failed to start training:', error)
    }
  }

  const updateFeatureFlag = async (flagId: number, enabled: boolean, rollout?: number) => {
    try {
      const update: any = { is_enabled: enabled }
      if (rollout !== undefined) {
        update.rollout_percentage = rollout
      }

      const { error } = await supabase
        .from('feature_flags')
        .update(update)
        .eq('id', flagId)

      if (!error) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to update feature flag:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI/ML Management</h1>

        {/* 統計サマリー */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Total Features</div>
              <div className="text-2xl font-bold">{stats.total_features.toLocaleString()}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Unique Users</div>
              <div className="text-2xl font-bold">{stats.unique_users}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Total Labels</div>
              <div className="text-2xl font-bold">{stats.total_labels.toLocaleString()}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Active Models</div>
              <div className="text-2xl font-bold">{stats.active_models}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Avg Latency (1d)</div>
              <div className="text-2xl font-bold">
                {stats.avg_latency_1d ? `${Math.round(stats.avg_latency_1d)}ms` : 'N/A'}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Training Consents</div>
              <div className="text-2xl font-bold">{stats.training_consents}</div>
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="flex space-x-4 mb-6 border-b border-gray-800">
          {(['models', 'training', 'features', 'monitoring'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === tab
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* モデル管理 */}
        {selectedTab === 'models' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Active Models</h2>
            <div className="space-y-4">
              {models.map(model => (
                <div key={model.id} className="bg-gray-900 p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{model.name}</h3>
                      <p className="text-gray-400">Version: {model.version}</p>
                      <p className="text-gray-500 text-sm">
                        Input: {model.input_dim}D → Output: {model.output_dim}D
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleModelActive(model.id, model.is_active)}
                        className={`px-4 py-2 rounded ${
                          model.is_active
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {model.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  {/* メトリクス */}
                  {model.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {Object.entries(model.metrics.validation || {}).map(([key, value]) => (
                        <div key={key} className="bg-black p-3 rounded">
                          <div className="text-gray-400 text-xs uppercase">{key}</div>
                          <div className="text-lg">
                            {typeof value === 'number' ? value.toFixed(3) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* A/Bテスト設定 */}
                  {model.is_active && (
                    <div className="border-t border-gray-800 pt-4">
                      <label className="block text-sm text-gray-400 mb-2">
                        Rollout Percentage: {model.rollout_percentage}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={model.rollout_percentage}
                        onChange={(e) => updateRolloutPercentage(model.id, parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 学習ジョブ */}
        {selectedTab === 'training' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Training Jobs</h2>
              <div className="space-x-2">
                <button
                  onClick={() => startTrainingJob('master_reg')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                >
                  Train Master Regression
                </button>
                <button
                  onClick={() => startTrainingJob('preset_cls')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                >
                  Train Preset Classifier
                </button>
                <button
                  onClick={() => startTrainingJob('align_conf')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                >
                  Train Alignment Model
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {trainingJobs.map(job => (
                <div key={job.id} className="bg-gray-900 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{job.task}</h3>
                      <p className="text-gray-400 text-sm">
                        Created: {new Date(job.created_at).toLocaleString()}
                      </p>
                      {job.started_at && (
                        <p className="text-gray-400 text-sm">
                          Started: {new Date(job.started_at).toLocaleString()}
                        </p>
                      )}
                      {job.completed_at && (
                        <p className="text-gray-400 text-sm">
                          Completed: {new Date(job.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded text-sm ${
                      job.status === 'completed' ? 'bg-green-600' :
                      job.status === 'running' ? 'bg-blue-600' :
                      job.status === 'failed' ? 'bg-red-600' :
                      'bg-gray-600'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  {job.error_message && (
                    <div className="mt-2 p-2 bg-red-900/20 rounded text-red-400 text-sm">
                      {job.error_message}
                    </div>
                  )}
                  {job.metrics && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(job.metrics.validation || {}).map(([key, value]) => (
                        <div key={key} className="bg-black p-2 rounded">
                          <div className="text-gray-400 text-xs">{key}</div>
                          <div className="text-sm">
                            {typeof value === 'number' ? value.toFixed(3) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* フィーチャーフラグ */}
        {selectedTab === 'features' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Feature Flags</h2>
            <div className="space-y-4">
              {featureFlags.map(flag => (
                <div key={flag.id} className="bg-gray-900 p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{flag.name}</h3>
                      <p className="text-gray-400">{flag.description}</p>
                      <p className="text-gray-500 text-sm mt-1">Key: {flag.key}</p>
                    </div>
                    <button
                      onClick={() => updateFeatureFlag(flag.id, !flag.is_enabled)}
                      className={`px-4 py-2 rounded ${
                        flag.is_enabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {flag.is_enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  {flag.is_enabled && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Rollout: {flag.rollout_percentage}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={flag.rollout_percentage}
                        onChange={(e) => updateFeatureFlag(flag.id, true, parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* モニタリング */}
        {selectedTab === 'monitoring' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Model Performance Monitoring</h2>
            <div className="bg-gray-900 p-6 rounded-lg">
              <p className="text-gray-400">
                Real-time model performance metrics and monitoring dashboard coming soon...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}