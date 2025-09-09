'use client'

import React, { useEffect, useState } from 'react'
import { ProcessingStatus as ProcessingStatusType, ProcessingStatusManager } from '../../lib/audioAnalysis'
import { Progress } from '../ui/progress'

interface ProcessingStatusProps {
  manager: ProcessingStatusManager
  onComplete?: () => void
}

export default function ProcessingStatus({ manager, onComplete }: ProcessingStatusProps) {
  const [status, setStatus] = useState<ProcessingStatusType>(manager.getCurrentStatus())

  useEffect(() => {
    const unsubscribe = manager.subscribe((newStatus) => {
      setStatus(newStatus)
      if (newStatus.stage === 'completed' && onComplete) {
        onComplete()
      }
    })

    return unsubscribe
  }, [manager, onComplete])

  const getStageIcon = (stage: ProcessingStatusType['stage']) => {
    switch (stage) {
      case 'uploading':
        return <IconUpload className="w-6 h-6 text-blue-500 animate-pulse" />
      case 'analyzing':
        return <IconAnalyze className="w-6 h-6 text-purple-500 animate-spin" />
      case 'processing':
        return <IconProcess className="w-6 h-6 text-indigo-500 animate-bounce" />
      case 'mixing':
        return <IconMix className="w-6 h-6 text-green-500 animate-pulse" />
      case 'exporting':
        return <IconExport className="w-6 h-6 text-orange-500 animate-spin" />
      case 'completed':
        return <IconCheck className="w-6 h-6 text-green-600" />
      case 'error':
        return <IconError className="w-6 h-6 text-red-500" />
      default:
        return <IconProcess className="w-6 h-6 text-gray-500" />
    }
  }

  const getStageColor = (stage: ProcessingStatusType['stage']) => {
    switch (stage) {
      case 'uploading': return 'from-blue-500 to-blue-600'
      case 'analyzing': return 'from-purple-500 to-purple-600'
      case 'processing': return 'from-indigo-500 to-indigo-600'
      case 'mixing': return 'from-green-500 to-green-600'
      case 'exporting': return 'from-orange-500 to-orange-600'
      case 'completed': return 'from-green-500 to-green-600'
      case 'error': return 'from-red-500 to-red-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) {
      return `残り約${seconds}秒`
    }
    const minutes = Math.ceil(seconds / 60)
    return `残り約${minutes}分`
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className={`bg-gradient-to-r ${getStageColor(status.stage)} px-6 py-4`}>
        <div className="flex items-center gap-3 text-white">
          {getStageIcon(status.stage)}
          <div>
            <h3 className="font-semibold text-lg">
              {status.stage === 'completed' ? '処理完了' : '処理中'}
            </h3>
            <p className="text-sm opacity-90">
              {status.message}
            </p>
          </div>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>進捗</span>
              <span>{Math.round(status.progress)}%</span>
            </div>
            <Progress 
              value={status.progress} 
              className="h-3"
            />
          </div>

          {/* 段階表示 */}
          <div className="grid grid-cols-5 gap-1 text-xs">
            {[
              { key: 'uploading', label: 'アップロード' },
              { key: 'analyzing', label: '解析' },
              { key: 'processing', label: 'AI処理' },
              { key: 'mixing', label: 'ミキシング' },
              { key: 'exporting', label: 'エクスポート' }
            ].map((stage, index) => (
              <div key={stage.key} className="text-center">
                <div className={`w-4 h-4 mx-auto mb-1 rounded-full ${
                  status.stage === stage.key 
                    ? 'bg-blue-500 animate-pulse' 
                    : status.progress > (index / 4) * 100
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`} />
                <span className={`text-xs ${
                  status.stage === stage.key ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>

          {/* 残り時間 */}
          {status.estimatedTimeRemaining && status.estimatedTimeRemaining > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
              <span>推定残り時間</span>
              <span className="font-medium">
                {formatTimeRemaining(status.estimatedTimeRemaining)}
              </span>
            </div>
          )}

          {/* エラー表示 */}
          {status.stage === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-red-800">
                <IconError className="w-4 h-4" />
                <span className="font-medium">処理中にエラーが発生しました</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                {status.message}
              </p>
            </div>
          )}

          {/* 完了表示 */}
          {status.stage === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-green-800">
                <IconCheck className="w-4 h-4" />
                <span className="font-medium">処理が完了しました！</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                結果をダウンロードまたはプレビューできます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// アイコンコンポーネント
function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function IconAnalyze({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788 3.808-3.808 9.98-3.808 13.788 0 3.808 3.808 3.808 9.98 0 13.788-3.808 3.808-9.98 3.808-13.788 0z" />
    </svg>
  )
}

function IconProcess({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  )
}

function IconMix({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function IconExport({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.06-9.75L7.5 3a2.25 2.25 0 00-2.25 2.25v1.372c0 .516.235 1.004.64 1.323l8.48 6.68a4.5 4.5 0 01 1.13 1.436l1.05 2.523a.75.75 0 001.47-.326L18.75 9a2.25 2.25 0 00-2.25-2.25H8.625c-.621 0-1.125.504-1.125 1.125v.667c0 .414.336.75.75.75h4.5V9a.75.75 0 00-.22-.53z" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconError({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}