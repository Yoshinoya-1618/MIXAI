// app/api/v1/presets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseWithRLS } from '../../_lib/auth'
import { badRequest, unauthorized, handleApiError } from '../../_lib/errors'
import { getPresetsForPlan, getPresetParams, MIX_PRESETS } from '../../../../worker/presets'
import { checkRateLimit, addRateLimitHeaders } from '../../_lib/ratelimit'

// GET /v1/presets - プリセット一覧取得
export async function GET(req: NextRequest) {
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

    // ユーザーのプラン取得
    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: uid })
      .maybeSingle()

    // プラン決定（デフォルトはlite）
    const planCode = (subscription as any)?.plan_code || 'lite'

    // プラン対応プリセット取得
    const availablePresetKeys = getPresetsForPlan(planCode as 'lite' | 'standard' | 'creator')
    
    // プリセット詳細情報構築
    const presets = availablePresetKeys.map(key => {
      const params = getPresetParams(key)
      return {
        key,
        category: params.category,
        displayName: params.displayName,
        description: params.description,
        // パラメータ詳細は含めない（セキュリティ上の理由）
      }
    })

    // カテゴリ別にグループ化
    const presetsByCategory = {
      basic: presets.filter(p => p.category === 'basic'),
      pop: presets.filter(p => p.category === 'pop'),
      studio: presets.filter(p => p.category === 'studio'),
    }

    const response = NextResponse.json({
      planCode,
      presets: presetsByCategory,
      features: {
        microAdjust: ['standard', 'creator'].includes(planCode),
        instPolicy: ['standard', 'creator'].includes(planCode),
        advancedPresets: planCode === 'creator'
      }
    })

    return addRateLimitHeaders(response, req)

  } catch (error) {
    return handleApiError(error, 'プリセット取得')
  }
}

// POST /v1/presets/analyze - 自動プリセット推奨（Standard/Creator）
export async function POST(req: NextRequest) {
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

    // プラン確認
    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: uid })
      .maybeSingle()

    const planCode = (subscription as any)?.plan_code || 'lite'
    
    if (planCode === 'lite') {
      return badRequest('自動解析はStandardプラン以上で利用できます')
    }

    const { jobId } = await req.json()
    
    if (!jobId) {
      return badRequest('jobId is required')
    }

    // ジョブの存在確認
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', uid)
      .single()

    if (!job) {
      return badRequest('Job not found or access denied')
    }

    // TODO: 実際の音声解析による推奨プリセット選択
    // 現在は簡易的な推奨ロジック
    const recommendedPreset = getRecommendedPreset(planCode as 'standard' | 'creator')

    const response = NextResponse.json({
      recommendedPreset: {
        key: recommendedPreset,
        params: getPresetParams(recommendedPreset),
        confidence: 0.8, // 推奨の信頼度
        reason: '汎用的な設定として推奨'
      },
      // 微調整の初期値も提案
      suggestedAdjustments: {
        forwardness: 0,
        space: 0.2,
        brightness: 0.5
      }
    })

    return addRateLimitHeaders(response, req)

  } catch (error) {
    return handleApiError(error, 'プリセット解析')
  }
}

/**
 * 簡易的な推奨プリセット選択
 * TODO: 実際の音声解析による推奨に置き換え
 */
function getRecommendedPreset(planCode: 'standard' | 'creator') {
  // プランに基づいた推奨プリセット
  switch (planCode) {
    case 'standard':
      return 'wide_pop' // Standard向け汎用プリセット
    case 'creator':
      return 'studio_shine' // Creator向け高品質プリセット
    default:
      return 'clean_light'
  }
}