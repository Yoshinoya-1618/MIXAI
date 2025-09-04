// components/TopBar.tsx
'use client';

export function TopBar() {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-burgundy-700/95 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="font-semibold tracking-tight hover:opacity-90">
          うた整音 <span className="ml-1 text-burgundy-100">Uta Seion</span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <a className="hover:underline" href="/help">使い方</a>
          <a className="hover:underline" href="/contact">お問い合わせ</a>
          <a className="btn-ghost" href="/upload">無料で試す</a>
        </nav>
      </div>
    </div>
  );
}
