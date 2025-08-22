const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('🗄️ Creating comment_read_status table...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Create comment_read_status table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS comment_read_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES ticket_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(username),
  UNIQUE(comment_id, user_id)
);
`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('Error creating comment_read_status table:', err.message);
  } else {
    console.log('✅ comment_read_status table created successfully');
  }
});

// Create indexes for performance
const createIndexesSQL = `
CREATE INDEX IF NOT EXISTS idx_comment_read_status_comment_id 
ON comment_read_status(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_read_status_user_id 
ON comment_read_status(user_id);

CREATE INDEX IF NOT EXISTS idx_comment_read_status_composite 
ON comment_read_status(comment_id, user_id);
`;

db.exec(createIndexesSQL, (err) => {
  if (err) {
    console.error('Error creating indexes:', err.message);
  } else {
    console.log('✅ Indexes created successfully');
    console.log('📊 Table structure:');
    console.log('   - id: Primary key');
    console.log('   - comment_id: References ticket_comments.id');
    console.log('   - user_id: References users.username');
    console.log('   - read_at: Timestamp when comment was read');
    console.log('   - Unique constraint: (comment_id, user_id)');
    console.log('   - Indexes: comment_id, user_id, composite for performance');
  }
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
});