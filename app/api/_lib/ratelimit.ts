import { NextRequest } from 'next/server'
import { tooManyRequests } from './errors'

// 簡易レート制限実装（本番環境ではRedis使用推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export type RateLimitConfig = {
  windowMs: number // 時間窓（ミリ秒）
  max: number      // 最大リクエスト数
}

// デフォルト設定
const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分
  max: 100                   // 100リクエスト/15分
}

// API別レート制限設定
const apiRateLimits: Record<string, RateLimitConfig> = {
  '/api/v1/jobs': {
    windowMs: 60 * 1000,  // 1分
    max: 10               // 10ジョブ作成/分
  },
  '/api/v1/jobs/*/pay': {
    windowMs: 5 * 60 * 1000,  // 5分
    max: 5                    // 5決済/5分
  },
  '/api/v1/jobs/*/render': {
    windowMs: 10 * 60 * 1000, // 10分
    max: 20                   // 20レンダリング/10分
  }
}

function getClientKey(req: NextRequest): string {
  // IP アドレス取得（プロキシ考慮、正規化）
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip') // Cloudflare対応
  
  let ip = 'unknown'
  
  // 優先度順でIPを取得
  if (cfConnectingIp) {
    ip = cfConnectingIp.trim()
  } else if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else if (realIp) {
    ip = realIp.trim()
  } else if (req.ip) {
    ip = req.ip
  }
  
  // IPアドレスの正規化（IPv6の簡略化など）
  if (ip.includes('::ffff:')) {
    ip = ip.replace('::ffff:', '') // IPv4-mapped IPv6をIPv4に変換
  }
  
  // ローカルアドレスの正規化
  if (ip === '::1') {
    ip = '127.0.0.1'
  }
  
  // 認証ユーザーの場合はユーザーIDも考慮（ハッシュ化でプライバシー保護）
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // JWTトークンのハッシュ化（シンプルなハッシュ関数）
      const token = authHeader.slice(7)
      const tokenHash = simpleHash(token).toString(36).slice(0, 8)
      return `user:${tokenHash}:${ip}`
    } catch {
      // tokenが不正な場合はIPのみ使用
    }
  }
  
  return `ip:${ip}`
}

// シンプルなハッシュ関数（パフォーマンス重視）
function simpleHash(str: string): number {
  let hash = 0
  if (str.length === 0) return hash
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit integerに変換
  }
  
  return Math.abs(hash)
}

function getRateLimitConfig(path: string): RateLimitConfig {
  // パス別設定をチェック
  for (const [pattern, config] of Object.entries(apiRateLimits)) {
    const regexPattern = pattern.replace(/\*/g, '[^/]+')
    const regex = new RegExp(`^${regexPattern}$`)
    if (regex.test(path)) {
      return config
    }
  }
  
  return defaultConfig
}

export function checkRateLimit(req: NextRequest): Response | null {
  const clientKey = getClientKey(req)
  const path = new URL(req.url).pathname
  const config = getRateLimitConfig(path)
  
  const now = Date.now()
  
  // メモリ効率的なクリーンアップ（期限切れエントリの削除）
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
  
  // クライアント固有キー
  const key = `${clientKey}:${path}`
  let clientData = rateLimitStore.get(key)
  
  // 時間窓が過ぎている場合はリセット
  if (!clientData || clientData.resetTime < now) {
    clientData = { 
      count: 0, 
      resetTime: now + config.windowMs
    }
  }
  
  // リクエスト数増加
  clientData.count++
  rateLimitStore.set(key, clientData)
  
  // レート制限チェック
  if (clientData.count > config.max) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000)
    
    // レート制限ログ
    console.warn(`Rate limit exceeded for ${clientKey} on ${path}: ${clientData.count}/${config.max}`)    
    
    const response = tooManyRequests(
      `リクエストが多すぎます。${retryAfter}秒後に再試行してください。`
    )
    response.headers.set('Retry-After', retryAfter.toString())
    response.headers.set('X-RateLimit-Limit', config.max.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000).toString())
    
    return response
  }
  
  return null
}

// レート制限情報をヘッダーに追加
export function addRateLimitHeaders(response: Response, req: NextRequest): Response {
  const clientKey = getClientKey(req)
  const path = new URL(req.url).pathname
  const config = getRateLimitConfig(path)
  const key = `${clientKey}:${path}`
  const clientData = rateLimitStore.get(key)
  
  if (clientData) {
    const remaining = Math.max(0, config.max - clientData.count)
    const resetTime = Math.ceil(clientData.resetTime / 1000)
    
    response.headers.set('X-RateLimit-Limit', config.max.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', resetTime.toString())
  }
  
  return response
}

// メモリクリーンアップ（定期実行用）
export function cleanupRateLimitStore() {
  const now = Date.now()
  let deleted = 0
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key)
      deleted++
    }
  }
  
  console.log(`Rate limit store cleanup: ${deleted} entries removed`)
}

// テスト用のストアリセット関数
export function resetRateLimitStore() {
  rateLimitStore.clear()
}