import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from './app/api/_lib/ratelimit'

export function middleware(request: NextRequest) {
  // CORS設定
  const response = NextResponse.next()

  // CORS最小化: 厳格なOrigin制限
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://mixai.app',
        'https://www.mixai.app'
      ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ]

  const origin = request.headers.get('origin')
  
  // 厳格なOriginチェック
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  } else if (origin && process.env.NODE_ENV === 'production') {
    // 本番環境で許可されていないOriginをログ出力
    console.warn(`Blocked CORS request from: ${origin}`)
    return new Response('CORS Error', { status: 403 })
  }

  // 最小限のHTTPメソッドのみ許可
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  
  // 必要最小限のヘッダーのみ許可
  response.headers.set('Access-Control-Allow-Headers', [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Supabase-Auth'
  ].join(', '))
  
  // キャッシュ時間を短縮（セキュリティ向上）
  response.headers.set('Access-Control-Max-Age', '3600') // 1時間

  // プリフライトリクエストの処理
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }

  // 強化されたセキュリティヘッダー
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // CSP (Content Security Policy) - 本番環境のみ
  if (process.env.NODE_ENV === 'production') {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'"
    ].join('; ')
    
    response.headers.set('Content-Security-Policy', csp)
  }
  
  // API レート制限チェック (APIパスのみ)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = checkRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    // APIルートにのみ適用
    '/api/:path*',
    // 静的ファイルやNext.js内部ファイルは除外
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}