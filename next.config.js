import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SEO最適化設定
  poweredByHeader: false,
  
  // セキュリティヘッダー・SEO最適化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin'
          }
        ]
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400'
          },
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8'
          }
        ]
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400'
          },
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8'
          }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400'
          },
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8'
          }
        ]
      }
    ]
  },

  // 実験的機能の有効化
  experimental: {
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: ['ffmpeg-static', 'execa'],
    // パフォーマンス最適化
    scrollRestoration: true
  },

  // Webpack設定
  webpack: (config, { isServer }) => {
    // パスエイリアスの設定
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), '.')
    }

    // サーバー側でのみ適用
    if (isServer) {
      // FFmpegバイナリの処理
      config.resolve.alias = {
        ...config.resolve.alias,
        'ffmpeg-static': 'ffmpeg-static'
      }
    }

    return config
  },

  // 環境変数の公開設定
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 画像最適化設定（SEO向上）
  images: {
    domains: ['galohsnyjzobnrovztch.supabase.co', 'lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 圧縮設定
  compress: true,

  // スワイプファイルの最適化
  swcMinify: true,

  // パフォーマンス最適化
  productionBrowserSourceMaps: false,
  reactStrictMode: true,

  // TypeScript設定
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint設定
  eslint: {
    ignoreDuringBuilds: false,
  },

  // リダイレクト設定
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // リライト設定
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/v1/health',
      },
    ]
  }
}

export default nextConfig