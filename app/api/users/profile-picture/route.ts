import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { runAsync, getAsync } from '@/lib/database';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if user can edit this profile (own profile or admin permissions)
    const canEdit = authResult.user.id === parseInt(userId) || 
                   authResult.user.permissions?.includes('admin.manage_users');

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Create profile pictures directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'profile-pictures');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name) || '.jpg';
    const filename = `user-${userId}-${timestamp}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert file to buffer and resize/optimize with sharp
    const buffer = Buffer.from(await file.arrayBuffer());
    
    await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(filepath);

    // Remove old profile picture if it exists
    const user = await getAsync('SELECT profile_picture FROM users WHERE id = ?', [userId]);
    if (user?.profile_picture) {
      const oldFilePath = path.join(uploadsDir, path.basename(user.profile_picture));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update user's profile picture in database
    const profilePictureUrl = `/profile-pictures/${filename}`;
    await runAsync(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePictureUrl, userId]
    );

    console.log(`📸 Profile picture updated for user ${userId} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      profilePictureUrl
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check if user can edit this profile (own profile or admin permissions)
    const canEdit = authResult.user.id === parseInt(userId) || 
                   authResult.user.permissions?.includes('admin.manage_users');

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get current profile picture
    const user = await getAsync('SELECT profile_picture FROM users WHERE id = ?', [userId]);
    
    if (user?.profile_picture) {
      // Remove file from filesystem
      const uploadsDir = path.join(process.cwd(), 'public', 'profile-pictures');
      const filePath = path.join(uploadsDir, path.basename(user.profile_picture));
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update database
      await runAsync(
        'UPDATE users SET profile_picture = NULL WHERE id = ?',
        [userId]
      );

      console.log(`🗑️ Profile picture removed for user ${userId} by ${authResult.user.username}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing profile picture:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}