import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { runAsync } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.id);
    const currentUser = authResult.user;

    // Users can only update their own profile unless they have admin permissions
    if (currentUser.id !== userId && !currentUser.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { display_name, email, login_preferences } = body;

    // Update user profile
    await runAsync(`
      UPDATE users 
      SET display_name = ?, 
          email = ?,
          login_preferences = ?
      WHERE id = ?
    `, [display_name, email, login_preferences || '{}', userId]);

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully' 
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}