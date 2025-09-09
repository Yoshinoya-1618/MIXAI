"use client"
import { supabase } from '../../lib/supabase'

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.get('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  return fetch(path, { ...init, headers })
}

export type CreateJobResponse = {
  job: { id: string }
  upload_targets: { instrumental_prefix: string; vocal_prefix: string; harmony_prefix?: string }
}
