import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { runAsync, getAsync } from '@/lib/database';
import { createContextLogger } from '@/lib/logger';

const logger = createContextLogger('users-api');

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    const currentUser = authResult.user;

    // Users can only update their own profile unless they have admin permissions
    if (currentUser.id !== userId && !currentUser.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { display_name, email, login_preferences } = body;

    logger.info({
      userId,
      display_name,
      email,
      login_preferences,
      requestBody: body,
      event: 'profile_update_request'
    }, 'Profile update request received');

    // Update user profile
    logger.debug({
      query_params: [display_name, email, login_preferences || '{}', userId],
      event: 'database_update'
    }, 'Executing profile UPDATE query');
    
    await runAsync(`
      UPDATE users 
      SET display_name = ?, 
          email = ?,
          login_preferences = ?
      WHERE id = ?
    `, [display_name, email, login_preferences || '{}', userId]);

    logger.info({
      userId,
      event: 'database_update_completed'
    }, 'Profile UPDATE query completed successfully');
    
    // Verify the update by reading back the data
    const updatedUser = await getAsync('SELECT * FROM users WHERE id = ?', [userId]);
    logger.debug({
      userId,
      login_preferences: updatedUser?.login_preferences,
      event: 'database_verification'
    }, 'Profile update verification - login_preferences in database');

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully' 
    });

  } catch (error) {
    const resolvedParams = await params;
    logger.error({
      userId: resolvedParams.id,
      error,
      event: 'profile_update_error'
    }, 'Error updating user profile');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}