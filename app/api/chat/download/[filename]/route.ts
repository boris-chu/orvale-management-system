import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { verifyAuth } from '@/lib/auth'

// GET /api/chat/download/[filename] - Download uploaded chat files
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const params = await context.params
    const { filename } = params

    // Basic security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = join(process.cwd(), 'uploads', 'chat', filename)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // Extract original filename from the safe filename format: timestamp_uuid_originalname
      const parts = filename.split('_')
      const originalName = parts.length >= 3 ? parts.slice(2).join('_') : filename

      // Determine content type based on file extension
      const extension = filename.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'
      
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'zip': 'application/zip'
      }
      
      if (extension && mimeTypes[extension]) {
        contentType = mimeTypes[extension]
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${originalName}"`,
          'Content-Length': fileBuffer.length.toString()
        }
      })

    } catch (fileError) {
      console.error('❌ Download file not found:', filePath)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('❌ Error downloading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}