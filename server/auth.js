const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getAsync, queryAsync } = require('./database');

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'orvale-management-system-secret-key-2025';
const JWT_EXPIRES_IN = '24h';

/**
 * Authenticate user credentials
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object|null>} User object or null if invalid
 */
const authenticateUser = async (username, password) => {
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

        // Remove password hash from user object
        delete user.password_hash;
        
        console.log(`✅ Authentication successful: ${user.display_name} (${user.role})`);
        return user;
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return null;
    }
};

/**
 * Generate JWT token for authenticated user
 * @param {Object} user 
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        section_id: user.section_id
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token and extract user information
 * @param {string} token 
 * @returns {Promise<Object|null>} User object or null if invalid
 */
const verifyToken = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Optionally verify user still exists and is active
        const user = await getAsync(
            'SELECT id, username, display_name, email, role, team_id, section_id FROM users WHERE id = ? AND active = TRUE',
            [decoded.id]
        );

        if (!user) {
            console.log(`❌ Token verification failed: User ${decoded.username} not found or inactive`);
            return null;
        }

        return user;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.log('❌ Token verification failed: Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            console.log('❌ Token verification failed: Invalid token');
        } else {
            console.error('❌ Token verification error:', error);
        }
        return null;
    }
};

/**
 * Express middleware to authenticate requests
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied', 
            message: 'No token provided' 
        });
    }

    const user = await verifyToken(token);
    if (!user) {
        return res.status(403).json({ 
            error: 'Access denied', 
            message: 'Invalid or expired token' 
        });
    }

    req.user = user;
    next();
};

/**
 * Express middleware to check if user has admin role
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Access denied', 
            message: 'Admin privileges required' 
        });
    }
    next();
};

/**
 * Express middleware to check if user can access IT functions
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
const requireITAccess = (req, res, next) => {
    if (!['admin', 'it_user', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ 
            error: 'Access denied', 
            message: 'IT access privileges required' 
        });
    }
    next();
};

/**
 * Get user permissions based on role and context
 * @param {Object} user 
 * @returns {Array<string>} List of permissions
 */
const getUserPermissions = (user) => {
    const permissions = [];

    // Base permissions for all users
    permissions.push('user.submit_ticket');

    switch (user.role) {
        case 'admin':
            permissions.push(
                'ticket.view', 'ticket.edit', 'ticket.complete', 'ticket.delete',
                'ticket.assign_within_team', 'ticket.assign_within_section', 'ticket.assign_cross_section',
                'queue.view_own_team', 'queue.view_section_teams', 'queue.view_all_sections',
                'queue.switch_within_section', 'queue.switch_all_sections',
                'ticket.escalate_to_helpdesk', 'ticket.escalate_emergency',
                'helpdesk.resolve_escalated', 'helpdesk.route_back_to_teams',
                'admin.manage_team_assignments', 'admin.view_all_queues', 'admin.user_management'
            );
            break;

        case 'it_user':
            permissions.push(
                'ticket.view', 'ticket.edit', 'ticket.complete',
                'ticket.assign_within_team', 'queue.view_own_team',
                'ticket.escalate_to_helpdesk'
            );
            break;

        case 'manager':
            permissions.push(
                'ticket.view', 'ticket.edit', 'ticket.complete',
                'ticket.assign_within_team', 'ticket.assign_within_section',
                'queue.view_own_team', 'queue.view_section_teams',
                'queue.switch_within_section', 'ticket.escalate_to_helpdesk',
                'user.submit_on_behalf'
            );
            break;

        default:
            // Regular users only get submission permissions
            break;
    }

    return permissions;
};

/**
 * Get accessible queues for user based on permissions
 * @param {Object} user 
 * @returns {Promise<Array>} List of accessible queues
 */
const getAccessibleQueues = async (user) => {
    const permissions = getUserPermissions(user);
    let queues = [];

    try {
        if (permissions.includes('queue.view_all_sections')) {
            // Admin can see all teams
            queues = await queryAsync(`
                SELECT t.id, t.name, t.description, t.section_id, s.name as section_name,
                       CASE WHEN t.id = ? THEN 1 ELSE 0 END as is_home
                FROM teams t
                LEFT JOIN sections s ON t.section_id = s.id
                ORDER BY s.name, t.name
            `, [user.team_id]);
        } else if (permissions.includes('queue.view_section_teams')) {
            // Manager can see teams in same section
            queues = await queryAsync(`
                SELECT t.id, t.name, t.description, t.section_id, s.name as section_name,
                       CASE WHEN t.id = ? THEN 1 ELSE 0 END as is_home
                FROM teams t
                LEFT JOIN sections s ON t.section_id = s.id
                WHERE t.section_id = ?
                ORDER BY t.name
            `, [user.team_id, user.section_id]);
        } else if (permissions.includes('queue.view_own_team')) {
            // Regular IT user can only see own team
            queues = await queryAsync(`
                SELECT t.id, t.name, t.description, t.section_id, s.name as section_name,
                       1 as is_home
                FROM teams t
                LEFT JOIN sections s ON t.section_id = s.id
                WHERE t.id = ?
            `, [user.team_id]);
        }

        return queues;
    } catch (error) {
        console.error('❌ Error getting accessible queues:', error);
        return [];
    }
};

module.exports = {
    authenticateUser,
    generateToken,
    verifyToken,
    authenticateToken,
    requireAdmin,
    requireITAccess,
    getUserPermissions,
    getAccessibleQueues
};