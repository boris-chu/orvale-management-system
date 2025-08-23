import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

// GET /api/test/auth - Test authentication
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing authentication...')
    
    const authHeader = request.headers.get('authorization')
    console.log('📋 Auth header present:', !!authHeader)
    console.log('📋 Auth header preview:', authHeader?.substring(0, 30) + '...')
    
    const authResult = await verifyAuth(request)
    console.log('✅ Auth result:', {
      success: authResult.success,
      hasUser: !!authResult.user,
      username: authResult.user?.username,
      hasPermissions: !!authResult.user?.permissions,
      permissionCount: authResult.user?.permissions?.length,
      chatAccess: authResult.user?.permissions?.includes('chat.access_channels')
    })
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: 'No valid user found'
      }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: 'Missing chat.access_channels permission'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      user: {
        username: authResult.user.username,
        display_name: authResult.user.display_name,
        role: authResult.user.role,
        permissions: authResult.user.permissions?.length || 0,
        chat_access: true
      }
    })

  } catch (error) {
    console.error('❌ Auth test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}