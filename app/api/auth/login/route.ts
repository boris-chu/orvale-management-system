import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken, getUserPermissions, getAccessibleQueues } from '@/lib/auth';
import { initDB } from '@/lib/database';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
    try {
        // Initialize database if not already done
        if (!dbInitialized) {
            await initDB();
            dbInitialized = true;
        }

        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({
                error: 'Validation error',
                message: 'Username and password are required'
            }, { status: 400 });
        }

        const user = await authenticateUser(username, password);
        if (!user) {
            return NextResponse.json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            }, { status: 401 });
        }

        const token = generateToken(user);
        const permissions = await getUserPermissions(user);
        const accessibleQueues = await getAccessibleQueues(user);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                role: user.role,
                team_id: user.team_id,
                section_id: user.section_id,
                permissions,
                accessible_queues: accessibleQueues,
                can_switch_queues: accessibleQueues.length > 1,
                home_queue: user.team_id,
                login_preferences: user.login_preferences,
                profile_picture: user.profile_picture
            },
            token
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'An error occurred during login'
        }, { status: 500 });
    }
}