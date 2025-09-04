// app/api/v1/upload/reference/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../_lib/auth'
import { ApiError, errorResponse } from '../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/upload/reference - 参照曲アップロード（Creator専用）
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const formData = await request.formData()
    const file = formData.get('reference') as File

    if (!file) {
      throw new ApiError(400, 'Reference file is required')
    }

    console.log(`📤 Uploading reference file for user ${userId}`)

    // プラン確認（Creator専用）
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const planCode = subscription?.plan_code
    if (planCode !== 'creator') {
      throw new ApiError(403, 'Reference upload requires Creator plan')
    }

    // ファイル検証
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      throw new ApiError(413, 'File too large (max 20MB)')
    }

    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg']
    const allowedExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a']
    
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!isValidType) {
      throw new ApiError(400, 'Invalid file type. Supported: WAV, MP3, FLAC, OGG, M4A')
    }

    // ファイル名生成
    const uploadId = crypto.randomUUID()
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'wav'
    const fileName = `${uploadId}.${fileExtension}`
    const storagePath = `references/${userId}/${fileName}`

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('uta-uploads')
      .upload(storagePath, file, {
        contentType: file.type || 'audio/wav',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new ApiError(500, 'Failed to upload reference file')
    }

    console.log(`✅ Reference uploaded: ${storagePath}`)

    return Response.json({
      success: true,
      uploadId,
      fileName,
      fileSize: file.size,
      contentType: file.type,
      storagePath,
      meta: {
        user_id: userId,
        plan_code: planCode,
        upload_id: uploadId
      }
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'reference_upload_error', 
      message: '参照曲のアップロードに失敗しました', 
      details: error 
    })
  }
}

// DELETE /v1/upload/reference - 参照曲削除
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      throw new ApiError(400, 'uploadId is required')
    }

    console.log(`🗑️ Deleting reference file ${uploadId} for user ${userId}`)

    // ファイルパスを構築
    const storagePath = `references/${userId}/${uploadId}`

    // Supabase Storageから削除
    const { error: deleteError } = await supabase.storage
      .from('uta-uploads')
      .remove([storagePath])

    if (deleteError) {
      console.error('Storage delete error:', deleteError)
      throw new ApiError(500, 'Failed to delete reference file')
    }

    // 関連する参照解析データも削除
    await supabase
      .from('mix_refs')
      .delete()
      .eq('upload_id', uploadId)

    console.log(`✅ Reference deleted: ${uploadId}`)

    return Response.json({
      success: true,
      deleted_upload_id: uploadId,
      meta: {
        user_id: userId,
        upload_id: uploadId
      }
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'reference_delete_error', 
      message: '参照曲の削除に失敗しました', 
      details: error 
    })
  }
}