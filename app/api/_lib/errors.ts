import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

type Err = { code: string; message: string; details?: any; timestamp?: string; request_id?: string }

// リクエストID生成（トレーシング用）
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function jsonError(status: number, err: Err, requestId?: string) {
  const errorResponse = {
    ...err,
    timestamp: new Date().toISOString(),
    request_id: requestId || generateRequestId()
  }
  
  // 本番環境では詳細を隠す
  if (process.env.NODE_ENV === 'production' && status >= 500) {
    delete errorResponse.details
  }
  
  return NextResponse.json(errorResponse, { status })
}

export function notImplemented(message = 'Not implemented', requestId?: string) {
  return jsonError(501, { code: 'not_implemented', message }, requestId)
}

export function badRequest(message = 'Bad request', details?: any, requestId?: string) {
  return jsonError(400, { code: 'bad_request', message, details }, requestId)
}

export function unauthorized(message = 'Unauthorized', requestId?: string) {
  return jsonError(401, { code: 'unauthorized', message }, requestId)
}

export function forbidden(message = 'Forbidden', requestId?: string) {
  return jsonError(403, { code: 'forbidden', message }, requestId)
}

export function notFound(message = 'Not found', requestId?: string) {
  return jsonError(404, { code: 'not_found', message }, requestId)
}

export function conflict(message = 'Conflict', details?: any, requestId?: string) {
  return jsonError(409, { code: 'conflict', message, details }, requestId)
}

export function payloadTooLarge(message = 'Payload too large', requestId?: string) {
  return jsonError(413, { code: 'payload_too_large', message }, requestId)
}

export function unprocessableEntity(message = 'Unprocessable entity', details?: any, requestId?: string) {
  return jsonError(422, { code: 'unprocessable_entity', message, details }, requestId)
}

export function tooManyRequests(message = 'Too many requests', requestId?: string) {
  return jsonError(429, { code: 'too_many_requests', message }, requestId)
}

export function internalError(message = 'Internal server error', details?: any, requestId?: string) {
  return jsonError(500, { code: 'internal_error', message, details }, requestId)
}

export function badGateway(message = 'Bad gateway', requestId?: string) {
  return jsonError(502, { code: 'bad_gateway', message }, requestId)
}

export function serviceUnavailable(message = 'Service unavailable', requestId?: string) {
  return jsonError(503, { code: 'service_unavailable', message }, requestId)
}

export function gatewayTimeout(message = 'Gateway timeout', requestId?: string) {
  return jsonError(504, { code: 'gateway_timeout', message }, requestId)
}

// 汎用エラーハンドラー（強化版）
export function handleApiError(error: unknown, context = 'API処理中', requestId?: string) {
  const errorId = generateRequestId()
  
  // 構造化ログ出力
  console.error({
    error_id: errorId,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : error,
    timestamp: new Date().toISOString(),
    request_id: requestId
  })
  
  // Zodバリデーションエラー
  if (error instanceof ZodError) {
    const messages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    return badRequest('入力データが無効です', { validation_errors: messages }, errorId)
  }
  
  // Supabaseエラー
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any
    
    // 特定のSupabaseエラーコードを処理
    switch (supabaseError.code) {
      case '23505': // unique_violation
        return badRequest('データの重複エラーです', undefined, errorId)
      case '23503': // foreign_key_violation
        return badRequest('関連データが見つかりません', undefined, errorId)
      case '42501': // insufficient_privilege
        return forbidden('この操作を実行する権限がありません', errorId)
      case 'PGRST116': // no rows returned
        return notFound('指定されたデータが見つかりません', errorId)
    }
  }
  
  // 一般的なエラーオブジェクト
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as any).message
    
    // タイムアウトエラー
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return internalError('処理がタイムアウトしました。しばらくしてからお試しください', undefined, errorId)
    }
    
    // ネットワークエラー
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      return internalError('外部サービスとの接続に失敗しました', undefined, errorId)
    }
    
    return internalError(`${context}でエラーが発生しました`, { original_error: message }, errorId)
  }
  
  return internalError(`${context}で予期しないエラーが発生しました`, undefined, errorId)
}

// リクエスト固有のエラーハンドラー
export function createRequestErrorHandler(requestId: string) {
  return (error: unknown, context = 'API処理中') => {
    return handleApiError(error, context, requestId)
  }
}

// 後方互換性のためのエイリアス
export const errorResponse = jsonError
export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message)
    this.name = 'ApiError'
  }
}

