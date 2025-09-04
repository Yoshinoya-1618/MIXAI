import { z } from 'zod'

// UUID検証を強化（v4限定）
export const jobIdParam = z.object({ 
  id: z.string().uuid('無効なジョブIDです').refine(
    (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    { message: 'ジョブIDはUUID v4形式である必要があります' }
  )
})

// ファイルパス検証を強化（セキュリティ考慮）
export const filesPatchBody = z.object({
  instrumental_path: z.string().min(1).max(500, 'パスが長すぎます').refine(
    (path) => {
      // パストラバーサル攻撃防止
      if (path.includes('..') || path.includes('~') || path.startsWith('/')) {
        return false
      }
      // 拡張子とパス構造チェック
      return /\.(wav|mp3|aac|m4a)$/i.test(path) && 
             path.includes('users/') && 
             path.includes('jobs/') &&
             !path.includes('//') // 連続スラッシュ禁止
    },
    { message: 'ファイルパスが不正です（WAV/MP3/AAC/M4A、適切なパス構造が必要）' }
  ),
  vocal_path: z.string().min(1).max(500, 'パスが長すぎます').refine(
    (path) => {
      // パストラバーサル攻撃防止
      if (path.includes('..') || path.includes('~') || path.startsWith('/')) {
        return false
      }
      // 拡張子とパス構造チェック
      return /\.(wav|mp3|aac|m4a)$/i.test(path) && 
             path.includes('users/') && 
             path.includes('jobs/') &&
             !path.includes('//') // 連続スラッシュ禁止
    },
    { message: 'ファイルパスが不正です（WAV/MP3/AAC/M4A、適切なパス構造が必要）' }
  ),
})

export const downloadQuery = z.object({
  format: z.enum(['mp3', 'wav'], {
    errorMap: () => ({ message: 'フォーマットはmp3またはwavを指定してください' })
  })
})

// レンダリングパラメータ検証
export const renderParams = z.object({
  offset_ms: z.number().int().min(-2000).max(2000).default(0),
  atempo: z.number().min(0.5).max(2.0).default(1.0),
  target_lufs: z.number().min(-30).max(-6).default(-14)
})

// ファイルサイズとMIME検証用（強化版）
export const fileValidation = z.object({
  name: z.string().min(1).max(255, 'ファイル名が長すぎます').refine(
    (name) => {
      // 危険な文字をチェック
      const dangerousChars = /[<>:"|?*\\]/
      return !dangerousChars.test(name)
    },
    { message: 'ファイル名に使用できない文字が含まれています' }
  ),
  size: z.number().int().positive('ファイルサイズが無効です').max(
    Number(process.env.MAX_FILE_MB || 20) * 1024 * 1024,
    `ファイルサイズは${Number(process.env.MAX_FILE_MB || 20)}MB以下にしてください`
  ),
  type: z.string().refine(
    (type) => {
      const validTypes = [
        'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/mpeg', 'audio/mp3', 'audio/mpeg3',
        'audio/aac', 'audio/x-aac', 'audio/aacp',
        'audio/mp4', 'audio/x-m4a'
      ]
      return validTypes.includes(type.toLowerCase())
    },
    { message: 'サポートされていない音声形式です（WAV/MP3/AAC/M4Aのみ）' }
  ),
  duration: z.number().positive('音声時間が無効です').max(
    Number(process.env.MAX_DURATION_SEC || 60),
    `音声は${Number(process.env.MAX_DURATION_SEC || 60)}秒以下にしてください`
  ).optional()
})

// Webhook検証（決済用）
export const webhookPayload = z.object({
  type: z.string(),
  data: z.record(z.any()),
  created: z.number().int().positive(),
  livemode: z.boolean()
})

// IP アドレス検証
export const ipAddress = z.string().refine(
  (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'unknown'
  },
  { message: '無効なIPアドレスです' }
)

export type JobIdParam = z.infer<typeof jobIdParam>
export type FilesPatchBody = z.infer<typeof filesPatchBody>
export type DownloadQuery = z.infer<typeof downloadQuery>
export type RenderParams = z.infer<typeof renderParams>
export type FileValidation = z.infer<typeof fileValidation>
export type WebhookPayload = z.infer<typeof webhookPayload>
export type IpAddress = z.infer<typeof ipAddress>

// バリデーションヘルパー関数
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // エラーメッセージを日本語で整理
  const errorMessage = result.error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ')
    
  return { success: false, error: errorMessage }
}

// 音声ファイル拡張子チェック
export function isValidAudioExtension(filename: string): boolean {
  const validExtensions = ['.wav', '.mp3', '.aac', '.m4a']
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0]
  return ext ? validExtensions.includes(ext) : false
}

// 安全なファイル名生成
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"|?*\\]/g, '_') // 危険な文字を置換
    .replace(/\s+/g, '_') // スペースをアンダースコアに
    .replace(/_{2,}/g, '_') // 連続アンダースコアを単一に
    .substring(0, 200) // 長さ制限
}

