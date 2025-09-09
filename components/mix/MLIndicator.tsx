// components/mix/MLIndicator.tsx
'use client'

import { useState, useEffect } from 'react'
import { Brain, Sparkles, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MLIndicatorProps {
  jobId?: string
  plan: 'lite' | 'standard' | 'creator'
  analysisMethod?: string
  inferenceResult?: any
}

export default function MLIndicator({ 
  jobId, 
  plan, 
  analysisMethod,
  inferenceResult 
}: MLIndicatorProps) {
  const [mlEnabled, setMlEnabled] = useState(false)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkMLStatus()
  }, [jobId])

  const checkMLStatus = async () => {
    try {
      // フィーチャーフラグの確認
      const { data: flag } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('key', 'enable_cpu_ml')
        .single()

      setMlEnabled(flag?.is_enabled || false)

      // 推論結果がある場合は信頼度を取得
      if (jobId && flag?.is_enabled) {
        const { data: job } = await supabase
          .from('jobs')
          .select('ml_inference_results')
          .eq('id', jobId)
          .single()

        if (job?.ml_inference_results?.alignmentConfidence) {
          setConfidence(job.ml_inference_results.alignmentConfidence)
        }
      }
    } catch (error) {
      console.error('Failed to check ML status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !mlEnabled) {
    return null
  }

  const isMLEnhanced = analysisMethod === 'ml_enhanced' || inferenceResult

  return (
    <div className="flex items-center gap-2">
      {isMLEnhanced ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium text-purple-300">
            AI最適化
          </span>
          {confidence !== null && (
            <>
              <span className="text-xs text-purple-400/60">•</span>
              <span className="text-xs text-purple-300">
                {Math.round(confidence * 100)}%
              </span>
            </>
          )}
          <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-700">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">
            標準解析
          </span>
        </div>
      )}

      {/* プラン別の追加表示 */}
      {plan === 'creator' && isMLEnhanced && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-full border border-amber-500/30">
          <span className="text-xs font-medium text-amber-300">
            Creator AI+
          </span>
        </div>
      )}
    </div>
  )
}

export function MLStatusBadge({ status }: { status?: 'training' | 'ready' | 'updating' }) {
  const statusConfig = {
    training: {
      color: 'blue',
      text: '学習中',
      icon: <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
    },
    ready: {
      color: 'green',
      text: '準備完了',
      icon: <div className="w-2 h-2 bg-green-500 rounded-full" />
    },
    updating: {
      color: 'amber',
      text: '更新中',
      icon: <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
    }
  }

  const config = status ? statusConfig[status] : statusConfig.ready

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded">
      {config.icon}
      <span className="text-xs text-gray-300">{config.text}</span>
    </div>
  )
}