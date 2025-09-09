import React, { useState } from 'react'
import type { Project } from '../../app/dashboard/types'

interface RemixModalProps {
  project: Project
  mode?: 'AIMIX' | 'TWEAK' | 'MASTER'
  onConfirm: () => void
  onCancel: () => void
}

export default function RemixModal({ project, mode = 'AIMIX', onConfirm, onCancel }: RemixModalProps) {
  const [credits, setCredits] = useState(10) // 仮のクレジット数

  const getModeLabel = (m: string) => {
    const labels: Record<string, string> = {
      'AIMIX': 'AI再MIX',
      'TWEAK': '微調整',
      'MASTER': 'マスタリング',
    }
    return labels[m] || m
  }

  const getModeDescription = (m: string) => {
    const descriptions: Record<string, string> = {
      'AIMIX': '下ごしらえ済みデータから再解析→AI MIX実行→新しいAI OK判定を生成します',
      'TWEAK': '直近のAI OK判定から微調整のみをやり直します',
      'MASTER': '直近の微調整版から仕上げのみをやり直します',
    }
    return descriptions[m] || ''
  }

  const hasEnoughCredits = credits >= 0.5

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">再MIXセッション開始</h2>
        
        <div className="mb-6 space-y-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="font-medium text-indigo-900 mb-2">{getModeLabel(mode)}</h3>
            <p className="text-sm text-indigo-700">{getModeDescription(mode)}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-900 font-medium mb-1">
                  この操作で 0.5 クレジットを使用します
                </p>
                <p className="text-amber-700">
                  24時間内の連続操作は追加課金なしで行えます
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">現在のクレジット</span>
              <span className={`font-medium ${hasEnoughCredits ? 'text-green-600' : 'text-red-600'}`}>
                {credits} クレジット
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">必要クレジット</span>
              <span className="font-medium">0.5 クレジット</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">セッション有効期限</span>
              <span className="font-medium">24時間</span>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                クレジットが不足しています。チャージしてから再度お試しください。
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          {hasEnoughCredits ? (
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              開始する
            </button>
          ) : (
            <button
              onClick={() => window.location.href = '/pricing'}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              クレジットをチャージ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
}