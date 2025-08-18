const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

const initDB = () => {
    console.log('🔧 Initializing Orvale Management System database...');
    
    db.serialize(() => {
        // Users table with RBAC
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'it_user', -- 'admin', 'it_user', 'manager'
                team_id TEXT,
                section_id TEXT,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Main tickets table (matches blueprint exactly)
        db.run(`
            CREATE TABLE IF NOT EXISTS user_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id TEXT UNIQUE NOT NULL,
                
                -- PRIMARY USER (person who needs help)
                user_name TEXT NOT NULL,
                employee_number TEXT NOT NULL,
                phone_number TEXT,
                location TEXT,
                section TEXT,
                teleworking TEXT,
                
                -- SUBMISSION TRACKING
                submitted_by TEXT NOT NULL,
                submitted_by_employee_number TEXT NOT NULL,
                on_behalf BOOLEAN DEFAULT FALSE,
                
                -- TICKET DETAILS
                issue_title TEXT NOT NULL,
                issue_description TEXT NOT NULL,
                computer_info TEXT, -- JSON blob
                
                -- WORKFLOW
                priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
                status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'escalated'
                assigned_to TEXT, -- Username of assigned person
                assigned_team TEXT, -- Team identifier
                
                -- ESCALATION
                escalation_reason TEXT,
                escalated_at TIMESTAMP,
                
                -- COMPLETION
                completion_notes TEXT,
                completed_at TIMESTAMP,
                completed_by TEXT,
                
                -- METADATA
                email_recipient TEXT,
                email_recipient_display TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Teams structure
        db.run(`
            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                email TEXT,
                section_id TEXT
            )
        `);

        // Sections structure  
        db.run(`
            CREATE TABLE IF NOT EXISTS sections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT
            )
        `);

        console.log('✅ Database tables created successfully');

        // Check if we need to seed initial data
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
                console.error('❌ Error checking users table:', err);
                return;
            }
            
            if (row.count === 0) {
                console.log('🌱 Seeding initial data...');
                seedInitialData();
            } else {
                console.log(`📊 Database ready with ${row.count} existing users`);
            }
        });
    });
};

const seedInitialData = async () => {
    try {
        // Create password hashes
        const adminHash = await bcrypt.hash('admin123', 10);
        const borisHash = await bcrypt.hash('boris123', 10);
        const johnHash = await bcrypt.hash('john123', 10);

        // Insert sections first
        db.run(`
            INSERT INTO sections (id, name, description) VALUES
            ('ITTS', 'IT Technical Support', 'Information Technology Technical Support Division'),
            ('ADMIN', 'Administration', 'Administrative Division')
        `);

        // Insert teams
        db.run(`
            INSERT INTO teams (id, name, description, email, section_id) VALUES
            ('ITTS_Region7', 'ITTS: Region 7', 'IT Technical Support Region 7', 'region7@dpss.gov', 'ITTS'),
            ('ITTS_Region7', 'ITTS: Region 7', 'IT Technical Support Region 7', 'itts@dpss.gov', 'ITTS'),
            ('ADMIN_Main', 'Administration: Main', 'Main Administrative Office', 'admin@dpss.gov', 'ADMIN')
        `);

        // Insert users
        db.run(`
            INSERT INTO users (username, display_name, email, password_hash, role, team_id, section_id) VALUES
            (?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?, ?)
        `, [
            'admin', 'System Administrator', 'admin@dpss.gov', adminHash, 'admin', 'ADMIN_Main', 'ADMIN',
            'boris.chu', 'Boris Chu', 'boris.chu@dpss.gov', borisHash, 'it_user', 'ITTS_Region7', 'ITTS',
            'john.doe', 'John Doe', 'john.doe@dpss.gov', johnHash, 'it_user', 'ITTS_Region7', 'ITTS'
        ], function(err) {
            if (err) {
                console.error('❌ Error seeding users:', err);
                return;
            }
            console.log('✅ Initial users created');
            
            // Create some test tickets
            seedTestTickets();
        });

    } catch (error) {
        console.error('❌ Error seeding initial data:', error);
    }
};

const seedTestTickets = () => {
    const testTickets = [
        {
            submission_id: 'TKT-20250808-001',
            user_name: 'Jackson Ville',
            employee_number: 'e788823',
            phone_number: '(092) 309-4733',
            location: 'Crossroads Main',
            section: 'Budget Planning & Control',
            teleworking: 'No',
            submitted_by: 'Jackson Ville',
            submitted_by_employee_number: 'e788823',
            on_behalf: false,
            issue_title: 'Desktop Icons All Disappeared',
            issue_description: 'I logged in this morning and all of my desktop icons are gone. I didn\'t delete anything. File Explorer still shows my files are there, but nothing displays on the desktop.',
            computer_info: JSON.stringify({
                ip_address: '192.168.1.45',
                browser: 'Edge 138.0.0.0',
                domain: 'Not Domain Joined',
                user_account: 'borischu',
                computer_name: 'Boriss-MacBook-Pro.local'
            }),
            priority: 'medium',
            status: 'assigned',
            assigned_to: 'boris.chu',
            assigned_team: 'ITTS_Region7',
            email_recipient: 'region7@dpss.gov',
            email_recipient_display: 'ITTS: Region 7'
        },
        {
            submission_id: 'TKT-20250808-002',
            user_name: 'Jane Kaiser',
            employee_number: 'e123457',
            phone_number: '(555) 123-4567',
            location: 'Kaiser Building',
            section: 'Administration',
            teleworking: 'Yes',
            submitted_by: 'Jane Kaiser',
            submitted_by_employee_number: 'e123457',
            on_behalf: false,
            issue_title: 'MS Teams Issues',
            issue_description: 'There is an issue with my sound on the computer.',
            computer_info: JSON.stringify({
                ip_address: '192.168.1.67',
                browser: 'Chrome 131.0.0.0',
                domain: 'DPSS.GOV',
                user_account: 'jkaiser',
                computer_name: 'JANE-LAPTOP-01'
            }),
            priority: 'medium',
            status: 'pending',
            assigned_team: 'ITTS_Region7',
            email_recipient: 'itts@dpss.gov',
            email_recipient_display: 'ITTS: Main Office'
        },
        {
            submission_id: 'TKT-20250808-003',
            user_name: 'Joe Smith',
            employee_number: 'e230293',
            phone_number: '(555) 987-6543',
            location: 'Crossroads East',
            section: 'IT Division',
            teleworking: 'No',
            submitted_by: 'Joe Smith',
            submitted_by_employee_number: 'e230293',
            on_behalf: false,
            issue_title: 'Issue with the dock',
            issue_description: 'Docking issues. Docking issues. Docking issues. Docking issues. Docking issues. Docking issues. Docking issues.',
            computer_info: JSON.stringify({
                ip_address: '192.168.1.89',
                browser: 'Firefox 122.0.0.0',
                domain: 'DPSS.GOV',
                user_account: 'jsmith',
                computer_name: 'JOE-DESKTOP-01'
            }),
            priority: 'medium',
            status: 'assigned',
            assigned_to: 'john.doe',
            assigned_team: 'ITTS_Region7',
            email_recipient: 'itts@dpss.gov',
            email_recipient_display: 'ITTS: Main Office'
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO user_tickets (
            submission_id, user_name, employee_number, phone_number, location, section,
            teleworking, submitted_by, submitted_by_employee_number, on_behalf,
            issue_title, issue_description, computer_info, priority, status,
            assigned_to, assigned_team, email_recipient, email_recipient_display
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    testTickets.forEach(ticket => {
        stmt.run(
            ticket.submission_id, ticket.user_name, ticket.employee_number,
            ticket.phone_number, ticket.location, ticket.section, ticket.teleworking,
            ticket.submitted_by, ticket.submitted_by_employee_number, ticket.on_behalf,
            ticket.issue_title, ticket.issue_description, ticket.computer_info,
            ticket.priority, ticket.status, ticket.assigned_to, ticket.assigned_team,
            ticket.email_recipient, ticket.email_recipient_display
        );
    });

    stmt.finalize((err) => {
        if (err) {
            console.error('❌ Error seeding test tickets:', err);
        } else {
            console.log('✅ Test tickets created successfully');
            console.log('🚀 Database initialization complete!');
            console.log('\n📋 Test Login Credentials:');
            console.log('👤 Admin: admin / admin123');
            console.log('👤 Boris: boris.chu / boris123');
            console.log('👤 John: john.doe / john123');
        }
    });
};

// Database query helpers
const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

module.exports = { 
    db, 
    initDB, 
    queryAsync, 
    getAsync, 
    runAsync 
};