import { createBrowserSupabase, createServiceSupabase } from './supabaseClient'
import { promises as fs } from 'fs'

export async function getSignedUrl(bucket: string, path: string, expiresInSec: number) {
  const supabase = createBrowserSupabase()
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(path, expiresInSec)
  if (error) throw error
  return data.signedUrl
}

export function parseStoragePath(fullPath: string): { bucket: string; key: string } {
  // 例: 'uta-results/users/uid/jobs/jid/out.mp3' -> { bucket: 'uta-results', key: 'users/uid/jobs/jid/out.mp3' }
  const idx = fullPath.indexOf('/')
  if (idx === -1) return { bucket: fullPath, key: '' }
  return { bucket: fullPath.slice(0, idx), key: fullPath.slice(idx + 1) }
}

// Placeholder: uploads should be client-direct via RLS; worker uses Service Role
export async function putObjectService(bucket: string, path: string, file: Buffer, contentType?: string) {
  const supabase = createServiceSupabase()
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true })
  if (error) throw error
  return data
}

// Worker用のダウンロード機能
export async function downloadFile(bucket: string, path: string, localPath: string) {
  const supabase = createServiceSupabase()
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(path)
  
  if (error) throw error
  if (!data) throw new Error(`Failed to download ${bucket}/${path}`)
  
  // Blobをバッファに変換してファイル保存
  const arrayBuffer = await data.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(localPath, buffer)
}
