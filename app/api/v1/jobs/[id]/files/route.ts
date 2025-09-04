import { badRequest, unauthorized, notFound, createRequestErrorHandler, conflict } from '../../../../_lib/errors'
import { parseJson, safeJsonResponse } from '../../../../_lib/json'
import { filesPatchBody, jobIdParam, validateRequest } from '../../../../_lib/validation'
import { getSupabaseWithRLS } from '../../../../_lib/auth'
import { uploadPrefix } from '../../../../_lib/paths'

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const requestId = `files_${Date.now()}_${Math.random().toString(36).substring(2)}`
  const handleError = createRequestErrorHandler(requestId)
  
  try {
    // パラメータバリデーション
    const paramsValidation = validateRequest(jobIdParam, ctx.params)
    if (!paramsValidation.success) {
      return badRequest('無効なジョブIDです', { validation_error: paramsValidation.error }, requestId)
    }
    const jobId = paramsValidation.data.id

    // リクエストボディのパースとバリデーション
    let body
    try {
      body = await parseJson(req, filesPatchBody, requestId)
    } catch (resp: any) {
      return resp
    }

    let supabase
    try {
      supabase = getSupabaseWithRLS(req)
    } catch (resp: any) {
      return resp
    }

    // ユーザー認証確認
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) {
      return unauthorized('ユーザー情報を取得できません', requestId)
    }
    const uid = userRes.user.id

    // パスの権限チェック（セキュリティ強化）
    const expectedPrefix = uploadPrefix(uid, jobId)
    if (!body.instrumental_path.startsWith(expectedPrefix) || !body.vocal_path.startsWith(expectedPrefix)) {
      return badRequest('ストレージパスが不正です', {
        expected_prefix: expectedPrefix,
        provided_paths: {
          instrumental: body.instrumental_path.substring(0, 50) + '...',
          vocal: body.vocal_path.substring(0, 50) + '...'
        }
      }, requestId)
    }
    
    // 同じパスが指定されていないかチェック
    if (body.instrumental_path === body.vocal_path) {
      return badRequest('伴奏とボーカルは異なるファイルである必要があります', undefined, requestId)
    }

    // ジョブの存在確認と所有者チェック
    const { data: existingJob, error: fetchError } = await supabase
      .from('jobs')
      .select('id, user_id, status, created_at')
      .eq('id', jobId)
      .single()
      
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFound('指定されたジョブが見つかりません', requestId)
      }
      throw fetchError
    }
    
    if (existingJob.user_id !== uid) {
      return notFound('指定されたジョブが見つかりません', requestId)
    }
    
    // 状態チェック（ファイルは初期状態のみ更新可能）
    if (existingJob.status !== 'uploaded') {
      return conflict('このジョブはファイルパスを変更できない状態です', {
        current_status: existingJob.status,
        allowed_status: 'uploaded'
      }, requestId)
    }

    // ファイルパスの更新（楽観的ロック）
    const { data, error } = await supabase
      .from('jobs')
      .update({ 
        instrumental_path: body.instrumental_path, 
        vocal_path: body.vocal_path,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('status', 'uploaded') // Concurrent modification防止
      .select('id, user_id, status, instrumental_path, vocal_path, result_path, offset_ms, atempo, target_lufs, true_peak, error, created_at, updated_at')
      .single()
      
    if (error) {
      if (error.code === 'PGRST116') {
        return conflict('ジョブの状態が変更されています。再度お試しください', undefined, requestId)
      }
      throw error
    }
    
    if (!data) {
      return conflict('ジョブの状態が変更されています。再度お試しください', undefined, requestId)
    }
    
    console.log(`Job ${jobId} files updated:`, {
      instrumental_path: body.instrumental_path,
      vocal_path: body.vocal_path,
      request_id: requestId
    })
    
    return safeJsonResponse({
      ...data,
      request_id: requestId
    })
    
  } catch (error) {
    return handleError(error, 'ファイルパス更新')
  }
}

