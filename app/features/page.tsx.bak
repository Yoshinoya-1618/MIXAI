'use client'

import React from 'react'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

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

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      {/* Global style tokens */}
      <StyleTokens />

      {/* Background aura + particles */}
      <AuroraBackground />

      {/* Header */}
      <Header currentPage="features" />

      {/* Hero */}
      <section className="relative">
        <HeroVisual />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center">
            <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
              歌ってみたを、もっと魅力的に
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              AIの力で音質向上からハモリ生成まで。あなたの歌声を最高の形で届けるための特長をご紹介します。
            </p>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="relative">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold">音質が、確実に上がる</h2>
            <p className="mt-3 text-gray-600">
              プロのMIXエンジニアのノウハウをAIで再現
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MusicalNoteIcon className="w-8 h-8" />}
              title="自動音程補正"
              description="ピッチのズレを自然に補正。歌心を残しながら聴きやすく整えます。"
              details={[
                "微細なピッチ調整",
                "ビブラートの保持",
                "自然な仕上がり"
              ]}
            />

            <FeatureCard
              icon={<ClockIcon className="w-8 h-8" />}
              title="タイミング調整"
              description="伴奏とボーカルのタイミングを自動で同期。ズレを解消します。"
              details={[
                "自動頭出し機能",
                "±2000ms手動調整",
                "高精度同期"
              ]}
            />

            <FeatureCard
              icon={<SpeakerWaveIcon className="w-8 h-8" />}
              title="配信基準音量"
              description="YouTube・TikTok等の配信プラットフォームに最適化した音量調整。"
              details={[
                "-14 LUFS正規化",
                "True Peak制限",
                "プラットフォーム最適化"
              ]}
            />

            <FeatureCard
              icon={<SparklesIcon className="w-8 h-8" />}
              title="プロ品質エフェクト"
              description="各プランで異なる音質プリセット。用途に合わせて選択できます。"
              details={[
                "Clean Light（投稿向け）",
                "Wide Pop（自然な広がり）",
                "Studio Shine（最高品質）"
              ]}
            />

            <FeatureCard
              icon={<SpeakerXMarkIcon className="w-8 h-8" />}
              title="ノイズ除去"
              description="録音時のノイズや不要な音を自動で除去します。"
              details={[
                "背景ノイズ軽減",
                "リップノイズ除去",
                "クリアな音質"
              ]}
            />

            <FeatureCard
              icon={<ChartBarIcon className="w-8 h-8" />}
              title="ダッキング処理"
              description="ボーカルが歌っている部分で伴奏を適切に下げ、歌声を前に出します。"
              details={[
                "インテリジェント検出",
                "自然な音量バランス",
                "歌声の明瞭性向上"
              ]}
            />
          </div>
        </div>
      </section>

      {/* AI Harmony Features */}
      <AIHarmonyFeatures />

      {/* Membership Benefits */}
      <MembershipBenefits />

      {/* Workflow Features */}
      <WorkflowFeatures />

      {/* Platform Optimization */}
      <PlatformOptimization />

      {/* Comparison Table */}
      <ComparisonTable />

      {/* CTA */}
      <section className="relative">
        <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-4">すべての機能を体験してみませんか？</h2>
            <p className="text-gray-600 mb-6">
              7日間無料お試しですべての特長をお試しいただけます。
            </p>
            <button className="btn-primary text-lg px-8 py-3">
              無料で始める
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
interface FeatureCardProps {
  icon: React.ReactElement
  title: string
  description: string
  details: string[]
}

function FeatureCard({ icon, title, description, details }: FeatureCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="text-indigo-600 mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      
      <ul className="space-y-2">
        {details.map((detail, index) => (
          <li key={index} className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AIHarmonyFeatures() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">AIハモリで厚みのある音に</h2>
          <p className="mt-3 text-gray-600">
            上・下・5度の3パターンを自動生成。プレビューで最適なものを選択
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <MusicIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3パターン同時生成</h3>
                  <p className="text-sm text-gray-600">上ハモ・下ハモ・5度ハモを一度に生成。楽曲に最も合うものを選べます。</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">自然な響き</h3>
                  <p className="text-sm text-gray-600">AIがボーカルの特徴を分析し、違和感のない自然なハーモニーを生成します。</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <HeadphonesIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">プレビューで選択</h3>
                  <p className="text-sm text-gray-600">3つのパターンを試聴して、楽曲のイメージに最も合うハモリを選択できます。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="font-semibold mb-4 text-center">ハモリパターン例</h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">上ハモ</span>
                  <span className="text-sm text-gray-500">華やかな印象</span>
                </div>
                <div className="mt-2 h-2 bg-gradient-to-r from-indigo-200 to-indigo-400 rounded"></div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">下ハモ</span>
                  <span className="text-sm text-gray-500">安定感のある厚み</span>
                </div>
                <div className="mt-2 h-2 bg-gradient-to-r from-blue-200 to-blue-400 rounded"></div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">5度ハモ</span>
                  <span className="text-sm text-gray-500">和音の響き</span>
                </div>
                <div className="mt-2 h-2 bg-gradient-to-r from-purple-200 to-purple-400 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MembershipBenefits() {
  const benefits = [
    {
      title: "優先処理キュー",
      description: "Standard以上で処理を優先的に実行",
      icon: "lightning"
    },
    {
      title: "データ保存期間延長", 
      description: "無料7日→会員30日間",
      icon: "database"
    },
    {
      title: "同時実行",
      description: "複数ファイルの並行処理が可能",
      icon: "fast-forward"
    },
    {
      title: "高音質プリセット",
      description: "プランに応じた専用音質設定",
      icon: "adjustments"
    },
    {
      title: "クレジット繰越",
      description: "余った分は1ヶ月繰り越し",
      icon: "arrow-path"
    },
    {
      title: "自動追加購入",
      description: "不足時の自動クレジット追加",
      icon: "ticket"
    }
  ]

  return (
    <section className="relative bg-indigo-50/30">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">会員だけの特典</h2>
          <p className="mt-3 text-gray-600">
            快適な制作環境で、思う存分歌ってみた動画を作れます
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="glass-card p-6 text-center">
              <div className="text-indigo-600 mb-3">{getBenefitIcon(benefit.icon)}</div>
              <h3 className="font-semibold mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorkflowFeatures() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">ワークフロー効率化</h2>
          <p className="mt-3 text-gray-600">
            制作からアップロードまで、一連の流れをスムーズに
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <WorkflowCard
            step={1}
            title="ワンクリックアップロード"
            description="ドラッグ&ドロップで簡単ファイル選択"
            features={[
              "対応形式自動判定",
              "ファイルサイズ最適化",
              "バッチアップロード対応"
            ]}
          />

          <WorkflowCard
            step={2}
            title="リアルタイム進捗"
            description="処理状況をリアルタイムで確認"
            features={[
              "進捗バーで状況表示",
              "推定完了時間表示",
              "エラー時の詳細説明"
            ]}
          />

          <WorkflowCard
            step={3}
            title="即座にダウンロード"
            description="完成と同時にダウンロード可能"
            features={[
              "MP3/WAV形式選択",
              "A/B比較機能",
              "メタデータ付与"
            ]}
          />
        </div>
      </div>
    </section>
  )
}

function WorkflowCard({ step, title, description, features }: {
  step: number
  title: string
  description: string
  features: string[]
}) {
  return (
    <div className="glass-card p-6 relative">
      <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
        {step}
      </div>
      
      <div className="pt-2">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PlatformOptimization() {
  const platforms = [
    {
      name: "YouTube",
      features: ["ショート・長尺対応", "ラウドネス最適化", "音質劣化防止"],
      icon: "tv"
    },
    {
      name: "TikTok", 
      features: ["縦動画音声最適化", "アテンション重視", "15-60秒対応"],
      icon: "device-phone-mobile"
    },
    {
      name: "Instagram",
      features: ["リール最適化", "ストーリー対応", "音量バランス調整"],
      icon: "camera"
    },
    {
      name: "X (Twitter)",
      features: ["動画音声最適化", "圧縮耐性向上", "再生環境配慮"],
      icon: "twitter"
    }
  ]

  return (
    <section className="relative bg-blue-50/30">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">配信プラットフォーム最適化</h2>
          <p className="mt-3 text-gray-600">
            各プラットフォームの音声仕様に合わせた最適化処理
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {platforms.map((platform, index) => (
            <div key={index} className="glass-card p-6 text-center">
              <div className="text-indigo-600 mb-3">{getPlatformIcon(platform.icon)}</div>
              <h3 className="font-semibold mb-3">{platform.name}</h3>
              <ul className="space-y-2">
                {platform.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="text-xs text-gray-600">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComparisonTable() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">プラン別機能比較</h2>
          <p className="mt-3 text-gray-600">
            用途に合わせて最適なプランをお選びください
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">機能</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Lite</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Standard</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Creator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <ComparisonRow
                  feature="月間利用回数"
                  lite="3回"
                  standard="6回"
                  creator="10回"
                />
                <ComparisonRow
                  feature="音質プリセット"
                  lite="Clean Light"
                  standard="Wide Pop"
                  creator="Studio Shine"
                />
                <ComparisonRow
                  feature="AIハモリ生成"
                  lite="基本品質"
                  standard="高品質"
                  creator="プロ品質"
                />
                <ComparisonRow
                  feature="同時処理"
                  lite="1つ"
                  standard="2つまで"
                  creator="3つまで"
                />
                <ComparisonRow
                  feature="データ保存"
                  lite="30日"
                  standard="30日"
                  creator="30日"
                />
                <ComparisonRow
                  feature="処理優先度"
                  lite="通常"
                  standard="優先"
                  creator="最優先"
                />
                <ComparisonRow
                  feature="セクション最適化"
                  lite="×"
                  standard="×"
                  creator="○"
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function ComparisonRow({ feature, lite, standard, creator }: {
  feature: string
  lite: string
  standard: string
  creator: string
}) {
  return (
    <tr>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{feature}</td>
      <td className="px-4 py-3 text-sm text-center text-gray-600">{lite}</td>
      <td className="px-4 py-3 text-sm text-center text-gray-600">{standard}</td>
      <td className="px-4 py-3 text-sm text-center text-gray-600">{creator}</td>
    </tr>
  )
}

// =========================================
// Shared Components & Icons  
// =========================================
function StyleTokens() {
  return (
    <style>{`
      :root { --indigo: ${COLORS.indigo}; --blue: ${COLORS.blue}; --magenta: ${COLORS.magenta}; --bg: ${COLORS.bg}; }
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



// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-4 h-4', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-5 h-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-5 h-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v18m9-9H3" />
      <path d="M5 7L7 5l2 2M17 17l2-2-2-2M7 17l-2-2 2-2M17 7l2 2-2 2" />
    </svg>
  )
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-5 h-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 1 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

// Additional SVG Icons for Features Page
function MusicalNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
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

function SpeakerWaveIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M18.37 5.63a10 10 0 0 1 0 12.74" />
    </svg>
  )
}

function SpeakerXMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  )
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  )
}

function CircleStackIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function ForwardIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  )
}

function AdjustmentsIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

function ArrowPathIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  )
}

function TvIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  )
}

function DevicePhoneMobileIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-8 h-8', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  )
}

// Helper Functions
function getBenefitIcon(iconName: string) {
  const iconProps = { className: "w-8 h-8" }
  switch (iconName) {
    case "lightning": return <BoltIcon {...iconProps} />
    case "database": return <CircleStackIcon {...iconProps} />
    case "fast-forward": return <ForwardIcon {...iconProps} />
    case "adjustments": return <AdjustmentsIcon {...iconProps} />
    case "arrow-path": return <ArrowPathIcon {...iconProps} />
    case "ticket": return <TicketIcon {...iconProps} />
    default: return <div {...iconProps} />
  }
}

function getPlatformIcon(iconName: string) {
  const iconProps = { className: "w-8 h-8" }
  switch (iconName) {
    case "tv": return <TvIcon {...iconProps} />
    case "device-phone-mobile": return <DevicePhoneMobileIcon {...iconProps} />
    case "camera": return <CameraIcon {...iconProps} />
    case "twitter": return <TwitterIcon {...iconProps} />
    default: return <div {...iconProps} />
  }
}