import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has chat admin permissions
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings');
    
    if (!hasChatAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    try {
      // Test the Giphy API with a simple search request
      const testResponse = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=test&limit=1&rating=g`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!testResponse.ok) {
        throw new Error(`Giphy API returned status: ${testResponse.status}`);
      }

      const testData = await testResponse.json();
      
      // Check if the response has the expected structure
      if (!testData.data || !Array.isArray(testData.data)) {
        throw new Error('Invalid API response structure');
      }

      // Get quota information from headers (if available)
      const rateLimitRemaining = testResponse.headers.get('X-RateLimit-Remaining');
      const rateLimitLimit = testResponse.headers.get('X-RateLimit-Limit');

      return NextResponse.json({
        success: true,
        message: 'Giphy API key is valid and working',
        apiInfo: {
          status: 'active',
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
          rateLimitLimit: rateLimitLimit ? parseInt(rateLimitLimit) : null,
          testResultCount: testData.data.length
        }
      });

    } catch (apiError: any) {
      console.error('❌ Giphy API test failed:', apiError);
      
      return NextResponse.json({
        success: false,
        error: 'Giphy API test failed',
        details: apiError.message,
        suggestions: [
          'Check that the API key is correct',
          'Verify the API key has not expired',
          'Ensure the API key has the correct permissions',
          'Check if rate limits have been exceeded'
        ]
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error testing Giphy API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}