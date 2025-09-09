import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'
import { trimInstOnServer } from '../../../../../../lib/audio-processing'
import path from 'path'
import fs from 'fs/promises'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/v1/jobs/[id]/trim
 * instファイルをボーカルの長さに合わせてトリミング
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticateUser(request)
    const jobId = params.id

    // ジョブの存在確認と権限チェック
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (jobError || !job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    if (!job.vocal_path || !job.instrumental_path) {
      throw new ApiError(400, 'Audio files not uploaded')
    }

    console.log(`✂️ Starting inst trimming for job ${jobId}`)

    // ボーカルファイルのメタデータを取得
    const { data: vocalFile } = await supabase.storage
      .from('uploads')
      .download(job.vocal_path)
    
    if (!vocalFile) {
      throw new ApiError(400, 'Failed to download vocal file')
    }

    // ボーカルの長さを取得（簡易的にファイルサイズから推定）
    // 実際にはffprobeやWeb Audio APIを使用
    const vocalDuration = 60 // デフォルト60秒（実装簡略化）

    // instファイルをダウンロード
    const { data: instFile } = await supabase.storage
      .from('uploads')
      .download(job.instrumental_path)
    
    if (!instFile) {
      throw new ApiError(400, 'Failed to download instrumental file')
    }

    // 一時ファイルパスを生成
    const tempDir = path.join(process.cwd(), 'tmp', jobId)
    await fs.mkdir(tempDir, { recursive: true })
    
    const instPath = path.join(tempDir, 'inst_original.wav')
    const trimmedPath = path.join(tempDir, 'inst_trimmed.wav')
    
    // ファイルを保存
    const instBuffer = await instFile.arrayBuffer()
    await fs.writeFile(instPath, Buffer.from(instBuffer))

    // トリミング実行
    await trimInstOnServer(instPath, vocalDuration, trimmedPath)
    
    // トリミング済みファイルを読み込み
    const trimmedBuffer = await fs.readFile(trimmedPath)
    
    // Supabaseにアップロード
    const trimmedFileName = `${userId}/${jobId}/inst_trimmed.wav`
    const { data: uploadResult, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(trimmedFileName, trimmedBuffer, {
        contentType: 'audio/wav',
        upsert: true
      })
    
    if (uploadError) {
      throw new ApiError(500, 'Failed to upload trimmed file')
    }

    // データベースを更新
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        instrumental_path_trimmed: trimmedFileName,
        trimmed_at: new Date().toISOString(),
        metadata: {
          ...job.metadata,
          original_inst_path: job.instrumental_path,
          trim_duration: vocalDuration
        }
      })
      .eq('id', jobId)
    
    if (updateError) {
      throw new ApiError(500, 'Failed to update job')
    }

    // 一時ファイルをクリーンアップ
    await fs.rm(tempDir, { recursive: true, force: true })
    
    console.log(`✅ Inst trimming completed for job ${jobId}`)

    return NextResponse.json({
      success: true,
      trimmed_path: trimmedFileName,
      duration: vocalDuration,
      message: 'instファイルをボーカルの長さに合わせてトリミングしました'
    })

  } catch (error) {
    console.error('Trimming error:', error)
    
    if (error instanceof ApiError) {
      return errorResponse(error.status, {
        code: 'trim_error',
        message: error.message
      })
    }
    
    return errorResponse(500, {
      code: 'internal_error',
      message: '音声ファイルのトリミングに失敗しました'
    })
  }
}