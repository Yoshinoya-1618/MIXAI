import React, { useState } from 'react'
import type { Project, ProjectStatus } from '../../app/dashboard/types'

interface ProjectCardProps {
  project: Project
  onResume: (project: Project) => void
  onRemix: (project: Project, mode?: 'AIMIX' | 'TWEAK' | 'MASTER') => void
  isProcessing: boolean
}

export default function ProjectCard({ project, onResume, onRemix, isProcessing }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  
  const getStatusBadge = (status: ProjectStatus) => {
    const badges = {
      'UPLOADED': { label: 'アップロード済', color: 'bg-gray-100 text-gray-700' },
      'PREPPED': { label: '下ごしらえ済', color: 'bg-blue-100 text-blue-700' },
      'AI_MIX_OK': { label: 'AI OK', color: 'bg-emerald-100 text-emerald-700' },
      'TWEAKING': { label: '微調整中', color: 'bg-indigo-100 text-indigo-700' },
      'MASTERING': { label: 'マスタリング中', color: 'bg-violet-100 text-violet-700' },
      'REVIEW': { label: '最終確認中', color: 'bg-amber-100 text-amber-700' },
      'DONE': { label: '完了', color: 'bg-green-100 text-green-700' },
      'ARCHIVED': { label: 'アーカイブ', color: 'bg-gray-100 text-gray-500' },
    }
    return badges[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const getProgress = (status: ProjectStatus) => {
    const progressMap = {
      'UPLOADED': 10,
      'PREPPED': 25,
      'AI_MIX_OK': 40,
      'TWEAKING': 55,
      'MASTERING': 70,
      'REVIEW': 85,
      'DONE': 100,
      'ARCHIVED': 100,
    }
    return progressMap[status] || 0
  }

  const isInterrupted = ['PREPPED', 'TWEAKING', 'MASTERING', 'REVIEW'].includes(project.status)
  const statusBadge = getStatusBadge(project.status)
  const progress = getProgress(project.status)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`
      glass-card p-4 transition-all hover:shadow-lg
      ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      ${project.isNearExpiration ? 'border-amber-300' : ''}
    `}>
      <div className="flex items-center gap-4">
        {/* サムネイル */}
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex-shrink-0">
          {project.thumbnailUrl ? (
            <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MusicIcon className="w-8 h-8 text-indigo-400" />
            </div>
          )}
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
            {project.hasRemixSession && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                再MIX中 ({project.remixSessionRemainingHours}h)
              </span>
            )}
          </div>
          
          {/* プログレスバー */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>作成: {formatDate(project.createdAt)}</span>
            <span>更新: {formatDate(project.updatedAt)}</span>
            {project.isNearExpiration ? (
              <span className="text-amber-600 font-medium">
                <AlertIcon className="w-4 h-4 inline mr-1" />
                残り{project.remainingDays}日
              </span>
            ) : (
              <span>残り{project.remainingDays}日</span>
            )}
          </div>
        </div>

        {/* アクション */}
        <div className="flex items-center gap-2">
          {isInterrupted && (
            <button
              onClick={() => onResume(project)}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              続きから
            </button>
          )}

          {project.status === 'AI_MIX_OK' && (
            <>
              <button
                onClick={() => onResume(project)}
                disabled={isProcessing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                続きから
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 py-1">
                    <button
                      onClick={() => {
                        onRemix(project, 'AIMIX')
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                    >
                      AI再MIX
                    </button>
                    <button
                      onClick={() => {
                        onRemix(project, 'TWEAK')
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                    >
                      微調整
                    </button>
                    <button
                      onClick={() => {
                        onRemix(project, 'MASTER')
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                    >
                      マスタリングへ
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {(project.status === 'DONE' || project.status === 'ARCHIVED') && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                アクション
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 py-1">
                  <button
                    onClick={() => {
                      // 再生機能の実装
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    再生
                  </button>
                  <button
                    onClick={() => {
                      // 共有機能の実装
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    共有
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onRemix(project, 'AIMIX')
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    AI再MIX (0.5クレジット)
                  </button>
                  <button
                    onClick={() => {
                      onRemix(project, 'TWEAK')
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    微調整 (0.5クレジット)
                  </button>
                  <button
                    onClick={() => {
                      onRemix(project, 'MASTER')
                      setMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    マスタリングへ (0.5クレジット)
                  </button>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    </div>
  )
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  )
}