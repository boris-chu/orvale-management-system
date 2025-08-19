const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🗂️  Creating ticket history/audit trail system...');

// Create ticket_history table
const createTicketHistoryTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS ticket_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            action_type TEXT NOT NULL,  -- 'created', 'assigned', 'escalated', 'status_changed', 'completed', etc.
            performed_by TEXT NOT NULL,
            performed_by_display TEXT,
            from_value TEXT,            -- Previous value (for assignments, status changes)
            to_value TEXT,              -- New value
            from_team TEXT,             -- Previous team
            to_team TEXT,               -- New team  
            reason TEXT,                -- Escalation reason, assignment reason, etc.
            details TEXT,               -- Additional JSON details
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (ticket_id) REFERENCES user_tickets(id) ON DELETE CASCADE
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('❌ Error creating ticket_history table:', err);
            return;
        }
        console.log('✅ Created ticket_history table');
        
        // Create indexes for better performance
        createIndexes();
    });
};

// Create indexes for better query performance
const createIndexes = () => {
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id)',
        'CREATE INDEX IF NOT EXISTS idx_ticket_history_performed_at ON ticket_history(performed_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_ticket_history_action_type ON ticket_history(action_type)',
        'CREATE INDEX IF NOT EXISTS idx_ticket_history_performed_by ON ticket_history(performed_by)'
    ];
    
    let completed = 0;
    
    indexes.forEach(indexSql => {
        db.run(indexSql, (err) => {
            if (err) {
                console.error('❌ Error creating index:', err);
            } else {
                completed++;
                if (completed === 1) console.log('✅ Created ticket_id index');
                if (completed === 2) console.log('✅ Created performed_at index');
                if (completed === 3) console.log('✅ Created action_type index');
                if (completed === 4) console.log('✅ Created performed_by index');
            }
            
            if (completed === indexes.length) {
                // Add original_submitting_team column to user_tickets table
                addOriginalTeamColumn();
            }
        });
    });
};

// Add original_submitting_team to track where ticket came from
const addOriginalTeamColumn = () => {
    db.run(`ALTER TABLE user_tickets ADD COLUMN original_submitting_team TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Error adding original_submitting_team column:', err);
        } else {
            console.log('✅ Added original_submitting_team column to user_tickets');
        }
        
        // Create helper functions for history tracking
        createHelperViews();
    });
};

// Create helpful views for common queries
const createHelperViews = () => {
    const createTicketHistoryView = `
        CREATE VIEW IF NOT EXISTS ticket_history_detailed AS
        SELECT 
            th.*,
            ut.issue_title,
            ut.submission_id,
            ut.status as current_status,
            ut.assigned_team as current_team,
            ut.assigned_to as current_assignee
        FROM ticket_history th
        JOIN user_tickets ut ON th.ticket_id = ut.id
        ORDER BY th.performed_at DESC
    `;
    
    db.run(createTicketHistoryView, (err) => {
        if (err) {
            console.error('❌ Error creating ticket history view:', err);
        } else {
            console.log('✅ Created ticket_history_detailed view');
        }
        
        // Create sample history entries for existing tickets
        createHistoryForExistingTickets();
    });
};

// Add history entries for existing tickets
const createHistoryForExistingTickets = () => {
    // Get all existing tickets
    db.all(`SELECT id, submission_id, status, assigned_to, assigned_team, submitted_at, submitted_by FROM user_tickets`, (err, tickets) => {
        if (err) {
            console.error('❌ Error fetching existing tickets:', err);
            db.close();
            return;
        }
        
        if (tickets.length === 0) {
            console.log('ℹ️  No existing tickets to create history for');
            db.close();
            return;
        }
        
        console.log(`📋 Creating history entries for ${tickets.length} existing tickets...`);
        
        let processed = 0;
        
        tickets.forEach(ticket => {
            // Create initial 'created' history entry
            db.run(`
                INSERT INTO ticket_history (
                    ticket_id, action_type, performed_by, performed_by_display, 
                    to_value, to_team, details, performed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticket.id,
                'created',
                ticket.submitted_by || 'system',
                ticket.submitted_by || 'System',
                ticket.status,
                ticket.assigned_team || 'UNASSIGNED',
                JSON.stringify({
                    initial_status: ticket.status,
                    submission_id: ticket.submission_id
                }),
                ticket.submitted_at
            ], (histErr) => {
                if (histErr) {
                    console.error(`❌ Error creating history for ticket ${ticket.submission_id}:`, histErr);
                } else {
                    console.log(`  ➤ Created history: ${ticket.submission_id} (${ticket.status})`);
                }
                
                processed++;
                
                if (processed === tickets.length) {
                    console.log(`\n🎉 Successfully created ticket history system!`);
                    console.log(`📊 Database Schema Updated:`);
                    console.log(`   - ticket_history table created`);
                    console.log(`   - 4 performance indexes added`);
                    console.log(`   - original_submitting_team column added`);
                    console.log(`   - ticket_history_detailed view created`);
                    console.log(`   - ${tickets.length} historical entries created`);
                    
                    console.log(`\n🔍 Query Examples:`);
                    console.log(`   - View ticket trail: SELECT * FROM ticket_history WHERE ticket_id = ?`);
                    console.log(`   - View all history: SELECT * FROM ticket_history_detailed LIMIT 10`);
                    console.log(`   - Track escalations: SELECT * FROM ticket_history WHERE action_type = 'escalated'`);
                    
                    db.close();
                }
            });
        });
    });
};

// Start the process
createTicketHistoryTable();