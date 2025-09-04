import { NextRequest, NextResponse } from 'next/server'
import { badRequest, notFound } from '../../../../_lib/errors'
import { downloadQuery, jobIdParam } from '../../../../_lib/validation'
import { getSupabaseWithRLS } from '../../../../_lib/auth'
import { parseStoragePath } from 'storage/service'

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const idParsed = jobIdParam.safeParse(ctx.params)
  if (!idParsed.success) return badRequest('Invalid job id')

  const { searchParams } = new URL(req.url)
  const parsed = downloadQuery.safeParse({ format: searchParams.get('format') || '' })
  if (!parsed.success) return badRequest('format は mp3|wav のみ対応です')

  const supabase = getSupabaseWithRLS(req)
  // RLSにより本人以外は取得不可
  const { data: job, error } = await supabase
    .from('jobs')
    .select('result_path')
    .eq('id', idParsed.data.id)
    .single()

  if (error) return notFound('ジョブが見つかりません')
  if (!job?.result_path) return notFound('結果ファイルが未生成です')

  // フォーマット別に拡張子を置換（out.mp3 / out.wav）
  const desiredExt = parsed.data.format
  const altPath = job.result_path.replace(/\.(mp3|wav)$/i, `.${desiredExt}`)
  const { bucket, key } = parseStoragePath(altPath)
  const ttl = Number(process.env.SIGNED_URL_TTL_SEC || 300)
  const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(key, ttl)
  if (signErr || !signed?.signedUrl) return notFound('ダウンロードURLを生成できませんでした')
  return NextResponse.json({ url: signed.signedUrl })
}
