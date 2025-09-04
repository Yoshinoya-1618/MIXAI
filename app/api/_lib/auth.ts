import { createClient } from '@supabase/supabase-js'
import { unauthorized } from './errors'

export function getAuthToken(req: Request) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7)
}

export function getSupabaseWithRLS(req: Request) {
  const token = getAuthToken(req)
  if (!token) throw unauthorized('Bearer トークンが必要です')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export async function authenticateUser(req: Request) {
  const supabase = getSupabaseWithRLS(req)
  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes.user) {
    throw unauthorized('ユーザー情報を取得できません')
  }
  return { user: userRes.user, supabase }
}

