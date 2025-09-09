'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, CreateJobResponse } from '../web/api'
import { uploadFile } from '../web/storage'
import { AuthGuard } from '../../components/AuthGuard'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB || process.env.MAX_FILE_MB || 20)
const ACCEPT = '.wav,.mp3,audio/wav,audio/mpeg'

// =========================================
// Palette & Tokens (統一感のため)
// =========================================
const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

function validateFile(f: File): string | null {
  const mb = f.size / (1024 * 1024)
  if (mb > MAX_MB) return `サイズ超過: ${mb.toFixed(1)}MB（最大 ${MAX_MB}MB）`
  const extOk = /\.(wav|mp3)$/i.test(f.name)
  if (!extOk) return '拡張子は WAV/MP3 のみ'
  return null
}

export default function UploadPage() {
  // 3ステム対応の状態管理
  const [instFile, setInstFile] = useState<File | null>(null)
  const [vocalFile, setVocalFile] = useState<File | null>(null)
  const [harmonyFile, setHarmonyFile] = useState<File | null>(null)
  const [harmonyMode, setHarmonyMode] = useState<'upload' | 'generate'>('upload')
  const [msg, setMsg] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [userCredits, setUserCredits] = useState<number>(0)
  const [showCreditWarning, setShowCreditWarning] = useState(false)
  const router = useRouter()

  // バリデーション
  const hasRequiredFiles = instFile && vocalFile
  const canProceed = hasRequiredFiles && !busy

  async function onNext() {
    if (!canProceed) return
    setBusy(true)
    setMsg('ジョブを作成しています…')
    
    try {
      // ジョブ作成時にharmony_modeを含める
      const createBody = {
        harmony_mode: harmonyMode,
        // 他の設定も追加可能
      }
      
      const res = await apiFetch('/api/v1/jobs', { 
        method: 'POST',
        body: JSON.stringify(createBody)
      })
      
      if (!res.ok) throw new Error('ジョブ作成に失敗しました')
      const data = (await res.json()) as CreateJobResponse
      
      setMsg('アップロードしています…')
      
      // 必須ファイルのアップロード
      const instPath = await uploadFile(data.upload_targets.instrumental_prefix, instFile!)
      const vocalPath = await uploadFile(data.upload_targets.vocal_prefix, vocalFile!)
      
      // ハモリファイルのアップロード（アップロードモードの場合）
      let harmonyPath = null
      if (harmonyMode === 'upload' && harmonyFile) {
        harmonyPath = await uploadFile(data.upload_targets.harmony_prefix || '', harmonyFile)
      }
      
      setMsg('登録を確定しています…')
      
      // ファイルパス更新
      const updateBody: any = { 
        instrumental_path: instPath, 
        vocal_path: vocalPath 
      }
      
      if (harmonyPath) {
        updateBody.harmony_path = harmonyPath
      }
      
      const resPatch = await apiFetch(`/api/v1/jobs/${data.job.id}/files`, {
        method: 'PATCH',
        body: JSON.stringify(updateBody),
      })
      
      if (!resPatch.ok) throw new Error('ファイル登録に失敗しました')
      router.push(`/preview?job=${data.job.id}`)
      
    } catch (e: any) {
      setMsg(e?.message || 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[var(--bg)] text-gray-900">
        {/* Style tokens */}
        <StyleTokens />
        
        {/* Background aura */}
        <AuroraBackground />
        
        {/* Header */}
        <Header currentPage="upload" />
        
        {/* Main content */}
        <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
              ファイルアップロード
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              伴奏とボーカルをアップロード。ハモリも追加できます。
            </p>
          </div>

          {/* Upload Area - ランディングページと同じコンポーネント再利用 */}
          <div className="mb-8">
            <UploadArea 
              onInstFileSelect={setInstFile}
              onVocalFileSelect={setVocalFile}
              onHarmonyFileSelect={setHarmonyFile}
              onHarmonyModeChange={setHarmonyMode}
              instFile={instFile}
              vocalFile={vocalFile}
              harmonyFile={harmonyFile}
              harmonyMode={harmonyMode}
            />
          </div>

          {/* Progress message */}
          {msg && (
            <div className="mb-6">
              <div className="glass-card p-4 border-l-4 border-blue-400 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <LoadingIcon className="w-5 h-5 text-blue-500 animate-spin" />
                  <div>
                    <div className="font-medium text-blue-800">処理中</div>
                    <div className="text-sm text-blue-700">{msg}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credit Warning */}
          {userCredits < 1 && hasRequiredFiles && (
            <div className="mb-6">
              <div className="glass-card p-6 border-l-4 border-amber-400 bg-amber-50/50">
                <div className="flex items-start gap-3">
                  <AlertIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-amber-900 mb-2">クレジットが不足しています</div>
                    <div className="text-sm text-amber-800 mb-4">
                      MIX処理には最低1クレジットが必要です。現在の残高: <strong>{userCredits}クレジット</strong>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => router.push('/credits')}
                        className="bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 rounded-lg font-medium"
                      >
                        クレジット購入（コンビニ・銀行振込OK）
                      </button>
                      <button
                        onClick={() => router.push('/pricing')}
                        className="bg-white text-amber-700 hover:bg-amber-50 px-4 py-2 rounded-lg font-medium border border-amber-300"
                      >
                        サブスクプランを見る
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              className={`btn-primary text-lg px-8 py-3 transition-all ${
                canProceed && userCredits >= 1
                  ? 'shadow-lg hover:shadow-xl' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={onNext}
              disabled={!canProceed || userCredits < 1}
            >
              <div className="flex items-center gap-2">
                {busy ? (
                  <LoadingIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
                <span>プレビューへ進む</span>
              </div>
            </button>
            
            {userCredits < 1 && !hasRequiredFiles && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  クレジットをお持ちでない方も、まずはファイルをアップロードしてください
                </p>
                <a href="/credits" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                  クレジット購入について詳しく見る →
                </a>
              </div>
            )}
          </div>

          {/* Notice */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <InfoIcon className="w-5 h-5 text-blue-500" />
              ご利用にあたって
            </h2>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>ファイルは非公開で保存され、会員は30日、非会員は7日で自動削除</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>対応形式：WAV・MP3（60秒以内、20MB以下）</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>市販カラオケ等の権利侵害素材のアップロードは禁止です</span>
              </li>
            </ul>
          </div>
        </div>
        <Footer />
      </main>
    </AuthGuard>
  )
}

// =========================================
// Shared Components
// =========================================

function UploadArea({ 
  onInstFileSelect, 
  onVocalFileSelect, 
  onHarmonyFileSelect,
  onHarmonyModeChange,
  instFile, 
  vocalFile, 
  harmonyFile,
  harmonyMode 
}: {
  onInstFileSelect: (file: File | null) => void
  onVocalFileSelect: (file: File | null) => void
  onHarmonyFileSelect: (file: File | null) => void
  onHarmonyModeChange: (mode: 'upload' | 'generate') => void
  instFile: File | null
  vocalFile: File | null
  harmonyFile: File | null
  harmonyMode: 'upload' | 'generate'
}) {
  const [harmonyExpanded, setHarmonyExpanded] = useState(false)

  return (
    <div className="glass-card p-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileDropSlot
          label="inst"
          required
          file={instFile}
          onFileSelect={onInstFileSelect}
          accept={ACCEPT}
          validateFile={validateFile}
        />
        
        <FileDropSlot
          label="ボーカル"
          required
          file={vocalFile}
          onFileSelect={onVocalFileSelect}
          accept={ACCEPT}
          validateFile={validateFile}
        />
      </div>

      <div className="border-t border-gray-200/50 pt-6">
        <button
          onClick={() => setHarmonyExpanded(!harmonyExpanded)}
          className="w-full flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50 hover:from-blue-50 hover:to-indigo-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <MusicIcon className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">ハモリ（オプション）</div>
              <div className="text-sm text-gray-600">手持ちのハモリか、AIで自動生成</div>
            </div>
          </div>
          <ChevronDownIcon 
            className={`w-5 h-5 text-gray-500 transition-transform ${
              harmonyExpanded ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {harmonyExpanded && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="harmonyMode"
                  value="upload"
                  checked={harmonyMode === 'upload'}
                  onChange={() => onHarmonyModeChange('upload')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">ハモリをアップロード</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="harmonyMode"
                  value="generate"
                  checked={harmonyMode === 'generate'}
                  onChange={() => onHarmonyModeChange('generate')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">AIで自動生成</span>
              </label>
            </div>

            {harmonyMode === 'upload' && (
              <FileDropSlot
                label="ハモリファイル"
                file={harmonyFile}
                onFileSelect={onHarmonyFileSelect}
                accept={ACCEPT}
                validateFile={validateFile}
              />
            )}

            {harmonyMode === 'generate' && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/50">
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-emerald-900">AI自動生成</div>
                    <div className="text-sm text-emerald-700 mt-1">
                      上ハモ・下ハモ・5度の3パターンを自動生成し、プレビュー画面でお好みのハモリを選択できます。
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FileDropSlot({ 
  label, 
  required = false,
  file, 
  onFileSelect, 
  accept,
  validateFile 
}: {
  label: string
  required?: boolean
  file: File | null
  onFileSelect: (file: File | null) => void
  accept: string
  validateFile: (file: File) => string | null
}) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    const err = validateFile(selectedFile)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onFileSelect(selectedFile)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
          dragOver 
            ? "border-indigo-400 bg-indigo-50/50" 
            : file 
            ? "border-green-400 bg-green-50/50"
            : error
            ? "border-red-400 bg-red-50/50"
            : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="space-y-3">
          {file ? (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 bg-white/80 rounded-lg px-4 py-2 border">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(1)}MB
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileSelect(null)
                    setError(null)
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <div className="font-medium text-gray-700">
                  ファイルをドロップするか、クリックして選択
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  WAV・MP3 / {MAX_MB}MB以下 / 60秒以内
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangleIcon className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}

function StyleTokens() {
  return (
    <style jsx>{`
      :root {
        --bg: ${COLORS.bg};
        --indigo: ${COLORS.indigo};
        --blue: ${COLORS.blue};
        --magenta: ${COLORS.magenta};
        --brand: #6366F1;
        --brandAlt: #9B6EF3;
        --accent: ${COLORS.blue};
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
      
      .animate-in {
        animation: slide-in-from-top 0.3s ease-out;
      }
      
      @keyframes slide-in-from-top {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
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

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function CloudArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18.75 19.5H6.75Z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}
