import React from 'react'
import type { Project } from '../../app/dashboard/types'

interface ResumeModalProps {
  project: Project
  onConfirm: () => void
  onCancel: () => void
}

export default function ResumeModal({ project, onConfirm, onCancel }: ResumeModalProps) {
  const getStepName = (status: string) => {
    const steps: Record<string, string> = {
      'PREPPED': 'AI MIX',
      'AI_MIX_OK': '微調整',
      'TWEAKING': '微調整',
      'MASTERING': 'マスタリング',
      'REVIEW': '最終確認',
    }
    return steps[status] || status
  }

  const getEstimatedTime = (status: string) => {
    const times: Record<string, string> = {
      'PREPPED': '約5分',
      'AI_MIX_OK': '約3分',
      'TWEAKING': '約3分',
      'MASTERING': '約2分',
      'REVIEW': '約1分',
    }
    return times[status] || '数分'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">作業を再開</h2>
        
        <div className="mb-6 space-y-3">
          <p className="text-gray-700">
            前回は<span className="font-medium text-indigo-600">〈{getStepName(project.status)}〉</span>の途中でした。
            ここから再開します。
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">想定所要時間</span>
              <span className="font-medium">{getEstimatedTime(project.status)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">保存期限</span>
              <span className="font-medium">
                残り{project.remainingDays}日
                {project.isNearExpiration && (
                  <span className="text-amber-600 ml-1">(期限間近)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">料金</span>
              <span className="font-medium text-green-600">無料（再開）</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            続ける
          </button>
        </div>
      </div>
    </div>
  )
}