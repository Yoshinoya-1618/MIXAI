import { NextRequest, NextResponse } from 'next/server'
import { badRequest, unauthorized, handleApiError } from '../../_lib/errors'
import { getSupabaseWithRLS } from '../../_lib/auth'
import { uploadPrefix } from '../../_lib/paths'
import { checkRateLimit, addRateLimitHeaders } from '../../_lib/ratelimit'

export async function POST(req: NextRequest) {
  // レート制限チェック
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse
  try {
    let supabase
    try {
      supabase = getSupabaseWithRLS(req)
    } catch (resp: any) {
      return resp
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return unauthorized('ユーザー情報を取得できません')
    const uid = userRes.user.id

    const { data, error } = await supabase
      .from('jobs')
      .insert({ user_id: uid, status: 'uploaded' })
      .select('id, user_id, status, instrumental_path, vocal_path, result_path, offset_ms, atempo, target_lufs, true_peak, error, created_at, updated_at')
      .single()
    
    if (error) {
      console.error('ジョブ作成エラー:', error)
      return badRequest('ジョブ作成に失敗しました', { supabaseError: error.message })
    }
    
    if (!data) return badRequest('ジョブ作成に失敗しました')

    const prefix = uploadPrefix(uid, data.id)
    const response = NextResponse.json({
      job: data,
      upload_targets: {
        instrumental_prefix: `${prefix}/inst`,
        vocal_prefix: `${prefix}/vocal`,
      },
    }, { status: 201 })

    // レート制限ヘッダー追加
    return addRateLimitHeaders(response, req)
  } catch (error) {
    return handleApiError(error, 'ジョブ作成')
  }
}

