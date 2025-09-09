import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * Middleware for authentication, security headers, and rate limiting
 */
export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  // セキュリティヘッダーの設定
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googletagmanager.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; " +
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  )
  
  // メンテナンスモードチェック
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    const maintenancePaths = ['/maintenance', '/api/health']
    if (!maintenancePaths.some(path => request.nextUrl.pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }
  
  // 管理者ルート
  const adminPaths = [
    '/admin',
    '/admin/jobs',
    '/admin/users',
    '/admin/feedback',
    '/admin/flags',
    '/admin/vault',
    '/admin/audit'
  ]
  
  // 認証が必要なパス
  const protectedPaths = [
    '/dashboard',
    '/mypage',
    '/settings',
    '/credits',
    '/mix',
    '/preview',
    '/processing',
    '/complete',
    '/dm'
  ]
  
  // APIエンドポイントの保護
  const protectedApiPaths = [
    '/api/v1/jobs',
    '/api/v1/credits',
    '/api/v1/subscriptions',
    '/api/v1/mix',
    '/api/v1/themes',
    '/api/v1/presets'
  ]
  
  const path = request.nextUrl.pathname
  
  // 管理者パスへのアクセスチェック
  const isAdminPath = adminPaths.some(p => path.startsWith(p))
  
  if (isAdminPath) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectTo', path)
      return NextResponse.redirect(redirectUrl)
    }
    
    // ユーザープロファイルと役割を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles, suspended')
      .eq('id', session.user.id)
      .single()
    
    // アカウントが停止されている場合
    if (profile?.suspended) {
      return NextResponse.redirect(new URL('/auth/suspended', request.url))
    }
    
    // 管理者権限チェック
    const allowedRoles = ['admin', 'ops', 'support', 'read_only']
    if (!profile?.roles || !allowedRoles.includes(profile.roles)) {
      // 監査ログに記録
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: session.user.id,
          action: 'security:access_denied',
          entity: `route:${path}`,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        })
      
      return NextResponse.redirect(new URL('/auth/unauthorized', request.url))
    }
    
    // 特定のルートに対する追加の権限チェック
    if (path.startsWith('/admin/users') || path.startsWith('/admin/vault')) {
      if (!['admin', 'ops'].includes(profile.roles)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    
    // アクセスログ記録
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: session.user.id,
        action: 'admin:access',
        entity: `route:${path}`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })
  }
  
  // 保護されたパスへのアクセスチェック
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p))
  const isProtectedApi = protectedApiPaths.some(p => path.startsWith(p))
  
  if (isProtectedPath || isProtectedApi) {
    // セッションチェック
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      if (isProtectedApi) {
        // APIの場合は401を返す
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' }
          }
        )
      } else {
        // ページの場合はログインページへリダイレクト
        const redirectUrl = new URL('/auth/login', request.url)
        redirectUrl.searchParams.set('redirectTo', path)
        return NextResponse.redirect(redirectUrl)
      }
    }
    
    // アカウント停止チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.suspended) {
      return NextResponse.redirect(new URL('/auth/suspended', request.url))
    }
  }
  
  // Cronジョブの認証
  if (path.startsWith('/api/cron/')) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  // レート制限（簡易版）
  // 本番環境では Redis などを使用した本格的な実装が推奨
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitKey = `rate_limit:${ip}:${path}`
  
  // TODO: Implement proper rate limiting with Redis/Upstash
  
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|images|fonts).*)',
  ],
}