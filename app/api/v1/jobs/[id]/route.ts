import { notFound, badRequest } from '../../../_lib/errors'
import { jobIdParam } from '../../../_lib/validation'
import { getSupabaseWithRLS } from '../../../_lib/auth'

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const parsed = jobIdParam.safeParse(ctx.params)
  if (!parsed.success) return badRequest('Invalid job id')
  let supabase
  try {
    supabase = getSupabaseWithRLS(req)
  } catch (resp: any) {
    return resp
  }
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id, user_id, status, instrumental_path, vocal_path, result_path, 
      out_format, sample_rate, bit_depth,
      plan_code, preset_key, inst_policy, micro_adjust,
      offset_ms, atempo, tempo_map_applied, rescue_applied,
      beat_dev_ms_before, beat_dev_ms_after,
      pitch_err_cent_before, pitch_err_cent_after,
      hnr_before, hnr_after,
      target_lufs, measured_lufs, true_peak, 
      error, created_at, updated_at
    `)
    .eq('id', parsed.data.id)
    .single()
  if (error || !data) return notFound('ジョブが見つかりません')
  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } })
}
