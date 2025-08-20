import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getAsync, queryAsync } from './database';
import { authLogger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'orvale-management-system-secret-key-2025';
const JWT_EXPIRES_IN = '24h';

export interface User {
    id: number;
    username: string;
    display_name: string;
    email: string;
    role: string;
    team_id: string;
    section_id: string;
    active: boolean;
    profile_picture?: string;
    login_preferences?: string;
}

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
    try {
        const user = await getAsync(
            'SELECT * FROM users WHERE username = ? AND active = TRUE',
            [username]
        );

        if (!user) {
            authLogger.login(username, undefined, false);
            return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            authLogger.login(username, undefined, false);
            return null;
        }

        authLogger.login(username, undefined, true);
        return {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            role: user.role,
            team_id: user.team_id,
            section_id: user.section_id,
            active: user.active,
            profile_picture: user.profile_picture,
            login_preferences: user.login_preferences
        };
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return null;
    }
};

export const generateToken = (user: User): string => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            team_id: user.team_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export const getUserPermissions = async (user: User): Promise<string[]> => {
    try {
        // Get permissions from the database
        const permissions = await queryAsync(
            `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
            [user.role]
        );
        
        return permissions.map((p: any) => p.permission_id);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        
        // Fallback to hardcoded permissions if database fails
        const permissions: string[] = [];
        
        // Base permissions for all IT users
        if (user.role === 'it_user' || user.role === 'manager' || user.role === 'admin') {
            permissions.push(
                'ticket.view_own',
                'ticket.update_own', 
                'ticket.comment_own',
                'queue.view_own_team',
                'system.view_basic_info'
            );
        }
        
        // Manager permissions
        if (user.role === 'manager' || user.role === 'admin') {
            permissions.push(
                'ticket.view_team',
                'ticket.assign_within_team',
                'ticket.escalate',
                'queue.view_team',
                'reporting.view_team_metrics'
            );
        }
        
        // Helpdesk Supervisor permissions
        if (user.role === 'helpdesk_supervisor') {
            permissions.push(
                'ticket.view_all',
                'ticket.view_team',
                'ticket.view_own',
                'ticket.update_own',
                'ticket.comment_own',
                'ticket.assign_own',
                'ticket.assign_within_team',
                'ticket.assign_cross_team',
                'ticket.reassign_any_team',
                'ticket.escalate',
                'ticket.manage_escalated',
                'ticket.override_assignment',
                'queue.view_all',
                'queue.view_team',
                'queue.view_own_team',
                'queue.view_escalated',
                'queue.access_helpdesk',
                'system.view_basic_info',
                'reporting.view_all',
                'reporting.view_team_metrics'
            );
        }
        
        // Helpdesk Team Member permissions
        if (user.role === 'helpdesk_member') {
            permissions.push(
                'ticket.view_own',
                'ticket.update_own',
                'ticket.comment_own',
                'ticket.assign_own',
                'ticket.assign_cross_team',
                'ticket.escalate',
                'ticket.manage_escalated',
                'queue.view_own_team',
                'queue.view_escalated',
                'queue.access_helpdesk',
                'system.view_basic_info'
            );
        }
        
        // Admin permissions
        if (user.role === 'admin') {
            permissions.push(
                'ticket.view_all',
                'ticket.assign_any',
                'ticket.assign_cross_team',
                'ticket.reassign_any_team',
                'ticket.manage_escalated',
                'ticket.override_assignment',
                'ticket.delete',
                'user.view_all',
                'user.create',
                'user.update',
                'user.deactivate',
                'queue.view_all',
                'queue.view_escalated',
                'queue.access_helpdesk',
                'queue.manage',
                'system.manage_settings',
                'reporting.view_all',
                // New admin dashboard permissions
                'admin.manage_users',
                'admin.view_users',
                'admin.manage_teams',
                'admin.view_teams',
                'admin.manage_organization',
                'admin.view_organization',
                'admin.manage_categories',
                'admin.view_categories',
                'admin.view_analytics',
                'admin.system_settings',
                // Portal settings permissions
                'portal.manage_settings',
                'portal.view_settings',
                // Data management permissions
                'portal.export_data',
                'admin.manage_data',
                // Template management permissions
                'portal.manage_templates',
                'portal.view_templates',
                // Portal-specific management permissions
                'portal.manage_teams',
                'portal.view_teams',
                'portal.manage_categories',
                'portal.view_categories',
                // Role management permissions
                'admin.manage_roles',
                'admin.view_roles',
                // SLA management permissions
                'admin.manage_sla',
                'admin.view_sla'
            );
        }
        
        return permissions;
    }
};

export const verifyAuth = async (request: any): Promise<{success: boolean; user?: any; error?: string}> => {
    try {
        const authHeader = request.headers.get('authorization');
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            console.log('🔍 Token found in Authorization header');
        } else {
            // Try to get token from cookies
            const cookies = request.headers.get('cookie');
            if (cookies) {
                const tokenMatch = cookies.match(/auth-token=([^;]+)/);
                if (tokenMatch) {
                    token = tokenMatch[1];
                    console.log('🔍 Token found in cookies');
                }
            }
        }

        if (!token) {
            console.log('❌ No token provided in request');
            return { success: false, error: 'No token provided' };
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            console.log('❌ Token verification failed');
            return { success: false, error: 'Invalid token' };
        }

        console.log('✅ Token verified for user ID:', decoded.id);

        // Get fresh user data with permissions
        const user = await getAsync(
            'SELECT * FROM users WHERE id = ? AND active = TRUE',
            [decoded.id]
        );

        if (!user) {
            console.log('❌ User not found in database for ID:', decoded.id);
            return { success: false, error: 'User not found' };
        }

        console.log('✅ User found in database:', user.username);
        console.log('🔧 Raw user.login_preferences from database:', user.login_preferences);

        // Add permissions to user object
        const permissions = await getUserPermissions(user);
        const userWithPermissions = {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            role: user.role,
            role_id: user.role, // Alias for compatibility
            team_id: user.team_id,
            section_id: user.section_id,
            active: user.active,
            profile_picture: user.profile_picture,
            login_preferences: user.login_preferences,
            permissions: permissions
        };

        console.log('✅ User with permissions created, permission count:', userWithPermissions.permissions.length);
        console.log('🔧 Final user object login_preferences:', userWithPermissions.login_preferences);

        return { success: true, user: userWithPermissions };
    } catch (error) {
        console.error('❌ Auth verification error:', error);
        return { success: false, error: 'Authentication failed' };
    }
};

export const getAccessibleQueues = async (user: User): Promise<any[]> => {
    try {
        const permissions = await getUserPermissions(user);
        let queues: any[] = [];
        
        if (permissions.includes('queue.view_all')) {
            // Admin can see all queues
            queues = await queryAsync(`
                SELECT t.id, t.name, t.description, t.email, t.section_id, s.name as section_name,
                       CASE WHEN t.id = ? THEN 1 ELSE 0 END as is_home
                FROM teams t
                LEFT JOIN sections s ON t.section_id = s.id
                ORDER BY t.name
            `, [user.team_id]);
        } else if (permissions.includes('queue.view_team')) {
            // Manager can see section queues
            queues = await queryAsync(`
                SELECT t.id, t.name, t.description, t.email, t.section_id, s.name as section_name,
                       CASE WHEN t.id = ? THEN 1 ELSE 0 END as is_home
                FROM teams t
                LEFT JOIN sections s ON t.section_id = s.id
                WHERE t.section_id = ?
                ORDER BY t.name
            `, [user.team_id, user.section_id]);
        } else if (permissions.includes('queue.view_own_team')) {
            // Regular IT user can only see own team
            queues = [{
                id: user.team_id,
                name: user.team_id,
                description: 'My Team Queue',
                email: 'team@orvale.gov',
                section_id: user.section_id,
                section_name: user.section_id,
                is_home: 1
            }];
        }

        return queues;
    } catch (error) {
        console.error('❌ Error getting accessible queues:', error);
        return [];
    }
};