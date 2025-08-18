const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDB } = require('./database');
const { 
    authenticateUser, 
    generateToken, 
    authenticateToken, 
    getUserPermissions,
    getAccessibleQueues 
} = require('./auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline styles/scripts for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3000'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Initialize database
initDB();

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Username and password are required'
            });
        }

        const user = await authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        const token = generateToken(user);
        const permissions = getUserPermissions(user);
        const accessibleQueues = await getAccessibleQueues(user);

        res.json({
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
                home_queue: user.team_id
            },
            token
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during login'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
app.post('/api/auth/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Logged out successfully' 
    });
});

/**
 * GET /api/auth/user
 * Get current user information
 */
app.get('/api/auth/user', authenticateToken, async (req, res) => {
    try {
        const permissions = getUserPermissions(req.user);
        const accessibleQueues = await getAccessibleQueues(req.user);

        res.json({
            success: true,
            user: {
                ...req.user,
                permissions,
                accessible_queues: accessibleQueues,
                can_switch_queues: accessibleQueues.length > 1,
                home_queue: req.user.team_id
            }
        });
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error retrieving user information'
        });
    }
});

// ==========================================
// TICKET ROUTES
// ==========================================

// Import ticket routes
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

// ==========================================
// SYSTEM ROUTES
// ==========================================

/**
 * GET /api/system-info
 * Get system information for ticket forms
 */
app.get('/api/system-info', (req, res) => {
    const systemInfo = {
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        referer: req.headers['referer'] || 'Direct'
    };

    res.json({
        success: true,
        system_info: systemInfo
    });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Orvale Management System API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        available_routes: [
            'POST /api/auth/login',
            'POST /api/auth/logout', 
            'GET /api/auth/user',
            'GET /api/tickets',
            'POST /api/tickets',
            'GET /api/system-info',
            'GET /api/health'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// ==========================================
// SERVER STARTUP
// ==========================================

app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('   ORVALE MANAGEMENT SYSTEM API');
    console.log('🚀 ===================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    console.log('\n📋 Available Endpoints:');
    console.log('   🔐 POST /api/auth/login');
    console.log('   🚪 POST /api/auth/logout');
    console.log('   👤 GET  /api/auth/user');
    console.log('   🎫 GET  /api/tickets');
    console.log('   ➕ POST /api/tickets');
    console.log('   💻 GET  /api/system-info');
    console.log('   ❤️  GET  /api/health');
    console.log('\n🔑 Test Login Credentials:');
    console.log('   👑 admin / admin123');
    console.log('   👤 boris.chu / boris123');
    console.log('   👤 john.doe / john123');
    console.log('=====================================\n');
});

module.exports = app;