'use client'

import React, { useEffect, useState } from 'react'
import { getActiveSessions, MixSession, getResumeUrl } from '../../lib/mix-session'

export function InterruptedSessionBanner() {
  const [interruptedSessions, setInterruptedSessions] = useState<MixSession[]>([])
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const sessions = getActiveSessions().filter(s => 
      s.stage === 'interrupted' || 
      s.stage === 'adjustment' ||
      (Date.now() - s.lastActivity) > 5 * 60 * 1000 // 5分間非アクティブ
    )
    
    if (sessions.length > 0) {
      setInterruptedSessions(sessions)
    }
  }, [])

  if (isDismissed || interruptedSessions.length === 0) {
    return null
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <RestoreIcon className="w-4 h-4 text-amber-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium text-amber-800">
            中断されたMIXセッションがあります
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            前回の作業を続行できます。調整したパラメータは保存されています。
          </p>
          
          <div className="mt-3 space-y-2">
            {interruptedSessions.slice(0, 2).map((session) => (
              <div key={session.jobId} className="flex items-center justify-between bg-white rounded px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {session.metadata?.title || `Job ${session.jobId.slice(0, 8)}`}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {session.plan.toUpperCase()}プラン
                  </span>
                </div>
                <a 
                  href={getResumeUrl(session)}
                  className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition-colors"
                >
                  続行
                </a>
              </div>
            ))}
          </div>
          
          {interruptedSessions.length > 2 && (
            <p className="text-xs text-amber-700 mt-2">
              他に {interruptedSessions.length - 2} 件のセッションがあります
            </p>
          )}
        </div>
        
        <button 
          onClick={() => setIsDismissed(true)}
          className="text-amber-600 hover:text-amber-800 p-1"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}