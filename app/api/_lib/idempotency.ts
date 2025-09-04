import { createServiceSupabase } from 'storage/supabaseClient'

export function getIdempotencyKey(req: Request) {
  // 大文字小文字の揺れに対応
  const key = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key')
  return key || null
}

export type IdempotencyResult = {
  isNewRequest: boolean
  storedResponse?: any
}

// Idempotency Keyをチェック・保存する関数
export async function checkIdempotencyKey(key: string): Promise<IdempotencyResult> {
  if (!key) {
    return { isNewRequest: true }
  }

  const supabase = createServiceSupabase()
  
  try {
    // 既存のキーを検索
    const { data: existing, error } = await supabase
      .from('idempotency_keys')
      .select('response, status')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned 以外のエラー
      console.error('Idempotency check error:', error)
      return { isNewRequest: true } // エラー時は新規リクエストとして処理
    }

    if (existing) {
      if (existing.status === 'completed' && existing.response) {
        // 完了済みリクエスト: 保存されたレスポンスを返す
        return { 
          isNewRequest: false, 
          storedResponse: existing.response 
        }
      }
      
      if (existing.status === 'processing') {
        // 処理中: 新規として扱う（タイムアウト時の再試行を許可）
        return { isNewRequest: true }
      }
    }

    // 新規リクエスト: processing状態で記録
    await supabase
      .from('idempotency_keys')
      .upsert({
        key,
        status: 'processing'
      }, {
        onConflict: 'key',
        ignoreDuplicates: true
      })

    return { isNewRequest: true }

  } catch (error) {
    console.error('Idempotency key processing error:', error)
    return { isNewRequest: true } // エラー時は新規として処理
  }
}

// Idempotency Keyに対するレスポンスを保存
export async function storeIdempotencyResponse(key: string, response: any): Promise<void> {
  if (!key) return

  const supabase = createServiceSupabase()
  
  try {
    await supabase
      .from('idempotency_keys')
      .update({
        response,
        status: 'completed'
      })
      .eq('key', key)

  } catch (error) {
    console.error('Failed to store idempotency response:', error)
    // エラーでも処理を継続（冪等性は保証されないが、機能は動作する）
  }
}

