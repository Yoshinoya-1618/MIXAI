"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../web/api'
import Header from '../../../components/common/Header'
import StyleTokens from '../../../components/common/StyleTokens'
import Footer from '../../../components/common/Footer'

interface Props { params: { id: string } }

interface JobData {
  id: string
  status: string
  created_at: string
  updated_at: string
  error?: string
  preset_key?: string
  plan_code?: string
}

export default function StatusPage({ params }: Props) {
  const router = useRouter()
  const [jobData, setJobData] = useState<JobData | null>(null)
  const [status, setStatus] = useState('uploaded')
  const [failed, setFailed] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let stop = false
    async function poll() {
      try {
        const res = await apiFetch(`/api/v1/jobs/${params.id}`)
        if (res.ok) {
          const j = await res.json()
          setJobData(j)
          setStatus(j.status)
          if (j.status === 'done') {
            if (!stop) {
              setTimeout(() => {
                router.push(`/result/${params.id}`)
              }, 1500) // 少し待ってから遷移
            }
            return
          }
          if (j.status === 'failed') {
            setFailed(true)
            return // ポーリング停止
          }
        }
      } catch (err) {
        console.error('Status polling error:', err)
      }
      if (!stop && !failed && status !== 'done') {
        setTimeout(poll, 2000)
      }
    }
    poll()
    return () => { stop = true }
  }, [params.id, router, failed, status])

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded': return 'アップロード完了'
      case 'paid': return '決済完了・処理待機中'
      case 'processing': return 'AI処理中'
      case 'done': return '処理完了'
      case 'failed': return '処理失敗'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'processing': return 'text-blue-600 bg-blue-50'
      case 'paid': return 'text-indigo-600 bg-indigo-50'
      case 'uploaded': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'uploaded': return 20
      case 'paid': return 40
      case 'processing': return 70
      case 'done': return 100
      case 'failed': return 0
      default: return 0
    }
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="status" />
      
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">処理状況</h1>
          <p className="mt-2 text-gray-600">音声処理の進捗を監視しています</p>
        </div>

        <div className="card p-8">
          {/* ジョブ情報 */}
          <div className="mb-6 space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">ジョブID</div>
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                {params.id}
              </code>
            </div>
            {jobData && (
              <>
                {jobData.plan_code && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">プラン</div>
                    <span className="text-sm font-medium">
                      {jobData.plan_code.charAt(0).toUpperCase() + jobData.plan_code.slice(1)}
                    </span>
                  </div>
                )}
                {jobData.created_at && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">開始時刻</div>
                    <span className="text-sm">
                      {new Date(jobData.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ステータス */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">現在の状況</div>
            <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
              {!failed && status !== 'done' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              )}
              {failed && <ExclamationIcon className="w-4 h-4 mr-2" />}
              {status === 'done' && <CheckIcon className="w-4 h-4 mr-2" />}
              {getStatusText(status)}
            </div>
          </div>

          {/* プログレスバー */}
          {!failed && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>進捗状況</span>
                <span>{getProgressPercent(status)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getProgressPercent(status)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 処理完了時 */}
          {status === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">処理完了</h3>
              <p className="text-gray-600 mb-4">音声処理が正常に完了しました</p>
              <button 
                onClick={() => router.push(`/result/${params.id}`)}
                className="btn-primary px-6 py-2"
              >
                結果を確認
              </button>
            </div>
          )}

          {/* エラー時 */}
          {failed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <ExclamationIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800 mb-2">処理に失敗しました</h3>
                  <p className="text-sm text-red-700 mb-4">
                    音声ファイルの処理中にエラーが発生しました。
                  </p>
                  
                  {jobData?.error && (
                    <div className="bg-white/50 border border-red-200 rounded p-3 mb-4">
                      <div className="text-xs font-medium text-red-800 mb-1">エラー詳細:</div>
                      <div className="text-xs text-red-700 font-mono">
                        {jobData.error}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => router.push('/upload')}
                      className="btn-primary px-4 py-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                      新しくアップロード
                    </button>
                    <button 
                      onClick={() => window.location.href = '/contact'}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      サポートに連絡
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 処理中のメッセージ */}
          {!failed && status !== 'done' && (
            <div className="text-center py-6 text-gray-600">
              <p className="mb-2">音声を処理しています。しばらくお待ちください。</p>
              <p className="text-sm">このページは自動的に更新されます。</p>
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>サーバーと接続中</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </main>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

