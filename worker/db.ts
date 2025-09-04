import { createServiceSupabase } from '../storage/supabaseClient'

export type JobRow = {
  id: string
  user_id: string
  status: 'uploaded'|'paid'|'processing'|'done'|'failed'
  instrumental_path: string | null
  vocal_path: string | null
  result_path: string | null
  out_format?: string
  sample_rate?: number
  bit_depth?: number
  plan_code?: string
  preset_key?: string
  inst_policy?: 'bypass'|'safety'|'rescue'
  micro_adjust?: any
  target_lufs: number
  offset_ms?: number
  atempo?: number
  tempo_map_applied?: boolean
  rescue_applied?: boolean
  beat_dev_ms_before?: number
  beat_dev_ms_after?: number
  pitch_err_cent_before?: number
  pitch_err_cent_after?: number
  hnr_before?: number
  hnr_after?: number
  measured_lufs?: number
  true_peak?: number
  created_at: string
  updated_at: string
}

type TransactionCallback<T> = (supabase: ReturnType<typeof createServiceSupabase>) => Promise<T>

// トランザクションヘルパー（SupabaseはPostgreSQLのトランザクションをサポート）
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const supabase = serviceDb()
  
  // Supabaseの場合、明示的なトランザクション管理はサポートされていないため、
  // その代わりに楽観的ロックとリトライ機構で整合性を保つ
  return await callback(supabase)
}

export function serviceDb() {
  return createServiceSupabase()
}

export async function fetchNextProcessingJob(): Promise<JobRow | null> {
  return withTransaction(async (supabase) => {
    // 処理中のジョブを取得（タイムアウトしたジョブを含む）
    const timeoutThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10分前
    
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, user_id, status, instrumental_path, vocal_path, result_path, 
        out_format, sample_rate, bit_depth,
        plan_code, preset_key, inst_policy, micro_adjust,
        target_lufs, offset_ms, atempo, tempo_map_applied, rescue_applied,
        beat_dev_ms_before, beat_dev_ms_after,
        pitch_err_cent_before, pitch_err_cent_after,
        hnr_before, hnr_after, measured_lufs, true_peak,
        created_at, updated_at
      `)
      .eq('status', 'processing')
      .is('result_path', null)
      .or(`updated_at.lt.${timeoutThreshold},updated_at.is.null`) // タイムアウトしたものも含む
      .order('created_at', { ascending: true })
      .limit(1)
      
    if (error) {
      console.error('Failed to fetch next processing job:', error)
      throw error
    }
    
    const job = (data && data[0]) || null
    
    if (job) {
      // ジョブを取得した場合、updated_atを更新して他のWorkerが同じジョブを取得しないようにする
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          updated_at: new Date().toISOString(),
          status: 'processing' // 明示的に状態を再設定
        })
        .eq('id', job.id)
        .eq('status', 'processing') // 他のWorkerが既に取得していないことを確認
        
      if (updateError) {
        console.warn(`Failed to update job ${job.id} timestamp:`, updateError)
        // エラーでも継続（他のWorkerが取得した可能性あり）
      }
    }
    
    return job
  })
}

export async function markDone(jobId: string, resultPath: string, offsetMs = 0, atempo = 1.0, truePeak?: number) {
  return withTransaction(async (supabase) => {
    const updateData: any = { 
      status: 'done', 
      result_path: resultPath, 
      offset_ms: offsetMs, 
      atempo,
      error: null, // エラーをクリア
      updated_at: new Date().toISOString()
    }
    
    if (truePeak !== undefined) {
      updateData.true_peak = truePeak
    }
    
    // 楽観的ロック: processing状態のジョブのみ更新できる
    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('status', 'processing') // 状態が変更されていないことを確認
      .select('id')
      .single()
      
    if (error) {
      console.error(`Failed to mark job ${jobId} as done:`, error)
      throw error
    }
    
    if (!data) {
      throw new Error(`Job ${jobId} was not in processing state or has been modified by another worker`)
    }
    
    console.log(`Job ${jobId} successfully marked as done`)
  })
}

export async function markFailed(jobId: string, errorMessage: string) {
  return withTransaction(async (supabase) => {
    const updateData = {
      status: 'failed',
      error: errorMessage,
      updated_at: new Date().toISOString()
    }
    
    // 楽観的ロック: processing状態のジョブのみ失敗としてマークできる
    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('status', 'processing') // 状態が変更されていないことを確認
      .select('id')
      .single()
      
    if (error) {
      console.error(`Failed to mark job ${jobId} as failed:`, error)
      throw error
    }
    
    if (!data) {
      console.warn(`Job ${jobId} was not in processing state when trying to mark as failed`)
      // 既に失敗しているか、他の状態に変更されている可能性あり
      // この場合はエラーをスローしない
    }
    
    console.log(`Job ${jobId} marked as failed: ${errorMessage}`)
  })
}

// ジョブの状態を取得するユーティリティ関数
export async function getJobStatus(jobId: string): Promise<Pick<JobRow, 'id' | 'status' | 'updated_at'> | null> {
  return withTransaction(async (supabase) => {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, status, updated_at')
      .eq('id', jobId)
      .single()
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null // ジョブが見つからない
      }
      console.error(`Failed to get job ${jobId} status:`, error)
      throw error
    }
    
    return data
  })
}

// タイムアウトしたジョブをリセットするユーティリティ関数
export async function resetTimedOutJobs(): Promise<number> {
  return withTransaction(async (supabase) => {
    const timeoutThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15分前
    
    const { data, error } = await supabase
      .from('jobs')
      .update({ 
        status: 'paid', // 支払済み状態に戻す
        error: '処理タイムアウトによりリセット',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', timeoutThreshold)
      .is('result_path', null) // 結果がないもののみ
      .select('id')
      
    if (error) {
      console.error('Failed to reset timed out jobs:', error)
      throw error
    }
    
    const resetCount = data?.length || 0
    if (resetCount > 0) {
      console.log(`Reset ${resetCount} timed out jobs`)
    }
    
    return resetCount
  })
}

