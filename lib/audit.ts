import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface AuditLogEntry {
  action: string
  entity?: string
  before?: any
  after?: any
  metadata?: any
}

/**
 * 監査ログを記録する汎用関数
 */
export async function logAudit(entry: AuditLogEntry) {
  try {
    const supabase = createClientComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('Audit log skipped: No authenticated user')
      return
    }

    // ブラウザ情報を取得
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
    
    // IPアドレスは通常サーバーサイドで取得するため、クライアントサイドではnullとする
    const ipAddress = null

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: entry.action,
        entity: entry.entity,
        before: entry.before,
        after: entry.after,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: entry.metadata,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log audit:', error)
    }
  } catch (error) {
    console.error('Audit logging error:', error)
  }
}

/**
 * ユーザー関連のアクション
 */
export const UserActions = {
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  REGISTER: 'auth:register',
  PASSWORD_RESET: 'auth:password_reset',
  PROFILE_UPDATE: 'user:profile_update',
  CREDIT_PURCHASE: 'credit:purchase',
  CREDIT_USE: 'credit:use',
  SUBSCRIPTION_CREATE: 'subscription:create',
  SUBSCRIPTION_CANCEL: 'subscription:cancel'
} as const

/**
 * ジョブ関連のアクション
 */
export const JobActions = {
  CREATE: 'job:create',
  START: 'job:start',
  COMPLETE: 'job:complete',
  FAIL: 'job:fail',
  CANCEL: 'job:cancel',
  RETRY: 'job:retry',
  DELETE: 'job:delete',
  DOWNLOAD: 'job:download'
} as const

/**
 * ファイル関連のアクション
 */
export const FileActions = {
  UPLOAD: 'file:upload',
  DELETE: 'file:delete',
  DOWNLOAD: 'file:download',
  PREVIEW: 'file:preview',
  SHARE: 'file:share'
} as const

/**
 * 管理者アクション
 */
export const AdminActions = {
  USER_SUSPEND: 'admin:user_suspend',
  USER_REACTIVATE: 'admin:user_reactivate',
  USER_DELETE: 'admin:user_delete',
  CREDIT_ADJUST: 'admin:credit_adjust',
  ROLE_CHANGE: 'admin:role_change',
  FLAG_TOGGLE: 'admin:flag_toggle',
  SETTINGS_UPDATE: 'admin:settings_update',
  VAULT_DELETE: 'admin:vault_delete',
  FEEDBACK_RESPOND: 'admin:feedback_respond'
} as const

/**
 * セキュリティ関連のアクション
 */
export const SecurityActions = {
  ACCESS_DENIED: 'security:access_denied',
  SUSPICIOUS_ACTIVITY: 'security:suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'security:rate_limit_exceeded',
  IP_BLOCKED: 'security:ip_blocked',
  TWO_FA_ENABLED: 'security:2fa_enabled',
  TWO_FA_DISABLED: 'security:2fa_disabled',
  API_KEY_CREATED: 'security:api_key_created',
  API_KEY_REVOKED: 'security:api_key_revoked'
} as const

/**
 * 監査ログのヘルパー関数
 */
export const auditHelpers = {
  // ログイン成功
  logLogin: () => logAudit({
    action: UserActions.LOGIN,
    metadata: { timestamp: new Date().toISOString() }
  }),

  // ログアウト
  logLogout: () => logAudit({
    action: UserActions.LOGOUT,
    metadata: { timestamp: new Date().toISOString() }
  }),

  // ジョブ作成
  logJobCreate: (jobId: string, plan: string) => logAudit({
    action: JobActions.CREATE,
    entity: `job:${jobId}`,
    after: { plan },
    metadata: { timestamp: new Date().toISOString() }
  }),

  // ジョブ完了
  logJobComplete: (jobId: string, duration: number) => logAudit({
    action: JobActions.COMPLETE,
    entity: `job:${jobId}`,
    metadata: { duration_ms: duration, timestamp: new Date().toISOString() }
  }),

  // ファイルアップロード
  logFileUpload: (fileName: string, fileSize: number) => logAudit({
    action: FileActions.UPLOAD,
    entity: `file:${fileName}`,
    metadata: { size: fileSize, timestamp: new Date().toISOString() }
  }),

  // クレジット購入
  logCreditPurchase: (amount: number, paymentMethod: string) => logAudit({
    action: UserActions.CREDIT_PURCHASE,
    after: { credits: amount },
    metadata: { payment_method: paymentMethod, timestamp: new Date().toISOString() }
  }),

  // 管理者によるユーザー停止
  logUserSuspend: (targetUserId: string, reason?: string) => logAudit({
    action: AdminActions.USER_SUSPEND,
    entity: `user:${targetUserId}`,
    metadata: { reason, timestamp: new Date().toISOString() }
  }),

  // セキュリティイベント
  logSecurityEvent: (type: string, details: any) => logAudit({
    action: `security:${type}`,
    metadata: { ...details, timestamp: new Date().toISOString() }
  })
}

/**
 * バッチ監査ログ記録
 */
export async function logAuditBatch(entries: AuditLogEntry[]) {
  try {
    const supabase = createClientComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('Batch audit log skipped: No authenticated user')
      return
    }

    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
    
    const records = entries.map(entry => ({
      actor_id: user.id,
      action: entry.action,
      entity: entry.entity,
      before: entry.before,
      after: entry.after,
      ip_address: null,
      user_agent: userAgent,
      metadata: entry.metadata,
      created_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('audit_logs')
      .insert(records)

    if (error) {
      console.error('Failed to log batch audit:', error)
    }
  } catch (error) {
    console.error('Batch audit logging error:', error)
  }
}