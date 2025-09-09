'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { CreditBalanceCompact } from './CreditBalance'

interface HeaderProps {
  currentPage?: string
  showMainNavigation?: boolean // トップページ以外では非表示
}

interface User {
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
    picture?: string // Google OAuth用
  }
}

export default function Header({ currentPage, showMainNavigation = true }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      setUser(session?.user || null)
    }
    
    checkLoginStatus()

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsLoggedIn(!!session)
        setUser(session?.user || null)
        setImageError(false) // ユーザーが変わったらリセット
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    window.location.href = '/'
  }

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'ユーザー'
  }

  const getUserInitial = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserAvatar = () => {
    // Google OAuthのpictureフィールドを優先
    if (user?.user_metadata?.picture) {
      return user.user_metadata.picture
    }
    // 次にavatar_urlをチェック
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url
    }
    return null
  }

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Logo />
        {showMainNavigation && (
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <NavLink href="/" current={currentPage === 'home'}>ホーム</NavLink>
            <NavLink href="/pricing" current={currentPage === 'pricing'}>プラン料金</NavLink>
            <NavLink href="/credits" current={currentPage === 'credits'}>クレジット購入</NavLink>
            <NavLink href="/help" current={currentPage === 'help'}>使い方</NavLink>
            <NavLink href="/features" current={currentPage === 'features'}>特長</NavLink>
            <NavLink href="/faq" current={currentPage === 'faq'}>よくある質問</NavLink>
          </nav>
        )}
        <div className="hidden sm:flex items-center gap-3">
          {/* クレジット残高表示 */}
          {isLoggedIn && (
            <CreditBalanceCompact />
          )}
          {isLoggedIn ? (
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                {getUserAvatar() && !imageError ? (
                  <img 
                    src={getUserAvatar()!}
                    alt={getUserDisplayName()}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brandAlt)] flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitial()}
                  </div>
                )}
                <IconChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                      <p className="text-xs text-gray-600">{user?.email}</p>
                    </div>
                    
                    <div className="py-1">
                      <a 
                        href="/dashboard" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <IconDashboard className="w-4 h-4" />
                        ダッシュボード
                      </a>
                      
                      <a 
                        href="/mypage" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <IconFiles className="w-4 h-4" />
                        マイページ
                      </a>
                      
                      <a 
                        href="/upload" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <IconUpload className="w-4 h-4" />
                        音声アップロード
                      </a>
                      
                      <a 
                        href="/profile" 
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <IconUser className="w-4 h-4" />
                        プロフィール設定
                      </a>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-1">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 transition-colors w-full text-left"
                      >
                        <IconLogout className="w-4 h-4" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <NavLink href="/auth/login">ログイン</NavLink>
              <button className="btn-primary" onClick={() => window.location.href = '/auth/login?redirect=' + encodeURIComponent('/upload')}>無料で試す</button>
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

function IconChevronDown(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function IconUser(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function IconDashboard(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  )
}

function IconUpload(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function IconFiles(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  )
}

function IconLogout(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
    </svg>
  )
}