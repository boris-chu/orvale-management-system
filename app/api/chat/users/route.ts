import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = authResult.user.username;
    const currentUserTeamId = authResult.user.team_id;

    // Get all users with their presence status
    // For now, show:
    // 1. All team members
    // 2. All users who have sent/received messages from current user
    // 3. All admin users
    const users = await queryAsync(`
      SELECT DISTINCT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.role as role_id,
        u.team_id,
        u.section_id,
        u.profile_picture,
        p.status as presence_status,
        p.last_active,
        p.status_message,
        CASE 
          WHEN u.team_id = ? THEN 1 
          WHEN u.role = 'admin' THEN 2
          ELSE 3 
        END as priority
      FROM users u
      LEFT JOIN user_presence p ON u.username = p.user_id
      WHERE u.active = TRUE 
        AND u.username != ?
        AND (
          -- Same team members
          u.team_id = ?
          -- Admin users
          OR u.role = 'admin'
          -- Users with existing chat history
          OR EXISTS (
            SELECT 1 FROM chat_messages cm
            JOIN chat_channel_members ccm1 ON cm.channel_id = ccm1.channel_id
            JOIN chat_channel_members ccm2 ON cm.channel_id = ccm2.channel_id
            WHERE (ccm1.user_id = ? AND ccm2.user_id = u.username)
               OR (ccm2.user_id = ? AND ccm1.user_id = u.username)
          )
        )
      ORDER BY 
        priority ASC,
        CASE 
          WHEN p.status IN ('online', 'busy', 'idle', 'in_call', 'in_meeting', 'presenting') THEN 0 
          WHEN p.status = 'away' THEN 1
          ELSE 2 
        END ASC,
        u.display_name ASC
    `, [currentUserTeamId, currentUserId, currentUserTeamId, currentUserId, currentUserId]);

    // Group users by online status
    const onlineStatuses = ['online', 'busy', 'idle', 'in_call', 'in_meeting', 'presenting'];
    const awayStatuses = ['away'];
    
    const onlineUsers = users.filter((user: any) => 
      onlineStatuses.includes(user.presence_status || 'offline')
    );
    
    const awayUsers = users.filter((user: any) => 
      awayStatuses.includes(user.presence_status || 'offline')
    );
    
    const offlineUsers = users.filter((user: any) => 
      !onlineStatuses.includes(user.presence_status || 'offline') && 
      !awayStatuses.includes(user.presence_status || 'offline')
    );

    // Get team names
    const teams = await queryAsync(`
      SELECT id, name FROM teams WHERE active = TRUE
    `);
    
    const teamMap = teams.reduce((acc: any, team: any) => {
      acc[team.id] = team.name;
      return acc;
    }, {});

    // Format users with additional info
    const formatUser = (user: any) => ({
      ...user,
      team_name: teamMap[user.team_id] || user.team_id,
      is_team_member: user.team_id === currentUserTeamId,
      is_admin: user.role_id === 'admin',
      presence: {
        status: user.presence_status || 'offline',
        last_active: user.last_active,
        status_message: user.status_message
      }
    });

    return NextResponse.json({
      success: true,
      users: {
        online: onlineUsers.map(formatUser),
        away: awayUsers.map(formatUser),
        offline: offlineUsers.map(formatUser)
      },
      current_team: {
        id: currentUserTeamId,
        name: teamMap[currentUserTeamId] || currentUserTeamId
      },
      total_count: users.length
    });

  } catch (error) {
    console.error('Error fetching chat users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}