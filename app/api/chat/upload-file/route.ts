import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

// POST /api/chat/upload-file - Upload files for chat messages
export async function POST(request: NextRequest) {
  try {
    console.log('📎 Chat file upload request received')
    
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('❌ File upload: Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      console.log('❌ File upload: Insufficient permissions')
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const originalName = formData.get('originalName') as string
    const fileType = formData.get('fileType') as string
    const fileSize = parseInt(formData.get('fileSize') as string || '0')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileSize > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/mov',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed'
    ]

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 })
    }

    console.log('📎 Processing file upload:', {
      originalName,
      fileType,
      fileSize,
      user: authResult.user.username
    })

    // Generate unique filename
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || ''
    const uniqueId = uuidv4()
    const timestamp = Date.now()
    const safeFileName = `${timestamp}_${uniqueId}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', 'chat')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      console.log('📁 Upload directory already exists or created')
    }

    // Save file to disk
    const filePath = join(uploadsDir, safeFileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)
    console.log('✅ File saved:', filePath)

    // Generate URLs for accessing the file
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost'
    const fileUrl = `${baseUrl}/api/chat/files/${safeFileName}`
    const downloadUrl = `${baseUrl}/api/chat/download/${safeFileName}`

    const responseData = {
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: uniqueId,
        originalName,
        fileName: safeFileName,
        fileType,
        fileSize,
        uploadedAt: new Date().toISOString(),
        uploadedBy: authResult.user.username
      },
      url: fileUrl,
      downloadUrl,
      thumbnail: fileType.startsWith('image/') ? fileUrl : undefined
    }

    console.log('✅ File upload complete:', responseData.file)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ Error uploading file:', error)
    return NextResponse.json({ 
      error: 'File upload failed', 
      details: error.message 
    }, { status: 500 })
  }
}