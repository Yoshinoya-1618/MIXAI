'use client'
import { useState } from 'react'

interface RightsCheckModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RightsCheckModal({ isOpen, onClose, onConfirm }: RightsCheckModalProps) {
  const [agreements, setAgreements] = useState({
    noCommercialKaraoke: false,
    ownRights: false,
    noLegalAdvice: false,
    understand: false
  })

  const allChecked = Object.values(agreements).every(Boolean)

  const handleCheck = (key: keyof typeof agreements) => {
    setAgreements(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleConfirm = () => {
    if (allChecked) {
      onConfirm()
      onClose()
      // チェック状態をリセット
      setAgreements({
        noCommercialKaraoke: false,
        ownRights: false,
        noLegalAdvice: false,
        understand: false
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">権利確認チェック</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 focus:outline-none"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 警告メッセージ */}
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-medium text-amber-800 mb-1">重要な権利関連事項</h3>
                <p className="text-sm text-amber-700">
                  アップロードする音声ファイルについて、以下の項目を必ずご確認ください。
                  権利侵害が発生した場合の責任は利用者が負います。
                </p>
              </div>
            </div>
          </div>

          {/* チェック項目 */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={agreements.noCommercialKaraoke}
                onChange={() => handleCheck('noCommercialKaraoke')}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div>
                <div className="font-medium text-slate-900">市販カラオケ音源の禁止</div>
                <div className="text-sm text-slate-600 mt-1">
                  DRM付き音源や市販カラオケ音源はアップロードしません。
                  JOYSOUNDやDAM等の業務用カラオケ音源も含みます。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={agreements.ownRights}
                onChange={() => handleCheck('ownRights')}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div>
                <div className="font-medium text-slate-900">適切な利用権限の確認</div>
                <div className="text-sm text-slate-600 mt-1">
                  アップロードする音声について、適切な利用権限があることを確認済みです。
                  権利確認は利用者の責任で行います。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={agreements.noLegalAdvice}
                onChange={() => handleCheck('noLegalAdvice')}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div>
                <div className="font-medium text-slate-900">法的助言の不提供</div>
                <div className="text-sm text-slate-600 mt-1">
                  このサービスは法的助言を提供しないことを理解しています。
                  権利関連の判断は利用者の責任で行います。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={agreements.understand}
                onChange={() => handleCheck('understand')}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div>
                <div className="font-medium text-slate-900">責任の理解</div>
                <div className="text-sm text-slate-600 mt-1">
                  権利侵害等の問題が発生した場合、利用者が全責任を負うことを理解しています。
                </div>
              </div>
            </label>
          </div>

          {/* 追加情報 */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium text-slate-900 mb-2">参考情報</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 著作権フリー音源や自作楽曲の利用を推奨します</li>
              <li>• 権利者からの許諾がある場合はその証明を保管してください</li>
              <li>• 不明な点がある場合は法律専門家にご相談ください</li>
            </ul>
          </div>

          {/* アクション */}
          <div className="mt-8 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allChecked}
              className="btn-primary"
            >
              確認して続行
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}