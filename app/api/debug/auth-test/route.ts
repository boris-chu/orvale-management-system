import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/debug/auth-test - Test authentication and presence systems
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Starting auth and presence test...')
    
    // Check different auth methods
    const authResults = {
      bearerAuth: null,
      cookieAuth: null,
      presence: null,
      tokens: {
        authHeader: request.headers.get('authorization'),
        cookies: request.headers.get('cookie')
      }
    }

    // Test 1: Bearer token auth
    try {
      const authResult = await verifyAuth(request)
      authResults.bearerAuth = {
        success: authResult.success,
        user: authResult.user ? {
          username: authResult.user.username,
          display_name: authResult.user.display_name,
          hasPermissions: !!authResult.user.permissions,
          permissionCount: authResult.user.permissions?.length || 0,
          hasChatPermission: authResult.user.permissions?.includes('chat.access_channels')
        } : null
      }
    } catch (error) {
      authResults.bearerAuth = { error: error.message }
    }

    // Test 2: Check presence data if user is authenticated
    if (authResults.bearerAuth?.success && authResults.bearerAuth?.user) {
      try {
        const presenceData = await queryAsync(`
          SELECT user_id, status, last_active,
                 CASE 
                   WHEN last_active > datetime('now', '-2 minutes') THEN 'ACTIVE'
                   ELSE 'STALE'
                 END as activity_status
          FROM user_presence 
          ORDER BY last_active DESC
        `)
        
        authResults.presence = {
          totalUsers: presenceData.length,
          currentUser: presenceData.find(p => p.user_id === authResults.bearerAuth.user.username),
          onlineUsers: presenceData.filter(p => p.status === 'online' && p.activity_status === 'ACTIVE'),
          allUsers: presenceData
        }
      } catch (error) {
        authResults.presence = { error: error.message }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: authResults,
      recommendations: {
        authWorking: !!authResults.bearerAuth?.success,
        presenceWorking: !!authResults.presence?.currentUser,
        chatPermission: !!authResults.bearerAuth?.user?.hasChatPermission,
        nextSteps: authResults.bearerAuth?.success 
          ? (authResults.presence?.currentUser 
              ? "✅ Everything looks good! Check frontend token storage."
              : "⚠️ Auth works but no presence data. Check SystemPresenceTracker.")
          : "❌ Authentication failed. Check token storage and format."
      }
    })

  } catch (error) {
    console.error('❌ Debug test error:', error)
    return NextResponse.json({ 
      error: 'Debug test failed', 
      details: error.message 
    }, { status: 500 })
  }
}