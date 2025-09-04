'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface HeaderProps {
  currentPage?: string
}

export default function Header({ currentPage }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    
    checkLoginStatus()

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsLoggedIn(!!session)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink href="/" current={currentPage === 'home'}>ホーム</NavLink>
          <NavLink href="/pricing" current={currentPage === 'pricing'}>料金</NavLink>
          <NavLink href="/help" current={currentPage === 'help'}>使い方</NavLink>
          <NavLink href="/features" current={currentPage === 'features'}>特長</NavLink>
          <NavLink href="/faq" current={currentPage === 'faq'}>よくある質問</NavLink>
        </nav>
        <div className="hidden sm:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <NavLink href="/mypage" current={currentPage === 'mypage'}>マイページ</NavLink>
              <NavLink href="/subscriptions" current={currentPage === 'subscriptions'}>プラン</NavLink>
              <button className="btn-ghost" onClick={handleLogout}>ログアウト</button>
            </>
          ) : (
            <>
              <NavLink href="/auth/login">ログイン</NavLink>
              <button className="btn-primary" onClick={() => window.location.href = '/upload'}>無料で試す</button>
            </>
          )}
        </div>
      </div>
    </header>
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

function NavLink({ href, children, current = false }: { 
  href: string; 
  children: React.ReactNode; 
  current?: boolean 
}) {
  return (
    <a 
      href={href} 
      className={`hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded px-1 py-1 ${
        current ? 'text-[var(--brand)] font-medium' : 'text-gray-700'
      }`}
    >
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