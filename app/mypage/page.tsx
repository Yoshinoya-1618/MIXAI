"use client"
import { useState, useEffect } from 'react'
import { apiFetch } from '../web/api'
import { AuthGuard } from '../../components/AuthGuard'
import { InterruptedSessionBanner } from '../../components/mix/InterruptedSessionBanner'

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

export default function MyPage() {
  const [files, setFiles] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const res = await apiFetch('/api/v1/user/files')
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[var(--bg)] text-gray-900">
        <StyleTokens />
        <AuroraBackground />
        <Header />
        
        <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
              マイページ
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              アップロードしたファイルと処理結果を管理
            </p>
          </div>

          {/* 中断セッション通知 */}
          <InterruptedSessionBanner />

          {loading ? (
            <div className="glass-card p-8 text-center">
              <LoadingIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
              <p className="text-gray-600">ファイル情報を読み込み中...</p>
            </div>
          ) : (
            <>
              {/* プラン情報と統計 */}
              {files && (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CrownIcon className="w-5 h-5 text-indigo-600" />
                      現在のプラン
                    </h3>
                    <div className="text-2xl font-bold text-indigo-600 mb-1">
                      {files.planInfo.code.toUpperCase()}
                    </div>
                    <p className="text-sm text-gray-600">{files.planInfo.description}</p>
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <FolderIcon className="w-5 h-5 text-blue-600" />
                      保存中ファイル
                    </h3>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {files.stats.activeJobs}
                    </div>
                    <p className="text-sm text-gray-600">全{files.stats.totalJobs}件中</p>
                  </div>

                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <AlertIcon className="w-5 h-5 text-amber-600" />
                      期限間近
                    </h3>
                    <div className="text-2xl font-bold text-amber-600 mb-1">
                      {files.stats.nearExpirationJobs}
                    </div>
                    <p className="text-sm text-gray-600">3日以内に削除</p>
                  </div>
                </div>
              )}

              {/* ファイル一覧 */}
              <div className="glass-card p-8">
                <h2 className="font-semibold text-xl mb-6">ファイル一覧</h2>
                
                {files && files.jobs.length > 0 ? (
                  <div className="space-y-4">
                    {files.jobs.map((job: any) => (
                      <FileItem key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">まだファイルがアップロードされていません</p>
                    <button className="btn-primary mt-4 px-6 py-2">
                      最初のファイルをアップロード
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}

function FileItem({ job }: { job: any }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'processing': return 'text-blue-600 bg-blue-50'
      case 'failed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '完了'
      case 'processing': return '処理中'
      case 'failed': return 'エラー'
      case 'uploaded': return 'アップロード済み'
      default: return status
    }
  }

  return (
    <div className={clsx(
      "border rounded-lg p-4 transition-all",
      job.isExpired 
        ? "border-red-200 bg-red-50/50" 
        : job.isNearExpiration 
        ? "border-amber-200 bg-amber-50/50" 
        : "border-gray-200 bg-white/50 hover:bg-white/80"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium",
              getStatusColor(job.status)
            )}>
              {getStatusText(job.status)}
            </span>
            
            {job.preset_key && (
              <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700">
                {job.preset_key}
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">作成: {formatDate(job.created_at)}</span>
            </div>
            
            {job.hasFiles && (
              <div className="flex items-center gap-2">
                <DocumentIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  ファイル: {[job.instrumental_path, job.vocal_path, job.harmony_path, job.result_path].filter(Boolean).length}個
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          {job.isExpired ? (
            <div className="text-red-600">
              <div className="font-medium text-sm">削除済み</div>
              <div className="text-xs">保存期限が過ぎました</div>
            </div>
          ) : (
            <div className={clsx(
              job.isNearExpiration ? "text-amber-600" : "text-gray-600"
            )}>
              <div className="font-medium text-sm">
                残り{job.remainingDays}日
              </div>
              <div className="text-xs">
                {formatDate(job.expirationDate)}に削除
              </div>
            </div>
          )}
        </div>
      </div>

      {job.isNearExpiration && !job.isExpired && (
        <div className="mt-3 p-3 bg-amber-100 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <div className="font-medium">削除予定日が近づいています</div>
              <div>プランをアップグレードすると保存期間が延長されます</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================
// Shared Components
// =========================================

function StyleTokens() {
  return (
    <style jsx>{`
      :root {
        --bg: ${COLORS.bg};
        --indigo: ${COLORS.indigo};
        --blue: ${COLORS.blue};
        --magenta: ${COLORS.magenta};
      }
      
      .glass-card {
        @apply bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg rounded-2xl;
      }
      
      .btn-primary {
        @apply font-semibold rounded-xl text-white;
        background: linear-gradient(135deg, var(--indigo) 0%, var(--blue) 100%);
        transition: all 0.3s ease;
      }
      
      .btn-primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 20px 40px -12px rgba(99, 102, 241, 0.4);
      }
    `}</style>
  )
}

function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse" 
           style={{ background: `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.blue} 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse" 
           style={{ background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.magenta} 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl animate-pulse"
           style={{ background: `linear-gradient(135deg, ${COLORS.magenta} 0%, ${COLORS.indigo} 100%)` }} />
    </div>
  )
}

function Header() {
  return (
    <header className="relative border-b border-white/10 bg-white/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-xl text-gray-900">MIXAI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

// =========================================
// Icons
// =========================================

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3-3h.008v.008a3 3 0 0 1-3 2.992m-9 0a3 3 0 0 0-3-3h-.008v.008a3 3 0 0 0 3 2.992m9-3a3 3 0 0 1-3 3m3-3v-1.5a3 3 0 0 0-3-3m-6 4.5a3 3 0 0 0 3 3m-3-3v-1.5a3 3 0 0 1 3-3m-3 4.5h3m-3-7.5v-1m6 4.5V9a1.5 1.5 0 0 0-1.5-1.5H9A1.5 1.5 0 0 0 7.5 9v4.5m0-4.5L12 6l4.5 3v1.5" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25H11.69Z" />
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 21 9v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008ZM14.25 15h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008ZM16.5 15h.008v.008H16.5V15Zm0 2.25h.008v.008H16.5v-.008Z" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}