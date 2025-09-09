import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export type Role = 'admin' | 'ops' | 'support' | 'read_only' | 'user'

export interface Permission {
  resource: string
  action: string
}

// 役割に基づく権限定義
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    // 全権限
    { resource: '*', action: '*' }
  ],
  ops: [
    // 運用系の権限
    { resource: 'jobs', action: 'read' },
    { resource: 'jobs', action: 'update' },
    { resource: 'jobs', action: 'delete' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'vault', action: 'read' },
    { resource: 'vault', action: 'update' },
    { resource: 'vault', action: 'delete' },
    { resource: 'feature_flags', action: 'read' },
    { resource: 'feature_flags', action: 'update' },
    { resource: 'audit_logs', action: 'read' },
    { resource: 'feedback', action: 'read' },
    { resource: 'feedback', action: 'update' }
  ],
  support: [
    // サポート系の権限
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update:credits' },
    { resource: 'jobs', action: 'read' },
    { resource: 'feedback', action: 'read' },
    { resource: 'feedback', action: 'update' },
    { resource: 'feedback', action: 'respond' },
    { resource: 'audit_logs', action: 'read:own' }
  ],
  read_only: [
    // 読み取り専用
    { resource: 'users', action: 'read' },
    { resource: 'jobs', action: 'read' },
    { resource: 'feedback', action: 'read' },
    { resource: 'feature_flags', action: 'read' },
    { resource: 'vault', action: 'read' },
    { resource: 'audit_logs', action: 'read:own' }
  ],
  user: [
    // 一般ユーザー
    { resource: 'jobs', action: 'read:own' },
    { resource: 'jobs', action: 'create' },
    { resource: 'feedback', action: 'create' }
  ]
}

// アクセス可能なルート定義
const routePermissions: Record<string, Role[]> = {
  '/admin': ['admin', 'ops', 'support', 'read_only'],
  '/admin/jobs': ['admin', 'ops', 'support', 'read_only'],
  '/admin/users': ['admin', 'ops', 'support', 'read_only'],
  '/admin/feedback': ['admin', 'ops', 'support', 'read_only'],
  '/admin/flags': ['admin', 'ops', 'read_only'],
  '/admin/vault': ['admin', 'ops', 'read_only'],
  '/admin/audit': ['admin', 'ops', 'read_only']
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export async function getCurrentUser() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // プロファイル情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    role: (profile?.roles || 'user') as Role,
    profile
  }
}

export async function checkPermission(
  resource: string, 
  action: string,
  userId?: string
): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }

  const userRole = user.role
  const permissions = rolePermissions[userRole]

  // 管理者は全権限を持つ
  if (userRole === 'admin') {
    return true
  }

  // 権限チェック
  return permissions.some(permission => {
    const resourceMatch = permission.resource === '*' || permission.resource === resource
    const actionMatch = permission.action === '*' || permission.action === action
    
    // own権限の場合、ユーザーIDのチェック
    if (permission.action.includes(':own') && userId) {
      return resourceMatch && userId === user.id
    }
    
    return resourceMatch && actionMatch
  })
}

export async function checkRouteAccess(pathname: string): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }

  // 管理者は全ルートにアクセス可能
  if (user.role === 'admin') {
    return true
  }

  // ルート権限チェック
  for (const [route, allowedRoles] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(user.role)
    }
  }

  return false
}

export async function requireAuth(minRole: Role = 'user') {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AuthorizationError('認証が必要です')
  }

  const roleHierarchy: Record<Role, number> = {
    admin: 5,
    ops: 4,
    support: 3,
    read_only: 2,
    user: 1
  }

  if (roleHierarchy[user.role] < roleHierarchy[minRole]) {
    throw new AuthorizationError('権限が不足しています')
  }

  return user
}

export async function logAudit(
  action: string,
  entity?: string,
  before?: any,
  after?: any,
  metadata?: any
) {
  const supabase = createServerComponentClient({ cookies })
  const user = await getCurrentUser()
  
  if (!user) {
    return
  }

  // IPアドレスとユーザーエージェントは、Next.jsのheadersから取得
  const { headers } = await import('next/headers')
  const headersList = headers()
  const ipAddress = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  await supabase
    .from('audit_logs')
    .insert({
      actor_id: user.id,
      action,
      entity,
      before,
      after,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata
    })
}

// 2要素認証チェック
export async function check2FA(): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) {
    return false
  }

  const supabase = createServerComponentClient({ cookies })
  const { data: twoFA } = await supabase
    .from('two_factor_auth')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_enabled', true)
    .single()

  return !!twoFA
}

// セッション検証
export async function validateSession(): Promise<boolean> {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return false
  }

  // セッションの有効期限チェック
  const expiresAt = new Date(session.expires_at || 0)
  const now = new Date()
  
  return expiresAt > now
}

// IPアドレス制限チェック
export async function checkIPRestriction(allowedIPs: string[]): Promise<boolean> {
  const { headers } = await import('next/headers')
  const headersList = headers()
  const clientIP = headersList.get('x-forwarded-for') || 
                   headersList.get('x-real-ip') || 
                   ''
  
  if (allowedIPs.length === 0) {
    return true // 制限なし
  }
  
  return allowedIPs.includes(clientIP.split(',')[0].trim())
}

// レート制限チェック
export async function checkRateLimit(
  action: string, 
  limit: number = 100, 
  window: number = 60000
): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const supabase = createServerComponentClient({ cookies })
  const windowStart = new Date(Date.now() - window)
  
  const { count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', user.id)
    .eq('action', action)
    .gte('created_at', windowStart.toISOString())

  return (count || 0) < limit
}