// app/api/v1/themes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseWithRLS } from '../../_lib/auth'
import { badRequest, unauthorized, handleApiError } from '../../_lib/errors'
import { getPresetsForPlan, getPresetParams, MIX_PRESETS } from '../../../../worker/presets'
import { checkRateLimit, addRateLimitHeaders } from '../../_lib/ratelimit'

// GET /v1/themes - テーマ一覧取得（MIX前選択用）
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

    // プラン決定
    const planCode = (subscription as any)?.plan_code || 'prepaid'
    
    // プラン名と処理精度の取得
    const { planName, processingAccuracy, accuracyDescription } = getPlanDetails(planCode)

    // プラン対応テーマ取得（presetをthemeとして扱う）
    let availableThemeKeys: string[] = []
    
    switch (planCode) {
      case 'freetrial':
        // フリートライアルはCreator相当（全12種）
        availableThemeKeys = getPresetsForPlan('creator')
        break
      case 'prepaid':
        // プリペイドはStandard相当（7種）
        availableThemeKeys = getPresetsForPlan('standard')
        break
      case 'lite':
        availableThemeKeys = getPresetsForPlan('lite')
        break
      case 'standard':
        availableThemeKeys = getPresetsForPlan('standard')
        break
      case 'creator':
        availableThemeKeys = getPresetsForPlan('creator')
        break
      default:
        availableThemeKeys = getPresetsForPlan('lite')
    }
    
    // テーマ詳細情報構築
    const themes = availableThemeKeys.map(key => {
      const params = getPresetParams(key as any)
      return {
        key,
        category: params.category,
        displayName: params.displayName,
        description: params.description,
        // パラメータ詳細は含めない（セキュリティ上の理由）
      }
    })

    // カテゴリ別にグループ化
    const themesByCategory = {
      basic: themes.filter(t => t.category === 'basic'),
      pop: themes.filter(t => t.category === 'pop'),
      studio: themes.filter(t => t.category === 'studio'),
    }

    const response = NextResponse.json({
      planCode,
      planName,
      processingAccuracy,
      accuracyDescription,
      themes: themesByCategory,
      features: {
        // プラン別の追加機能
        microAdjust: ['standard', 'creator', 'freetrial'].includes(planCode),
        instPolicy: ['standard', 'creator', 'freetrial'].includes(planCode),
        advancedThemes: ['creator', 'freetrial'].includes(planCode),
        harmonyIncluded: true, // 全プランでハモリ無料
      }
    })

    return addRateLimitHeaders(response, req)

  } catch (error) {
    return handleApiError(error, 'テーマ取得')
  }
}

// POST /v1/themes/analyze - 自動テーマ推奨（Standard/Creator）
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

    const planCode = (subscription as any)?.plan_code || 'prepaid'
    
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

    // TODO: 実際の音声解析による推奨テーマ選択
    // 現在は簡易的な推奨ロジック
    const recommendedTheme = getRecommendedTheme(planCode)

    const response = NextResponse.json({
      recommendedTheme: {
        key: recommendedTheme,
        params: getPresetParams(recommendedTheme as any),
        confidence: 0.8, // 推奨の信頼度
        reason: '汎用的な設定として推奨'
      }
    })

    return addRateLimitHeaders(response, req)

  } catch (error) {
    return handleApiError(error, 'テーマ解析')
  }
}

/**
 * プラン詳細情報を取得
 */
function getPlanDetails(planCode: string) {
  switch (planCode) {
    case 'freetrial':
      return {
        planName: 'FreeTrial (Creator相当)',
        processingAccuracy: '超高精度',
        accuracyDescription: 'プロフェッショナル品質のAI解析・MIX処理'
      }
    case 'prepaid':
      return {
        planName: 'Prepaid',
        processingAccuracy: '高精度',
        accuracyDescription: 'バランスの取れた高品質処理'
      }
    case 'lite':
      return {
        planName: 'Lite',
        processingAccuracy: '標準精度',
        accuracyDescription: '基本的なMIX処理'
      }
    case 'standard':
      return {
        planName: 'Standard',
        processingAccuracy: '高精度',
        accuracyDescription: 'バランスの取れた高品質処理'
      }
    case 'creator':
      return {
        planName: 'Creator',
        processingAccuracy: '超高精度',
        accuracyDescription: 'プロフェッショナル品質のAI解析・MIX処理'
      }
    default:
      return {
        planName: planCode.toUpperCase(),
        processingAccuracy: '標準精度',
        accuracyDescription: '基本的なMIX処理'
      }
  }
}

/**
 * 簡易的な推奨テーマ選択
 * TODO: 実際の音声解析による推奨に置き換え
 */
function getRecommendedTheme(planCode: string) {
  switch (planCode) {
    case 'freetrial':
    case 'creator':
      return 'studio_shine' // Creator向け高品質テーマ
    case 'prepaid':
    case 'standard':
      return 'wide_pop' // Standard向け汎用テーマ
    case 'lite':
      return 'clean_light' // Lite向け基本テーマ
    default:
      return 'clean_light'
  }
}