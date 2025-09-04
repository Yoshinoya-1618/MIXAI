"use client"
import { createBrowserSupabase } from '../../storage/supabaseClient'

export function splitBucketKey(fullPath: string): { bucket: string; key: string } {
  const idx = fullPath.indexOf('/')
  if (idx === -1) return { bucket: fullPath, key: '' }
  return { bucket: fullPath.slice(0, idx), key: fullPath.slice(idx + 1) }
}

export function guessContentType(filename: string) {
  return filename.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
}

export async function uploadFile(fullPrefix: string, file: File) {
  const { bucket, key } = splitBucketKey(fullPrefix)
  const ext = file.name.split('.').pop() || 'wav'
  const path = `${key}.${ext}`
  const supabase = createBrowserSupabase()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: guessContentType(file.name),
  })
  if (error) throw error
  return `${bucket}/${path}`
}

