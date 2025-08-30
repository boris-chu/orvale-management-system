import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { initTicketSequences, updateExistingTickets } from './ticket-numbering';
import { systemLogger } from './logger';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

export const initDB = () => {
    console.log('🔧 Initializing Orvale Management System database...');
    systemLogger.databaseConnected();
    
    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            // Users table with RBAC
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    email TEXT,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'it_user',
                    team_id TEXT,
                    section_id TEXT,
                    active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Roles table
            db.run(`
                CREATE TABLE IF NOT EXISTS roles (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    is_system BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Role permissions table
            db.run(`
                CREATE TABLE IF NOT EXISTS role_permissions (
                    role_id TEXT NOT NULL,
                    permission_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
                )
            `);

            // Helpdesk team preferences table
            db.run(`
                CREATE TABLE IF NOT EXISTS helpdesk_team_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    team_id TEXT NOT NULL,
                    is_visible BOOLEAN DEFAULT TRUE,
                    tab_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, team_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (team_id) REFERENCES teams(id)
                )
            `);

            // Main tickets table
            db.run(`
                CREATE TABLE IF NOT EXISTS user_tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    submission_id TEXT UNIQUE NOT NULL,
                    user_name TEXT NOT NULL,
                    employee_number TEXT NOT NULL,
                    phone_number TEXT,
                    location TEXT,
                    section TEXT,
                    teleworking TEXT,
                    submitted_by TEXT NOT NULL,
                    submitted_by_employee_number TEXT NOT NULL,
                    on_behalf BOOLEAN DEFAULT FALSE,
                    issue_title TEXT NOT NULL,
                    issue_description TEXT NOT NULL,
                    computer_info TEXT,
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'pending',
                    assigned_to TEXT,
                    assigned_team TEXT,
                    email_recipient TEXT,
                    email_recipient_display TEXT,
                    
                    -- Organizational fields
                    office TEXT,
                    bureau TEXT,
                    division TEXT,
                    
                    -- Category fields  
                    category TEXT,
                    request_type TEXT,
                    subcategory TEXT,
                    sub_subcategory TEXT,
                    implementation TEXT,
                    
                    -- Workflow fields
                    completion_notes TEXT,
                    escalation_reason TEXT,
                    escalated_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    completed_by TEXT,
                    
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Add missing columns to existing table (migration)
            const columnsToAdd = [
                'office TEXT',
                'bureau TEXT', 
                'division TEXT',
                'category TEXT',
                'request_type TEXT',
                'subcategory TEXT',
                'sub_subcategory TEXT',
                'implementation TEXT',
                'completion_notes TEXT',
                'escalation_reason TEXT',
                'escalated_at TIMESTAMP',
                'completed_at TIMESTAMP',
                'completed_by TEXT'
            ];

            columnsToAdd.forEach(column => {
                const columnName = column.split(' ')[0];
                db.run(`ALTER TABLE user_tickets ADD COLUMN ${column}`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error(`Error adding column ${columnName}:`, err.message);
                    }
                });
            });

            // Achievement definitions table
            db.run(`
                CREATE TABLE IF NOT EXISTS achievements (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category TEXT NOT NULL CHECK (category IN ('productivity', 'quality', 'collaboration', 'special')),
                    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
                    icon TEXT NOT NULL,
                    xp_reward INTEGER NOT NULL DEFAULT 0,
                    criteria_type TEXT NOT NULL CHECK (criteria_type IN ('ticket_count', 'streak_days', 'template_usage', 'category_diversity', 'time_saved', 'team_collaboration', 'special_event')),
                    criteria_value INTEGER,
                    criteria_data TEXT, -- JSON for complex criteria
                    active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // User achievements table
            db.run(`
                CREATE TABLE IF NOT EXISTS user_achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    achievement_id TEXT NOT NULL,
                    progress INTEGER DEFAULT 0,
                    max_progress INTEGER DEFAULT 100,
                    unlocked_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, achievement_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
                )
            `);

            // User analytics table for tracking detailed metrics
            db.run(`
                CREATE TABLE IF NOT EXISTS user_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    tickets_generated INTEGER DEFAULT 0,
                    templates_used INTEGER DEFAULT 0,
                    categories_touched INTEGER DEFAULT 0,
                    time_saved_minutes INTEGER DEFAULT 0,
                    collaboration_points INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

            // Initialize ticket sequences table
            initTicketSequences().then(() => {
                console.log('✅ Ticket numbering system initialized');
                // Update existing tickets with new numbering system (one-time migration)
                updateExistingTickets().catch((error) => {
                    console.log('ℹ️ Existing tickets already updated or no tickets to update');
                });
            }).catch((error) => {
                console.error('❌ Error initializing ticket numbering:', error);
            });

            // Initialize default roles
            const defaultRoles = [
                {
                    id: 'admin',
                    name: 'Administrator',
                    description: 'Full system access with all permissions',
                    is_system: true,
                    permissions: [
                        'ticket.view_all', 'ticket.assign_any', 'ticket.delete',
                        'user.view_all', 'user.create', 'user.update', 'user.deactivate',
                        'queue.view_all', 'queue.manage',
                        'system.manage_settings', 'reporting.view_all',
                        'admin.manage_users', 'admin.view_users',
                        'admin.manage_teams', 'admin.view_teams',
                        'admin.manage_organization', 'admin.view_organization',
                        'admin.manage_categories', 'admin.view_categories',
                        'admin.manage_support_teams', 'admin.view_support_teams',
                        'admin.view_analytics', 'admin.system_settings', 'admin.maintenance_override'
                    ]
                },
                {
                    id: 'manager',
                    name: 'Manager',
                    description: 'Team management and reporting capabilities',
                    is_system: true,
                    permissions: [
                        'ticket.view_team', 'ticket.assign_within_team', 'ticket.escalate',
                        'queue.view_team', 'reporting.view_team_metrics',
                        'ticket.view_own', 'ticket.update_own', 'ticket.comment_own',
                        'queue.view_own_team', 'system.view_basic_info'
                    ]
                },
                {
                    id: 'it_user',
                    name: 'IT User',
                    description: 'Standard IT staff member with basic permissions',
                    is_system: true,
                    permissions: [
                        'ticket.view_own', 'ticket.update_own', 'ticket.comment_own',
                        'queue.view_own_team', 'system.view_basic_info'
                    ]
                }
            ];

            // Insert default roles
            defaultRoles.forEach(role => {
                db.run(
                    `INSERT OR IGNORE INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)`,
                    [role.id, role.name, role.description, role.is_system],
                    function(err) {
                        if (!err) {
                            // Insert permissions for this role
                            role.permissions.forEach(permission => {
                                db.run(
                                    `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
                                    [role.id, permission]
                                );
                            });
                        }
                    }
                );
            });

            // Initialize default achievements
            const defaultAchievements = [
                // Productivity Achievements
                {
                    id: 'first_steps',
                    name: 'First Steps',
                    description: 'Generate your first ticket',
                    category: 'productivity',
                    rarity: 'common',
                    icon: '🎯',
                    xp_reward: 25,
                    criteria_type: 'ticket_count',
                    criteria_value: 1,
                    criteria_data: null
                },
                {
                    id: 'consistent_contributor',
                    name: 'Consistent Contributor',
                    description: 'Maintain a 7-day streak',
                    category: 'productivity',
                    rarity: 'uncommon',
                    icon: '🔥',
                    xp_reward: 100,
                    criteria_type: 'streak_days',
                    criteria_value: 7,
                    criteria_data: null
                },
                {
                    id: 'marathon_runner',
                    name: 'Marathon Runner',
                    description: 'Maintain a 30-day streak',
                    category: 'productivity',
                    rarity: 'rare',
                    icon: '🏃‍♂️',
                    xp_reward: 300,
                    criteria_type: 'streak_days',
                    criteria_value: 30,
                    criteria_data: null
                },
                {
                    id: 'centurion',
                    name: 'Centurion',
                    description: 'Generate 100 tickets',
                    category: 'productivity',
                    rarity: 'epic',
                    icon: '💯',
                    xp_reward: 500,
                    criteria_type: 'ticket_count',
                    criteria_value: 100,
                    criteria_data: null
                },
                {
                    id: 'efficiency_expert',
                    name: 'Efficiency Expert',
                    description: 'Save 100+ hours through templates',
                    category: 'productivity',
                    rarity: 'legendary',
                    icon: '⚡',
                    xp_reward: 1000,
                    criteria_type: 'time_saved',
                    criteria_value: 6000, // 100 hours in minutes
                    criteria_data: null
                },
                
                // Quality Achievements
                {
                    id: 'problem_solver',
                    name: 'Problem Solver',
                    description: 'Address tickets across 5+ categories',
                    category: 'quality',
                    rarity: 'rare',
                    icon: '🧩',
                    xp_reward: 200,
                    criteria_type: 'category_diversity',
                    criteria_value: 5,
                    criteria_data: null
                },
                {
                    id: 'template_master',
                    name: 'Template Master',
                    description: 'Use templates in 50+ tickets',
                    category: 'quality',
                    rarity: 'epic',
                    icon: '📋',
                    xp_reward: 400,
                    criteria_type: 'template_usage',
                    criteria_value: 50,
                    criteria_data: null
                },
                
                // Collaboration Achievements
                {
                    id: 'team_player',
                    name: 'Team Player',
                    description: 'Collaborate on team projects',
                    category: 'collaboration',
                    rarity: 'uncommon',
                    icon: '🤝',
                    xp_reward: 150,
                    criteria_type: 'team_collaboration',
                    criteria_value: 1,
                    criteria_data: null
                },
                
                // Special Achievements
                {
                    id: 'early_adopter',
                    name: 'Early Adopter',
                    description: 'Among the first users of the system',
                    category: 'special',
                    rarity: 'legendary',
                    icon: '🌟',
                    xp_reward: 500,
                    criteria_type: 'special_event',
                    criteria_value: 1,
                    criteria_data: JSON.stringify({ event_type: 'early_adoption' })
                }
            ];

            // Insert default achievements
            defaultAchievements.forEach(achievement => {
                db.run(
                    `INSERT OR IGNORE INTO achievements 
                     (id, name, description, category, rarity, icon, xp_reward, criteria_type, criteria_value, criteria_data) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        achievement.id, achievement.name, achievement.description,
                        achievement.category, achievement.rarity, achievement.icon,
                        achievement.xp_reward, achievement.criteria_type,
                        achievement.criteria_value, achievement.criteria_data
                    ],
                    function(err) {
                        if (err) {
                            console.error(`Error creating achievement ${achievement.id}:`, err.message);
                        }
                    }
                );
            });

            // Check if users already exist before seeding
            db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => {
                if (err || row.count > 0) {
                    console.log(`✅ Database already initialized with ${row?.count || 0} users`);
                    resolve();
                    return;
                }

                // Create default users only if database is empty
                console.log('🌱 Seeding database with default users...');
                const defaultUsers = [
                {
                    username: 'admin',
                    display_name: 'System Administrator',
                    email: 'admin@orvale.gov',
                    password: 'admin123',
                    role: 'admin',
                    team_id: 'ADMIN',
                    section_id: 'ADMIN'
                },
                {
                    username: 'boris.chu',
                    display_name: 'Boris Chu',
                    email: 'boris.chu@orvale.gov', 
                    password: 'boris123',
                    role: 'it_user',
                    team_id: 'ITTS_Region7',
                    section_id: 'ITD'
                },
                {
                    username: 'john.doe',
                    display_name: 'John Doe',
                    email: 'john.doe@orvale.gov',
                    password: 'john123', 
                    role: 'it_user',
                    team_id: 'ITTS_Region7',
                    section_id: 'ITD'
                }
                ];

                let usersCreated = 0;
                defaultUsers.forEach(userData => {
                    const hashedPassword = bcrypt.hashSync(userData.password, 10);
                    db.run(
                        `INSERT OR IGNORE INTO users (username, display_name, email, password_hash, role, team_id, section_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [userData.username, userData.display_name, userData.email, hashedPassword, userData.role, userData.team_id, userData.section_id],
                        function(err) {
                            if (err) {
                                console.error('Error creating user:', err);
                            } else {
                                usersCreated++;
                                if (usersCreated === defaultUsers.length) {
                                    console.log('✅ Database tables created successfully');
                                    console.log(`📊 Database ready with ${usersCreated} users`);
                                    resolve();
                                }
                            }
                        }
                    );
                });
            }); // Close the db.get callback
        });
    });
};

// Database query helpers
export const queryAsync = (sql: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export const getAsync = (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export const runAsync = (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

export { db };