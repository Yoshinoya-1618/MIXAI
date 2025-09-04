'use client'

import React, { useEffect, useState } from 'react';
import { getActiveSessions, removeMixSession, getResumeUrl, MixSession } from '../../lib/mix-session';

interface SessionRecoveryProps {
  onSelectSession?: (session: MixSession) => void;
}

export function SessionRecovery({ onSelectSession }: SessionRecoveryProps) {
  const [sessions, setSessions] = useState<MixSession[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const activeSessions = getActiveSessions();
    if (activeSessions.length > 0) {
      setSessions(activeSessions);
      setIsVisible(true);
    }
  }, []);

  const handleResumeSession = (session: MixSession) => {
    if (onSelectSession) {
      onSelectSession(session);
    } else {
      window.location.href = getResumeUrl(session);
    }
    setIsVisible(false);
  };

  const handleDiscardSession = (jobId: string) => {
    removeMixSession(jobId);
    setSessions(prev => prev.filter(s => s.jobId !== jobId));
    if (sessions.filter(s => s.jobId !== jobId).length === 0) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || sessions.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-2xl w-full mx-4 bg-white rounded-2xl shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <RestoreIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                中断されたMIXセッション
              </h2>
              <p className="text-sm text-gray-600">
                前回の作業を復旧できます
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3 mb-6">
            {sessions.map((session) => (
              <SessionItem
                key={session.jobId}
                session={session}
                onResume={() => handleResumeSession(session)}
                onDiscard={() => handleDiscardSession(session.jobId)}
              />
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SessionItemProps {
  session: MixSession;
  onResume: () => void;
  onDiscard: () => void;
}

function SessionItem({ session, onResume, onDiscard }: SessionItemProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return 'たった今';
  };

  const getStageText = (stage: MixSession['stage']) => {
    switch (stage) {
      case 'upload': return 'アップロード中';
      case 'analysis': return '解析中';
      case 'adjustment': return 'パラメータ調整';
      case 'preview': return 'プレビュー確認';
      case 'export': return '書き出し準備';
      case 'interrupted': return '中断';
      default: return stage;
    }
  };

  const getPlanText = (plan: string) => {
    switch (plan) {
      case 'lite': return 'Lite';
      case 'standard': return 'Standard';
      case 'creator': return 'Creator';
      default: return plan;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900">
              {session.metadata?.title || `Job ${session.jobId.slice(0, 8)}`}
            </span>
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
              {getPlanText(session.plan)}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4" />
              <span>状態: {getStageText(session.stage)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              <span>最終更新: {formatTime(session.lastActivity)}</span>
            </div>
            {session.metadata?.artist && (
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span>アーティスト: {session.metadata.artist}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onResume}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            復旧
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 text-gray-600 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

// アイコンコンポーネント
function RestoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function StatusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

export default SessionRecovery;