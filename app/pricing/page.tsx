'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../web/api'
import { AuthGuard } from '../../components/AuthGuard'

// =========================================
// Palette & Tokens (ランディングページと共通)
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

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const handlePlanSelect = async (planCode: string) => {
    if (planCode === 'lite') {
      // Liteプランは無料なので直接マイページへ
      router.push('/mypage')
      return
    }

    setLoading(planCode)
    try {
      const res = await apiFetch('/api/v1/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          type: 'subscription',
          planCode
        })
      })

      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        console.error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <AuthGuard>
    <main className="min-h-screen bg-[var(--bg)] text-gray-900">
      {/* Global style tokens */}
      <StyleTokens />

      {/* Background aura + particles */}
      <AuroraBackground />

      {/* Header */}
      <Header />

      {/* Hero */}
      <section className="relative">
        <HeroVisual />
        <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center">
            <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
              1曲＝1クレジット。迷わず選べる3プラン。
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              録った歌を"聴かれる音"に。まずは7日間無料でお試し。
            </p>
          </div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="relative">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex justify-center">
            <div className="glass-card p-1 flex items-center">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  billingCycle === 'monthly'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                月払い
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  billingCycle === 'yearly'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                年払い
                <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  2ヶ月無料
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative">
        <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Lite"
              price={billingCycle === 'monthly' ? 1200 : 1000}
              credits="3.0"
              preset="Basic（3種）"
              subtitle="はじめての投稿にちょうどいい"
              description="月3曲ペースで気軽に試せるスタンダード入門。"
              concurrent={1}
              features={[
                "Clean Light：クセを抑えてクリアに",
                "Soft Room：うっすら響きで歌ってみた感",
                "Vocal Lift Lite：声を少し前に",
                "ピッチ／タイミング調整、ノイズ抑制、SNS向け音量",
                "同時保存：1テイク（あとから選べる）",
                "データ保持：7日間"
              ]}
              targetUser="月1〜3本、まずは「きれいな音」を体験したい"
              billingCycle={billingCycle}
              loading={loading}
            />
            
            <PricingCard
              name="Standard"
              price={billingCycle === 'monthly' ? 2280 : 1900}
              credits="6.0"
              preset="Basic＋Pop（計7種）"
              subtitle="週1投稿の主力プラン"
              description="迷ったらコレ。曲に合わせて雰囲気を選べる。"
              concurrent={2}
              features={[
                "Wide Pop：広がりと抜け",
                "Warm Ballad：やわらかく温かい",
                "Rap Tight：リズムを際立てタイトに",
                "Idol Bright：明るくきらっと映える",
                "ピッチ／タイミング調整、ノイズ抑制、SNS向け音量",
                "同時保存：2テイクまで",
                "データ保持：30日間",
                "優先処理：あり（待ち時間が短い）"
              ]}
              targetUser="週1で投稿、曲調に合わせて「雰囲気」を選びたい"
              popular={true}
              billingCycle={billingCycle}
              loading={loading}
            />
            
            <PricingCard
              name="Creator"
              price={billingCycle === 'monthly' ? 3680 : 3070}
              credits="10.0"
              preset="Basic＋Pop＋Studio（計12種）"
              subtitle="活動の中心に。仕上がりを作品基準へ"
              description="多作・コラボ・コンテスト応募にも。"
              concurrent={3}
              features={[
                "Studio Shine：プロっぽい艶と奥行き",
                "Airy Sparkle：空気感と透明感",
                "Live Stage：臨場感あるステージ風",
                "Vintage Warm：少しレトロで太い",
                "Night Chill：落ち着いた近接感 ほか",
                "微調整スライダー：声の前後感／響き量／明るさ",
                "同時保存：3テイクまで",
                "データ保持：90日間",
                "最優先処理：あり"
              ]}
              targetUser="週2〜3本、作品として「質」を安定させたい"
              hasFineAdjustment={true}
              billingCycle={billingCycle}
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* Credit System Explanation */}
      <CreditExplanation />

      {/* FAQ */}
      <PricingFAQ />

      {/* CTA */}
      <section className="relative">
        <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-4">まずは7日間無料で体験</h2>
            <p className="text-gray-600 mb-6">
              20クレジット分。AIハモリ生成も1本体験できます。
            </p>
            <button className="btn-primary text-lg px-8 py-3">
              無料でお試し開始
            </button>
            <p className="text-xs text-gray-500 mt-3">
              クレジットカード登録不要 • いつでもキャンセル可能
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
    </AuthGuard>
  )
}

// ========================================= 
// Pricing Button Component
// =========================================
interface PricingButtonProps {
  name: string
  popular?: boolean
  loading: string | null
  onSelect: () => void
}

function PricingButton({ name, popular, loading, onSelect }: PricingButtonProps) {
  const isLoading = loading === name.toLowerCase()
  
  return (
    <button 
      onClick={onSelect}
      disabled={isLoading}
      className={clsx(
        "w-full mt-6 py-3 px-4 rounded-lg font-medium transition",
        isLoading && "opacity-50 cursor-not-allowed",
        popular 
          ? 'btn-primary' 
          : 'bg-white/70 border border-gray-200 text-gray-900 hover:bg-white'
      )}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <LoadingIcon className="w-4 h-4 animate-spin" />
          <span>処理中...</span>
        </div>
      ) : (
        `${name}プランを選ぶ`
      )}
    </button>
  )
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

// =========================================
// Components
// =========================================
interface PricingCardProps {
  name: string
  price: number
  credits: string
  preset: string
  subtitle?: string
  description?: string
  concurrent: number
  features: string[]
  targetUser?: string
  popular?: boolean
  hasFineAdjustment?: boolean
  billingCycle: 'monthly' | 'yearly'
  loading: string | null
}

function PricingCard({ 
  name, 
  price, 
  credits, 
  preset, 
  subtitle,
  description,
  concurrent, 
  features,
  targetUser,
  popular = false,
  hasFineAdjustment = false,
  billingCycle,
  loading
}: PricingCardProps) {
  return (
    <div className={`glass-card p-6 relative ${popular ? 'ring-2 ring-indigo-500' : ''}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-indigo-500 text-white text-sm px-3 py-1 rounded-full">
            人気プラン
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-xl font-semibold">{name}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-600 font-medium">{subtitle}</p>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        
        <div className="mt-4 flex items-baseline justify-center">
          <span className="text-3xl font-bold">¥{price.toLocaleString()}</span>
          <span className="text-sm text-gray-500 ml-1">
            /{billingCycle === 'monthly' ? '月' : '年'}
          </span>
        </div>
        
        {billingCycle === 'yearly' && (
          <p className="text-sm text-green-600 mt-1">
            月額¥{Math.round(price / 12).toLocaleString()}相当
          </p>
        )}

        <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
          <div className="text-sm text-indigo-600">毎月付与</div>
          <div className="text-2xl font-bold text-indigo-700">{credits}</div>
          <div className="text-sm text-indigo-600">クレジット</div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium text-gray-900">使えるMIXレシピ</div>
          <div className="text-sm text-indigo-600">{preset}</div>
          {hasFineAdjustment && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
              微調整可
            </span>
          )}
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {targetUser && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <div className="text-xs font-medium text-slate-600">こんな人</div>
          <div className="text-sm text-slate-700 mt-1">{targetUser}</div>
        </div>
      )}

      <PricingButton 
        name={name} 
        popular={popular} 
        loading={loading}
        onSelect={() => {
          // プラン選択処理
          console.log(`Selected plan: ${name.toLowerCase()}`)
        }}
      />
    </div>
  )
}

function CreditExplanation() {
  const examples = [
    {
      title: "基本MIX",
      description: "inst＋ボーカルの基本MIX",
      cost: "1.0C",
      color: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      title: "ハモリアップロード",  
      description: "自分で録ったハモリを足す",
      cost: "+0.5C",
      color: "bg-green-50 text-green-700 border-green-200"
    },
    {
      title: "AIハモリ生成",
      description: "上下・5度などを自動生成",
      cost: "+1.0C",
      color: "bg-purple-50 text-purple-700 border-purple-200"
    }
  ]

  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">クレジットの仕組み</h2>
          <p className="mt-3 text-gray-600">
            1曲の仕上げ＝1クレジット。使わなかったクレジットは翌月に繰り越し。不足時は必要分だけ自動追加で安心。
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {examples.map((example, index) => (
            <div key={index} className="glass-card p-6 text-center">
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${example.color}`}>
                {example.cost}
              </div>
              <h3 className="mt-3 font-semibold">{example.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{example.description}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-center mb-4">利用例</h3>
          <div className="space-y-4 max-w-md mx-auto">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-sm mb-1">基本MIXのみ</div>
              <div className="text-right font-semibold">1.0C</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-sm mb-1">基本MIX＋AIハモリ</div>
              <div className="text-right font-semibold">2.0C</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-sm mb-1">基本MIX＋自分のハモリ追加</div>
              <div className="text-right font-semibold">1.5C</div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 glass-card p-6">
          <h3 className="text-lg font-semibold text-center mb-4">「MIXレシピ」について</h3>
          <p className="text-sm text-gray-600 text-center max-w-2xl mx-auto">
            全プランで基本の整音（ピッチ・タイミング・ノイズ・SNS音量）は共通。<br />
            違いは選べる"雰囲気（レシピ）"の数と微調整の幅です。
          </p>
        </div>
        
        <div className="mt-8 glass-card p-6">
          <h3 className="text-lg font-semibold text-center mb-4">えらび方のコツ</h3>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-sm font-medium text-indigo-600">月1〜3本</div>
              <div className="text-sm text-gray-700 mt-1">まずは Lite</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-indigo-600">週1本</div>
              <div className="text-sm text-gray-700 mt-1">曲調で雰囲気を選べる Standard</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-indigo-600">週2本以上／作品性重視</div>
              <div className="text-sm text-gray-700 mt-1">微調整もできる Creator</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingFAQ() {
  const faqs = [
    {
      q: "クレジットは繰り越せますか？",
      a: "はい、翌月まで自動繰り越しされます。"
    },
    {
      q: "足りなくなったら？",
      a: "その曲に必要な最小分だけ自動追加。設定でオフにもできます。"
    },
    {
      q: "年払いはお得？",
      a: "月払いよりお得な割引があります。途中解約も月割で安心。"
    },
    {
      q: "プラン変更は？",
      a: "いつでも即時反映。差額は自動で調整します。"
    },
    {
      q: "無料体験の範囲は？",
      a: "20クレジット分。AIハモリも試せます。"
    },
    {
      q: "解約方法",
      a: "マイページの**[プラン]**からいつでもワンクリック。"
    }
  ]

  return (
    <section className="relative">
      <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">よくある質問</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} className="glass-card p-6">
              <summary className="font-medium cursor-pointer hover:text-indigo-600 transition-colors">
                {faq.q}
              </summary>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// =========================================
// Shared Components
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

function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/40 bg-white/70 border-b border-white/50">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="sr-only">MIXAI - 歌い手向けオンラインMIXサービス</span>
        </div>
        
        <nav className="hidden lg:flex items-center gap-6">
          <HeaderLink href="/">ホーム</HeaderLink>
          <HeaderLink href="/pricing" active>料金</HeaderLink>
          <HeaderLink href="/how-it-works">使い方</HeaderLink>
          <HeaderLink href="/features">特長</HeaderLink>
          <HeaderLink href="/help">よくある質問</HeaderLink>
        </nav>

        <div className="flex items-center gap-3">
          <HeaderLink href="/auth/login">ログイン</HeaderLink>
          <button className="btn-primary">無料で試す</button>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-xl bg-gradient-to-br from-[var(--indigo)] via-[var(--blue)] to-[var(--magenta)] shadow-sm" />
      <span className="font-semibold tracking-tight">MIXAI</span>
    </div>
  )
}

function HeaderLink({ href, children, active = false }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <a 
      href={href} 
      className={`text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded px-1 py-1 ${
        active ? 'text-indigo-600 font-medium' : 'text-gray-700 hover:text-gray-900'
      }`}
    >
      {children}
    </a>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={clsx('w-4 h-4', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
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