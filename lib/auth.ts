import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getAsync, queryAsync } from './database';

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
}

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
    try {
        const user = await getAsync(
            'SELECT * FROM users WHERE username = ? AND active = TRUE',
            [username]
        );

        if (!user) {
            console.log(`❌ Authentication failed: User '${username}' not found`);
            return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            console.log(`❌ Authentication failed: Invalid password for '${username}'`);
            return null;
        }

        console.log(`✅ Authentication successful: ${user.display_name} (${user.role})`);
        return {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            role: user.role,
            team_id: user.team_id,
            section_id: user.section_id,
            active: user.active
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

export const getUserPermissions = (user: User): string[] => {
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
    
    // Admin permissions
    if (user.role === 'admin') {
        permissions.push(
            'ticket.view_all',
            'ticket.assign_any',
            'ticket.delete',
            'user.view_all',
            'user.create',
            'user.update',
            'user.deactivate',
            'queue.view_all',
            'queue.manage',
            'system.manage_settings',
            'reporting.view_all'
        );
    }
    
    return permissions;
};

export const getAccessibleQueues = async (user: User): Promise<any[]> => {
    try {
        const permissions = getUserPermissions(user);
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