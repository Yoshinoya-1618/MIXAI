/**
 * グローバルエラーハンドリング
 */

export type ErrorCode = 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CREDIT_INSUFFICIENT'
  | 'PLAN_REQUIRED'
  | 'RATE_LIMIT'
  | 'STORAGE_LIMIT'
  | 'PROCESSING_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export interface AppError extends Error {
  code: ErrorCode
  status?: number
  details?: any
  retryable?: boolean
}

/**
 * エラーコードから日本語メッセージを取得
 */
export function getErrorMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    UNAUTHORIZED: 'ログインが必要です',
    FORBIDDEN: 'アクセス権限がありません',
    NOT_FOUND: 'データが見つかりません',
    VALIDATION_ERROR: '入力内容に誤りがあります',
    CREDIT_INSUFFICIENT: 'クレジット残高が不足しています',
    PLAN_REQUIRED: 'この機能を使用するにはプランの加入が必要です',
    RATE_LIMIT: 'リクエストが多すぎます。しばらく待ってから再試行してください',
    STORAGE_LIMIT: 'ストレージ容量が不足しています',
    PROCESSING_FAILED: 'MIX処理に失敗しました',
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    UNKNOWN_ERROR: '予期しないエラーが発生しました'
  }
  return messages[code] || messages.UNKNOWN_ERROR
}

/**
 * HTTPステータスコードからエラーコードを推定
 */
export function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 422: return 'VALIDATION_ERROR'
    case 429: return 'RATE_LIMIT'
    case 402: return 'CREDIT_INSUFFICIENT'
    case 507: return 'STORAGE_LIMIT'
    default:
      if (status >= 500) return 'PROCESSING_FAILED'
      if (status >= 400) return 'VALIDATION_ERROR'
      return 'UNKNOWN_ERROR'
  }
}

/**
 * エラーを作成
 */
export function createError(
  code: ErrorCode,
  message?: string,
  details?: any,
  status?: number
): AppError {
  const error = new Error(message || getErrorMessage(code)) as AppError
  error.code = code
  error.status = status
  error.details = details
  error.retryable = isRetryableError(code)
  return error
}

/**
 * リトライ可能なエラーかチェック
 */
export function isRetryableError(code: ErrorCode): boolean {
  return [
    'RATE_LIMIT',
    'NETWORK_ERROR',
    'PROCESSING_FAILED'
  ].includes(code)
}

/**
 * APIレスポンスからエラーを作成
 */
export async function createErrorFromResponse(response: Response): Promise<AppError> {
  let details = null
  let code: ErrorCode = getErrorCodeFromStatus(response.status)
  let message: string | undefined

  try {
    const data = await response.json()
    details = data
    
    // サーバーからのエラーコードがあれば使用
    if (data.code) {
      code = data.code as ErrorCode
    }
    
    // サーバーからのメッセージがあれば使用
    if (data.message) {
      message = data.message
    }
  } catch {
    // JSONパースエラーは無視
  }

  return createError(code, message, details, response.status)
}

/**
 * エラーをコンソールに表示
 */
export function showErrorToast(error: AppError | Error | unknown) {
  let title = 'エラー'
  let description = '予期しないエラーが発生しました'
  let variant: 'default' | 'destructive' = 'destructive'

  if (error instanceof Error) {
    description = error.message
    
    if ('code' in error) {
      const appError = error as AppError
      
      // エラーコードによってタイトルを変更
      switch (appError.code) {
        case 'CREDIT_INSUFFICIENT':
          title = 'クレジット不足'
          break
        case 'PLAN_REQUIRED':
          title = 'プラン加入が必要'
          break
        case 'RATE_LIMIT':
          title = 'リクエスト制限'
          break
        case 'UNAUTHORIZED':
          title = 'ログインが必要'
          break
        default:
          title = 'エラー'
      }
      
      // リトライ可能なエラーは警告として表示
      if (appError.retryable) {
        variant = 'default'
      }
    }
  } else if (typeof error === 'string') {
    description = error
  }

  // コンソールに出力
  if (variant === 'destructive') {
    console.error(`❌ ${title}: ${description}`)
  } else {
    console.warn(`⚠️ ${title}: ${description}`)
  }
}

/**
 * エラーログをサーバーに送信
 */
export async function logError(error: AppError | Error, context?: any) {
  try {
    await fetch('/api/v1/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        code: 'code' in error ? error.code : 'UNKNOWN_ERROR',
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    })
  } catch {
    // ログ送信の失敗は無視
    console.error('Failed to log error:', error)
  }
}

/**
 * グローバルエラーハンドラーの設定
 */
export function setupGlobalErrorHandler() {
  // 未処理のPromiseエラーをキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    const error = event.reason instanceof Error 
      ? event.reason 
      : createError('UNKNOWN_ERROR', String(event.reason))
    
    showErrorToast(error)
    logError(error, { type: 'unhandledrejection' })
    
    // デフォルトの動作を防ぐ
    event.preventDefault()
  })

  // 一般的なエラーをキャッチ
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    
    const error = event.error instanceof Error
      ? event.error
      : createError('UNKNOWN_ERROR', event.message)
    
    showErrorToast(error)
    logError(error, { 
      type: 'error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
    
    // デフォルトの動作を防ぐ
    event.preventDefault()
  })
}

/**
 * リトライ機能付きfetch
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      
      // レート制限の場合は自動リトライ
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * (i + 1)
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      return response
    } catch (error) {
      lastError = error as Error
      
      // ネットワークエラーの場合はリトライ
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)))
        continue
      }
    }
  }
  
  throw lastError || createError('NETWORK_ERROR')
}