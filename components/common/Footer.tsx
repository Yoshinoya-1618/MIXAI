import React from 'react'
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* メインCTA */}
        <div className="mb-8 text-center">
          <div className="flex justify-center items-center gap-4">
            <Link 
              href="/upload" 
              className="px-6 py-2 bg-[var(--brand)] text-white rounded-lg hover:opacity-90 transition"
            >
              無料で始める
            </Link>
            <Link 
              href="/pricing"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              料金を見る
            </Link>
          </div>
        </div>
        
        {/* フッターコンテンツ */}
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-xs text-gray-700">
          <FooterCol 
            title="製品" 
            items={[
              ["MIXの始め方ガイド", "/how-it-works"],
              ["機能一覧", "/features"],
              ["ダッシュボード", "/dashboard"]
            ]} 
          />
          <FooterCol 
            title="アカウント" 
            items={[
              ["マイページ", "/mypage"],
              ["請求履歴", "/billing"],
              ["クレジット購入", "/credits"]
            ]} 
          />
          <FooterCol 
            title="リソース" 
            items={[
              ["よくある質問", "/faq"],
              ["ステータス", "/status"],
              ["お問い合わせ", "/contact"]
            ]} 
          />
          <FooterCol 
            title="ポリシー/法務" 
            items={[
              ["特定商取引法に基づく表示", "/legal/tokushoho"],
              ["利用規約", "/legal/terms"],
              ["プライバシーポリシー", "/legal/privacy"],
              ["クッキーポリシー", "/legal/cookies"],
              ["返金ポリシー", "/legal/refund"],
              ["資金決済法に基づく表示", "/legal/ppil"]
            ]} 
          />
        </div>
        
        
        {/* ボトムバー */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <Logo />
            <span>© {currentYear} MIXAI Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-3">
            <Link href="/sitemap.xml" className="hover:underline">サイトマップ</Link>
            <Link href="/robots.txt" className="hover:underline">robots.txt</Link>
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
            <Link href={href} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded">
              {label}
            </Link>
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

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full grid place-items-center bg-gradient-to-br from-[var(--brand)] via-[var(--brandAlt)] to-[var(--accent)]">
        <IconMic className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="font-semibold">MIXAI</span>
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

function IconX(props: any) {
  return (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconYouTube(props: any) {
  return (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function IconTikTok(props: any) {
  return (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

function IconNote(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}