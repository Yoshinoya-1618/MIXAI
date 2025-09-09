'use client'

import { useCallback } from 'react'
import { 
  logAudit, 
  auditHelpers,
  UserActions,
  JobActions,
  FileActions,
  AdminActions,
  SecurityActions,
  type AuditLogEntry
} from '@/lib/audit'

/**
 * 監査ログを記録するためのReact Hook
 */
export function useAudit() {
  // 汎用的なログ記録
  const log = useCallback(async (entry: AuditLogEntry) => {
    await logAudit(entry)
  }, [])

  // ユーザーアクション
  const logLogin = useCallback(async () => {
    await auditHelpers.logLogin()
  }, [])

  const logLogout = useCallback(async () => {
    await auditHelpers.logLogout()
  }, [])

  const logProfileUpdate = useCallback(async (changes: any) => {
    await logAudit({
      action: UserActions.PROFILE_UPDATE,
      before: changes.before,
      after: changes.after
    })
  }, [])

  // ジョブアクション
  const logJobCreate = useCallback(async (jobId: string, plan: string) => {
    await auditHelpers.logJobCreate(jobId, plan)
  }, [])

  const logJobComplete = useCallback(async (jobId: string, duration: number) => {
    await auditHelpers.logJobComplete(jobId, duration)
  }, [])

  const logJobFail = useCallback(async (jobId: string, error: string) => {
    await logAudit({
      action: JobActions.FAIL,
      entity: `job:${jobId}`,
      metadata: { error, timestamp: new Date().toISOString() }
    })
  }, [])

  // ファイルアクション
  const logFileUpload = useCallback(async (fileName: string, fileSize: number) => {
    await auditHelpers.logFileUpload(fileName, fileSize)
  }, [])

  const logFileDownload = useCallback(async (fileName: string) => {
    await logAudit({
      action: FileActions.DOWNLOAD,
      entity: `file:${fileName}`,
      metadata: { timestamp: new Date().toISOString() }
    })
  }, [])

  const logFileDelete = useCallback(async (fileName: string) => {
    await logAudit({
      action: FileActions.DELETE,
      entity: `file:${fileName}`,
      metadata: { timestamp: new Date().toISOString() }
    })
  }, [])

  // 管理者アクション
  const logAdminAction = useCallback(async (
    action: keyof typeof AdminActions,
    entity?: string,
    metadata?: any
  ) => {
    await logAudit({
      action: AdminActions[action],
      entity,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    })
  }, [])

  // セキュリティアクション
  const logSecurityEvent = useCallback(async (
    action: keyof typeof SecurityActions,
    details?: any
  ) => {
    await logAudit({
      action: SecurityActions[action],
      metadata: { ...details, timestamp: new Date().toISOString() }
    })
  }, [])

  // クレジット関連
  const logCreditPurchase = useCallback(async (amount: number, paymentMethod: string) => {
    await auditHelpers.logCreditPurchase(amount, paymentMethod)
  }, [])

  const logCreditUse = useCallback(async (amount: number, purpose: string) => {
    await logAudit({
      action: UserActions.CREDIT_USE,
      metadata: { 
        amount, 
        purpose, 
        timestamp: new Date().toISOString() 
      }
    })
  }, [])

  return {
    log,
    // ユーザーアクション
    logLogin,
    logLogout,
    logProfileUpdate,
    // ジョブアクション
    logJobCreate,
    logJobComplete,
    logJobFail,
    // ファイルアクション
    logFileUpload,
    logFileDownload,
    logFileDelete,
    // 管理者アクション
    logAdminAction,
    // セキュリティアクション
    logSecurityEvent,
    // クレジット関連
    logCreditPurchase,
    logCreditUse,
    // 定数のエクスポート
    actions: {
      user: UserActions,
      job: JobActions,
      file: FileActions,
      admin: AdminActions,
      security: SecurityActions
    }
  }
}

/**
 * 使用例:
 * 
 * const audit = useAudit()
 * 
 * // ログイン時
 * await audit.logLogin()
 * 
 * // ファイルアップロード時
 * await audit.logFileUpload('music.mp3', 5242880)
 * 
 * // 管理者アクション
 * await audit.logAdminAction('USER_SUSPEND', 'user:123', { reason: '規約違反' })
 * 
 * // カスタムログ
 * await audit.log({
 *   action: 'custom:action',
 *   entity: 'entity:123',
 *   metadata: { custom: 'data' }
 * })
 */