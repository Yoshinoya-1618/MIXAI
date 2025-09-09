import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP, Inter } from 'next/font/google'
import { FeedbackWidget } from '../components/feedback/FeedbackWidget'

// フォント最適化（app/page.tsxのスタイルに合わせてInterも追加）
const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'], 
  weight: ['400','500','700'], 
  display: 'swap', 
  variable: '--font-noto-sans-jp',
  preload: true
})

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true
})

// SEO最適化されたメタデータ（app/page.tsxの内容と整合性を保つ）
export const metadata: Metadata = {
  title: {
    template: '%s | MIXAI - 歌声が、主役になる',
    default: 'MIXAI - 歌声が、主役になる。AI音声処理で自然な仕上がり',
  },
  description: '歌い手向けオンラインMIXサービス。伴奏と歌声をアップロードするだけで、AI技術によりピッチとタイミングを自然に補正。YouTube・TikTok等のショート動画にも最適。初回無料、以降1回500円で手軽にMIX依頼が可能。',
  keywords: [
    'MIX', '音声処理', '歌い手', 'ボーカル補正', 'ピッチ補正', 
    'タイミング補正', 'AI音声', 'オンラインMIX', 'ショート動画', 
    'YouTube', 'TikTok', 'Reels', '音楽制作', 'DTM', 'レコーディング',
    '歌ってみた', 'ボカロ', 'カラオケ', 'うた整音', '音響処理', 'マスタリング'
  ],
  authors: [{ name: 'MIXAI' }],
  creator: 'MIXAI',
  publisher: 'MIXAI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'MIXAI',
    title: 'MIXAI - 歌声が、主役になる。AI音声処理で自然な仕上がり',
    description: '歌い手向けオンラインMIXサービス。AI技術でピッチ・タイミングを自然に補正。ショート動画対応。初回無料、以降1回500円。',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MIXAI - AI音声処理サービス',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@mixai_official',
    title: 'MIXAI - 歌声が、主役になる',
    description: 'AI技術で歌声を自然に補正するオンラインMIXサービス。ショート動画対応。初回無料。',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://mixai.app',
    languages: {
      'ja-JP': process.env.NEXT_PUBLIC_BASE_URL || 'https://mixai.app',
      'x-default': process.env.NEXT_PUBLIC_BASE_URL || 'https://mixai.app',
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
    },
  },
  category: 'technology',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://mixai.app'),
  applicationName: 'MIXAI',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'theme-color': '#6366f1',
  },
}

// ビューポート設定
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#6366f1',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${inter.variable}`}>
      <head>
        {/* パフォーマンス最適化 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS プリフェッチ */}
        <link rel="dns-prefetch" href="//supabase.co" />
        
        {/* セキュリティヘッダー */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* 検索エンジン最適化 */}
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        
        {/* 地域・言語設定 */}
        <meta name="geo.region" content="JP" />
        <meta name="geo.country" content="JP" />
        <meta name="language" content="Japanese" />
        
        {/* パフォーマンス監視（本番環境のみ） */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                    send_page_view: true,
                    anonymize_ip: true
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  )
}
