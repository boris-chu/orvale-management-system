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
                        'admin.view_analytics', 'admin.system_settings'
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

            // Create default users
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
                    `INSERT OR REPLACE INTO users (username, display_name, email, password_hash, role, team_id, section_id) 
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