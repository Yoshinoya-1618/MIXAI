import { z } from 'zod'
import { badRequest, payloadTooLarge, unprocessableEntity } from './errors'
import { validateRequest } from './validation'

// JSONペイロードサイズ制限（MB）
const MAX_JSON_SIZE = Number(process.env.MAX_JSON_MB || 10) * 1024 * 1024

export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T>,
  requestId?: string
): Promise<T> {
  // Content-Lengthチェック
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > MAX_JSON_SIZE) {
    throw payloadTooLarge(`リクエストサイズが${MAX_JSON_SIZE / (1024 * 1024)}MBを超えています`, requestId)
  }

  // Content-Typeチェック
  const contentType = req.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw badRequest('Content-Typeはapplication/jsonである必要があります', undefined, requestId)
  }

  let json
  try {
    const text = await req.text()
    
    // サイズのダブルチェック
    if (text.length > MAX_JSON_SIZE) {
      throw payloadTooLarge(`リクエストサイズが${MAX_JSON_SIZE / (1024 * 1024)}MBを超えています`, requestId)
    }
    
    // 空のリクエストチェック
    if (!text.trim()) {
      throw badRequest('リクエストボディが空です', undefined, requestId)
    }
    
    json = JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw badRequest('無効なJSON形式です', { 
        error: error.message,
        position: 'message' in error ? (error as any).message.match(/position (\d+)/)?.[1] : undefined
      }, requestId)
    }
    throw error // 他のエラーは再スロー
  }
  
  // JSONのネスト深度チェック（DoS防止）
  if (getJsonDepth(json) > 10) {
    throw badRequest('JSONのネストが深すぎます', undefined, requestId)
  }
  
  // バリデーション
  const validation = validateRequest(schema, json)
  if (!validation.success) {
    throw unprocessableEntity('バリデーションエラー', {
      validation_errors: validation.error
    }, requestId)
  }
  
  return validation.data
}

// JSONのネスト深度を計算
function getJsonDepth(obj: any, depth = 0): number {
  if (depth > 10) return depth // 早期終了
  
  if (obj === null || typeof obj !== 'object') {
    return depth
  }
  
  if (Array.isArray(obj)) {
    return Math.max(depth, ...obj.map(item => getJsonDepth(item, depth + 1)))
  }
  
  const values = Object.values(obj)
  if (values.length === 0) return depth
  
  return Math.max(depth, ...values.map(value => getJsonDepth(value, depth + 1)))
}

// 安全なJSONレスポンス生成
export function safeJsonResponse(data: any, status = 200, headers?: Record<string, string>) {
  const responseHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  }
  
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders
  })
}

// 後方互換性のためのエイリアス
export const validateJson = parseJson

