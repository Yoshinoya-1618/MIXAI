import { NextRequest, NextResponse } from 'next/server'
import { badRequest, notFound, handleApiError, conflict, createRequestErrorHandler } from '../../../../_lib/errors'
import { getSupabaseWithRLS } from '../../../../_lib/auth'
import { jobIdParam, renderParams, validateRequest } from '../../../../_lib/validation'
import { checkRateLimit, addRateLimitHeaders } from '../../../../_lib/ratelimit'
import { parseJson, safeJsonResponse } from '../../../../_lib/json'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const requestId = `render_${Date.now()}_${Math.random().toString(36).substring(2)}`
  const handleError = createRequestErrorHandler(requestId)
  
  try {
    // レート制限チェック
    const rateLimitResponse = checkRateLimit(req)
    if (rateLimitResponse) return rateLimitResponse
    
    // パラメータバリデーション
    const paramsValidation = validateRequest(jobIdParam, ctx.params)
    if (!paramsValidation.success) {
      return badRequest('無効なジョブIDです', { validation_error: paramsValidation.error }, requestId)
    }
    const jobId = paramsValidation.data.id
    
    // レンダリングパラメータの解析（オプション）
    let renderOptions = { offset_ms: 0, atempo: 1.0, target_lufs: -14 }
    try {
      if (req.headers.get('content-length') && parseInt(req.headers.get('content-length')!) > 0) {
        const parsedOptions = await parseJson(req, renderParams, requestId)
        renderOptions = {
          offset_ms: parsedOptions.offset_ms ?? 0,
          atempo: parsedOptions.atempo ?? 1.0,
          target_lufs: parsedOptions.target_lufs ?? -14
        }
      }
    } catch (error) {
      // JSONパースエラーは既に適切にハンドルされている
      throw error
    }
    
    let supabase
    try {
      supabase = getSupabaseWithRLS(req)
    } catch (resp: any) {
      return resp
    }

    // ジョブの存在確認と状態チェック（トランザクション的に）
    const { data: job, error } = await supabase
      .from('jobs')
      .select('id, status, instrumental_path, vocal_path, user_id, created_at, updated_at')
      .eq('id', jobId)
      .single()
      
    if (error) {
      if (error.code === 'PGRST116') {
        return notFound('指定されたジョブが見つかりません', requestId)
      }
      throw error
    }
    
    if (!job) {
      return notFound('指定されたジョブが見つかりません', requestId)
    }

    // 状態チェック
    if (job.status === 'processing') {
      const response = safeJsonResponse({ 
        status: 'processing', 
        message: '既に処理中です',
        request_id: requestId
      }, 202)
      return addRateLimitHeaders(response, req)
    }
    
    if (job.status === 'completed') {
      return conflict('このジョブは既に完了しています', undefined, requestId)
    }
    
    if (job.status !== 'paid') {
      return badRequest('支払いが完了していないため、レンダリングを開始できません', {
        current_status: job.status,
        required_status: 'paid'
      }, requestId)
    }
    
    if (!job.instrumental_path || !job.vocal_path) {
      return badRequest('ファイルパスが設定されていません', {
        instrumental_path: !!job.instrumental_path,
        vocal_path: !!job.vocal_path
      }, requestId)
    }

    // 楽観的ロック的更新（updated_atをチェック）
    const { data: updated, error: updErr } = await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        offset_ms: renderOptions.offset_ms,
        atempo: renderOptions.atempo,
        target_lufs: renderOptions.target_lufs,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('status', 'paid') // Concurrent modification防止
      .select('id, status, offset_ms, atempo, target_lufs, updated_at')
      .single()
      
    if (updErr) {
      if (updErr.code === 'PGRST116') {
        return conflict('ジョブの状態が変更されています。再度お試しください', undefined, requestId)
      }
      throw updErr
    }
    
    if (!updated) {
      return conflict('ジョブの状態が変更されています。再度お試しください', undefined, requestId)
    }

    // TODO: 実際のワーカーへエンキュー（DBトリガ/外部キュー/ポーリング）
    // 現在はポーリングベースなので、DBの更新のみで十分
    
    console.log(`Job ${jobId} queued for processing with params:`, {
      offset_ms: renderOptions.offset_ms,
      atempo: renderOptions.atempo,
      target_lufs: renderOptions.target_lufs,
      request_id: requestId
    })
    
    const response = safeJsonResponse({
      status: 'processing',
      job_id: jobId,
      render_params: {
        offset_ms: updated.offset_ms,
        atempo: updated.atempo,
        target_lufs: updated.target_lufs
      },
      message: 'レンダリングを開始しました',
      request_id: requestId
    }, 202)
    
    return addRateLimitHeaders(response, req)
    
  } catch (error) {
    return handleError(error, 'レンダリング開始')
  }
}

