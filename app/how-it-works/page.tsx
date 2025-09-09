'use client'

import { useState } from 'react'
import Header from '../../components/common/Header'

// =========================================
// Palette & Tokens (共通)
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

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      {/* Global style tokens */}
      <StyleTokens />

      {/* Background aura + particles */}
      <AuroraBackground />

      {/* Header */}
      <Header currentPage="help" />

      {/* Hero */}
      <section className="relative">
        <HeroVisual />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center">
            <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
              3ステップで完成する歌ってみた
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              アップロード→自動処理→ダウンロード。多くは数十秒〜数分で完了します。
            </p>
          </div>
        </div>
      </section>

      {/* Steps Overview */}
      <section className="relative">
        <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              title="アップロード"
              description="instとボーカルを選択。ハモリも追加できます。"
              icon={<FolderIcon className="w-6 h-6" />}
              details={[
                "ドラッグ&ドロップまたはタップで選択",
                "対応形式：WAV / MP3",
                "ファイルサイズ：〜20MB",
                "時間：〜60秒"
              ]}
              active={activeStep === 1}
              onClick={() => setActiveStep(1)}
            />
            
            <StepCard
              number={2}
              title="AI解析・MIX・マスタリング"
              description="AIが解析してMIX→マスタリングまで自動で完成。"
              icon={<MusicalNoteIcon className="w-6 h-6" />}
              details={[
                "AIによる曲解析（Key/BPM/ジャンル）",
                "テーマ選択で最適なMIX",
                "ピッチ・タイミング補正",
                "配信基準音量調整（-14 LUFS）",
                "マスタリング処理"
              ]}
              active={activeStep === 2}
              onClick={() => setActiveStep(2)}
            />
            
            <StepCard
              number={3}
              title="完成・ダウンロード"
              description="プレビューで確認してダウンロード。"
              icon={<ArrowDownTrayIcon className="w-6 h-6" />}
              details={[
                "15秒プレビュー試聴",
                "ハモリパターン選択（AI生成時）",
                "MP3 / WAV形式でダウンロード",
                "A/B比較機能"
              ]}
              active={activeStep === 3}
              onClick={() => setActiveStep(3)}
            />
          </div>
        </div>
      </section>

      {/* Demo Video Placeholder */}
      <section className="relative">
        <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold">実際の流れを見てみよう</h2>
            <p className="mt-3 text-gray-600">15-20秒の短いデモ動画です</p>
          </div>
          
          <div className="glass-card p-8 text-center">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <PlayCircleIcon className="w-16 h-16 text-indigo-500 mx-auto mb-3" />
                <p className="text-gray-600">デモ動画</p>
                <p className="text-sm text-gray-500">（準備中）</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Processing Time Details */}
      <ProcessingTimeDetails />

      {/* Harmony Options */}
      <HarmonyOptions />

      {/* Quality Standards */}
      <QualityStandards />

      {/* Troubleshooting */}
      <Troubleshooting />

      {/* CTA */}
      <section className="relative">
        <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-4">今すぐ始めてみましょう</h2>
            <p className="text-gray-600 mb-6">
              会員登録で7日間無料トライアル。Creator機能を体験できます。
            </p>
            <button className="btn-primary text-lg px-8 py-3">
              無料で試す
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  )
}

// =========================================
// Components
// =========================================
interface StepCardProps {
  number: number
  title: string
  description: string
  icon: React.ReactElement
  details: string[]
  active: boolean
  onClick: () => void
}

function StepCard({ number, title, description, icon, details, active, onClick }: StepCardProps) {
  return (
    <div 
      className={`glass-card p-6 cursor-pointer transition-all ${
        active ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          active ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {number}
        </div>
        <div className="text-indigo-600">{icon}</div>
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      
      {active && (
        <ul className="space-y-2">
          {details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProcessingTimeDetails() {
  const timeEstimates = [
    {
      type: "基本MIX",
      time: "30秒〜1分",
      description: "伴奏 + ボーカルの基本処理"
    },
    {
      type: "ハモリアップロード",
      time: "45秒〜1分30秒",
      description: "自分のハモリファイル追加"
    },
    {
      type: "AIハモリ生成",
      time: "1分〜3分",
      description: "上・下・5度の3パターン自動生成"
    }
  ]

  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">処理時間の目安</h2>
          <p className="mt-3 text-gray-600">
            ファイルサイズや処理内容によって変動します
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {timeEstimates.map((estimate, index) => (
            <div key={index} className="glass-card p-6 text-center">
              <ClockIcon className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">{estimate.type}</h3>
              <div className="text-2xl font-bold text-indigo-600 mb-2">
                {estimate.time}
              </div>
              <p className="text-sm text-gray-600">{estimate.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HarmonyOptions() {
  const harmonyTypes = [
    {
      name: "上ハモ",
      description: "主旋律より高い音程のハーモニー",
      use: "華やかさを演出したい時に"
    },
    {
      name: "下ハモ", 
      description: "主旋律より低い音程のハーモニー",
      use: "厚みと安定感を出したい時に"
    },
    {
      name: "5度ハモ",
      description: "5度の音程関係のハーモニー",
      use: "和音の響きを楽しみたい時に"
    }
  ]

  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">AIハモリ生成について</h2>
          <p className="mt-3 text-gray-600">
            3パターンすべて生成して、プレビューでお気に入りを選択
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {harmonyTypes.map((type, index) => (
            <div key={index} className="glass-card p-6">
              <h3 className="font-semibold text-lg mb-2">{type.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{type.description}</p>
              <p className="text-xs text-indigo-600 font-medium">{type.use}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-start gap-3">
            <InfoIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">プレビューでの選択</h3>
              <p className="text-sm text-gray-600">
                3つのハモリパターンを試聴して、楽曲に最も合うものを選んでください。
                複数パターンを組み合わせることはできませんが、いつでも別のパターンで再処理できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function QualityStandards() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">音質・品質について</h2>
          <p className="mt-3 text-gray-600">
            各プランごとの音質プリセットと配信プラットフォーム対応
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4">配信基準対応</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">ラウドネス正規化（-14 LUFS）</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">True Peak制限（-1 dBTP）</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">YouTube・TikTok最適化</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">ショート動画向け音質調整</span>
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4">出力形式</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">MP3 320kbps（標準）</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">WAV 16-bit（高音質）</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">ステレオ出力対応</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">メタデータ付与</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function Troubleshooting() {
  const issues = [
    {
      problem: "ファイルがアップロードできない",
      solutions: [
        "対応形式（WAV, MP3）であることを確認",
        "ファイルサイズが20MB以下であることを確認", 
        "ファイル名に特殊文字が含まれていないか確認"
      ]
    },
    {
      problem: "処理に時間がかかりすぎる",
      solutions: [
        "ファイルサイズを小さくする（60秒以内推奨）",
        "同時処理数の制限を確認（プランによる）",
        "しばらく待ってから再試行"
      ]
    },
    {
      problem: "音声がズレている",
      solutions: [
        "プレビューでオフセット調整（±2000ms）",
        "元のファイルに無音部分がないか確認",
        "手動でタイミングを微調整"
      ]
    }
  ]

  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">よくあるトラブル</h2>
          <p className="mt-3 text-gray-600">
            困った時の対処法をまとめました
          </p>
        </div>

        <div className="space-y-6">
          {issues.map((issue, index) => (
            <div key={index} className="glass-card p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                {issue.problem}
              </h3>
              <ul className="space-y-2">
                {issue.solutions.map((solution, solIndex) => (
                  <li key={solIndex} className="flex items-start gap-2">
                    <ArrowRightIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-3">解決しない場合は</p>
          <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
            サポートに問い合わせる
          </button>
        </div>
      </div>
    </section>
  )
}

// =========================================
// Shared Components & Icons
// =========================================
function StyleTokens() {
  return (
    <style>{`
      :root { --indigo: ${COLORS.indigo}; --blue: ${COLORS.blue}; --magenta: ${COLORS.magenta}; --bg: ${COLORS.bg}; --brand: #6366F1; --brandAlt: #9B6EF3; --accent: ${COLORS.blue}; }
      .glass-card { background: radial-gradient(120% 140% at 10% 10%, rgba(255,255,255,.7), rgba(255,255,255,.35) 45%, rgba(255,255,255,.22) 100%); border: 1px solid rgba(255,255,255,.5); backdrop-filter: saturate(160%) blur(14px); border-radius: 12px; box-shadow: 0 4px 18px rgba(99,102,241,.08); }
      .btn-primary { background: linear-gradient(135deg, var(--indigo), var(--blue) 50%, var(--magenta)); color: white; border-radius: 12px; padding: 10px 16px; font-weight: 600; letter-spacing: .01em; box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 6px 18px rgba(99,102,241,.25);}  
      .btn-primary:hover { filter: brightness(1.02); transform: translateY(-1px) rotate(.5deg); transition: transform .15s ease, filter .2s ease; }
      .aurora { position: absolute; inset: -10% -10% auto -10%; height: 60vh; pointer-events: none; filter: blur(20px) saturate(140%); opacity: .6; }
      .aurora::before, .aurora::after { content: ''; position: absolute; inset: 0; background: 
        radial-gradient(60% 80% at 20% 30%, var(--indigo), transparent 60%),
        radial-gradient(60% 80% at 80% 20%, var(--blue), transparent 60%),
        radial-gradient(70% 80% at 50% 80%, var(--magenta), transparent 65%);
        mix-blend-mode: screen; animation: auraMove 16s linear infinite alternate;
      }
      .aurora::after { filter: blur(30px); opacity: .6; animation-duration: 22s; }
      @keyframes auraMove { from { transform: translateY(-8%) translateX(-4%); } to { transform: translateY(6%) translateX(3%); } }
      @media (prefers-reduced-motion: reduce) { .aurora::before, .aurora::after { animation: none !important; } }
    `}</style>
  )
}

function AuroraBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_0%_0%,#fff,rgba(255,255,255,.85)_40%,rgba(255,255,255,.75)_60%,rgba(245,246,250,.9))]" />
      <div className="aurora" />
    </div>
  )
}

function HeroVisual() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-[var(--indigo)]/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 w-[380px] h-[380px] rounded-full bg-[var(--magenta)]/20 blur-3xl" />
    </div>
  )
}


function Footer() {
  return (
    <footer className="border-t border-white/50 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 text-xs text-gray-700">
        <div className="text-center">
          <p>© 2024 MIXAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-4 h-4', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-16 h-16', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-5 h-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-5 h-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-6 h-6', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h5l2 3h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function MusicalNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-6 h-6', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function ArrowDownTrayIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-6 h-6', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-4 h-4', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}