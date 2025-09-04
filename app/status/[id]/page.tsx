"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../web/api'
import Header from '../../../components/common/Header'
import StyleTokens from '../../../components/common/StyleTokens'
import Footer from '../../../components/common/Footer'

interface Props { params: { id: string } }

export default function StatusPage({ params }: Props) {
  const router = useRouter()
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
          setStatus(j.status)
          if (j.status === 'done') {
            if (!stop) router.push(`/result/${params.id}`)
            return
          }
          if (j.status === 'failed') setFailed(true)
        }
      } catch {}
      if (!stop) setTimeout(poll, 2000)
    }
    poll()
    return () => { stop = true }
  }, [params.id, router])

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded': return 'アップロード完了'
      case 'processing': return '音声解析中'
      case 'mixing': return 'MIX処理中'
      case 'mastering': return 'マスタリング中'
      case 'done': return '処理完了'
      case 'failed': return '処理失敗'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'processing':
      case 'mixing':
      case 'mastering': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'uploaded': return 10
      case 'processing': return 30
      case 'mixing': return 60
      case 'mastering': return 85
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
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">ジョブID</div>
            <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
              {params.id}
            </code>
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
                    オフセット調整を行って再試行してください。
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-red-800 mb-2">
                        オフセット調整（±2秒）
                      </label>
                      <input 
                        type="range" 
                        min="-2000" 
                        max="2000" 
                        step="10" 
                        value={offset}
                        onChange={(e) => setOffset(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-red-600 mt-1">
                        現在の値: {offset}ms
                      </div>
                    </div>
                    
                    <button className="btn-primary px-4 py-2 bg-red-600 hover:bg-red-700">
                      再試行
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

