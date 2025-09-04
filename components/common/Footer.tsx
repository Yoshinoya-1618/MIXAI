import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 text-xs text-gray-700">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <FooterCol title="Help" items={[["ヘルプセンター", "/help"], ["使い方ガイド", "/help"], ["よくある質問", "/faq"], ["制限/対応フォーマット", "/help"]]} />
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