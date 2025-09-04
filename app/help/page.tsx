'use client'

import React from 'react'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

export default function HelpPage() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="help" />
      <Hero />
      <HowItWorks />
      <SupportedFormats />
      <Footer />
    </main>
  )
}


function Hero() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold">使い方ガイド</h1>
        <p className="mt-4 text-lg text-gray-700">
          MIXAIの使い方から対応形式まで、わかりやすく説明します
        </p>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-center mb-12">3つのステップで完成</h2>
        <div className="space-y-8">
          <Step 
            number="1"
            title="ファイルをアップロード"
            description="伴奏とボーカルファイルをドラッグ&ドロップまたはクリックして選択します。"
            details={[
              "対応形式：WAV、MP3",
              "ファイルサイズ：最大20MB",
              "長さ：60秒以内",
              "両方のファイルが必要です"
            ]}
          />
          <Step 
            number="2"
            title="自動でMIX&マスタリング"
            description="AIが自動でピッチやタイミングを整え、自然なMIXに仕上げます。"
            details={[
              "自動頭出し（±10ms精度）",
              "テンポ補正（プランによって精度が異なります）",
              "ピッチ補正（1音ずれの修正）",
              "ボーカル整音（HPF→De-esser→Comp→EQ→リバーブ）"
            ]}
          />
          <Step 
            number="3"
            title="ダウンロード"
            description="完成した音源をMP3またはWAV形式でダウンロードできます。"
            details={[
              "MP3：320kbps高音質",
              "WAV：16bit（Creatorは24bit対応）",
              "ラウドネス：-14 LUFS",
              "True Peak：≤-1 dBTP"
            ]}
          />
        </div>
      </div>
    </section>
  )
}

function Step({ number, title, description, details }: {
  number: string
  title: string
  description: string
  details: string[]
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-[var(--brand)] text-white rounded-full flex items-center justify-center font-bold">
          {number}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-2 text-gray-700">{description}</p>
          <ul className="mt-4 space-y-2">
            {details.map((detail, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                <IconCheck className="w-4 h-4 text-[var(--brand)] mt-0.5 flex-shrink-0" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function SupportedFormats() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-center mb-12">対応フォーマット・制限</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">入力ファイル</h3>
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-sm">対応形式</div>
                <div className="text-sm text-gray-600">WAV, MP3</div>
              </div>
              <div>
                <div className="font-semibold text-sm">最大サイズ</div>
                <div className="text-sm text-gray-600">20MB/ファイル</div>
              </div>
              <div>
                <div className="font-semibold text-sm">最大時間</div>
                <div className="text-sm text-gray-600">60秒</div>
              </div>
              <div>
                <div className="font-semibold text-sm">推奨サンプルレート</div>
                <div className="text-sm text-gray-600">44.1kHz, 48kHz</div>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">出力ファイル</h3>
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-sm">MP3</div>
                <div className="text-sm text-gray-600">320kbps, 44.1kHz</div>
              </div>
              <div>
                <div className="font-semibold text-sm">WAV</div>
                <div className="text-sm text-gray-600">16bit/44.1kHz（標準）<br/>24bit/48kHz（Creator）</div>
              </div>
              <div>
                <div className="font-semibold text-sm">音量レベル</div>
                <div className="text-sm text-gray-600">-14 LUFS ±0.5dB</div>
              </div>
              <div>
                <div className="font-semibold text-sm">保存期間</div>
                <div className="text-sm text-gray-600">7〜90日間（プランによる）</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 text-xs text-gray-700">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <FooterCol title="Help" items={[["ヘルプセンター", "/help"], ["使い方ガイド", "/help"], ["FAQ", "/help#faq"], ["制限/対応フォーマット", "/help"]]} />
          <FooterCol title="ポリシー" items={[["利用規約", "#"], ["プライバシー", "#"], ["クッキー", "#"], ["コンテンツ", "#"], ["権利侵害の申告", "#"]]} />
          <FooterCol title="販売情報" items={[["特商法表記", "#"], ["返金・キャンセル", "#"], ["支払い・領収書", "#"]]} />
          <FooterCol title="安全と連絡" items={[["セキュリティ", "#"], ["データ削除リクエスト", "#"], ["通報", "#"], ["お問い合わせ", "#"], ["運営者情報", "#"]]} />
        </div>
        <div className="mt-8 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <Logo />
            <span>© {new Date().getFullYear()} MIXAI</span>
          </div>
          <div className="flex gap-3">
            <A href="#">ステータス</A>
            <A href="#">更新情報</A>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function A({ href, children }: { href?: string; children: React.ReactNode }) {
  return (
    <a href={href ?? '#'} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded px-1 py-1">
      {children}
    </a>
  )
}

function IconMic(props: any) {
  return (
    <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}

function IconCheck(props: any) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

