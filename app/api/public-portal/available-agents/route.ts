import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Get available agents for public display (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // Get agents who are available for public chat
      // This query gets users with 'ready' or 'work_mode' status and are online
      db.all(
        `SELECT DISTINCT
          u.id,
          u.display_name,
          u.profile_picture,
          u.role,
          swm.work_mode,
          up.status as presence_status,
          up.last_activity
        FROM users u
        INNER JOIN staff_work_modes swm ON u.username = swm.username
        LEFT JOIN user_presence up ON u.username = up.username
        WHERE swm.work_mode IN ('ready', 'work_mode')
          AND up.status IN ('online', 'away')
          AND u.active = 1
          AND swm.active = 1
          AND (up.last_activity IS NULL OR datetime('now') < datetime(up.last_activity, '+30 minutes'))
        ORDER BY 
          CASE 
            WHEN swm.work_mode = 'ready' THEN 1
            WHEN swm.work_mode = 'work_mode' THEN 2
            ELSE 3
          END,
          up.last_activity DESC
        LIMIT 6`,
        (err, rows) => {
          db.close();
          
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Database error',
              agents: [],
              totalAvailable: 0 
            }, { status: 500 }));
            return;
          }

          // Transform the data for public display
          const availableAgents = (rows || []).map((agent: any) => ({
            id: agent.id,
            displayName: agent.display_name || 'Support Agent',
            // Only show profile picture if it exists, otherwise use initials
            profilePicture: agent.profile_picture || null,
            // Generate color for initials based on agent ID
            avatarColor: generateAvatarColor(agent.id),
            // Show initials from display name
            initials: getInitials(agent.display_name || 'Support Agent'),
            // Show role for display (Agent, Manager, etc.)
            role: agent.role || 'agent',
            // Work mode determines availability level
            availabilityLevel: agent.work_mode === 'ready' ? 'high' : 'medium',
            // Presence status
            status: agent.presence_status || 'online',
            // Don't expose username for privacy
            isOnline: ['online', 'away'].includes(agent.presence_status)
          }));

          resolve(NextResponse.json({
            success: true,
            agents: availableAgents,
            totalAvailable: availableAgents.length,
            hasAvailableAgents: availableAgents.length > 0,
            // Anonymous mode until chat is started
            anonymousMode: true,
            generatedAt: new Date().toISOString()
          }));
        }
      );
    });
  } catch (error) {
    console.error('Available agents fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      agents: [],
      totalAvailable: 0 
    }, { status: 500 });
  }
}

// Generate consistent color for agent avatars based on ID
function generateAvatarColor(agentId: number): string {
  const colors = [
    '#1976d2', // Blue
    '#388e3c', // Green
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#d32f2f', // Red
    '#455a64', // Blue Grey
    '#00796b', // Teal
    '#f9a825', // Amber
    '#5d4037', // Brown
    '#e91e63', // Pink
  ];
  
  return colors[agentId % colors.length];
}

// Extract initials from display name
function getInitials(displayName: string): string {
  const nameParts = displayName.trim().split(' ');
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  } else if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  return 'SA'; // Support Agent fallback
}