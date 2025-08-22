const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('Creating ticket comments table...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Create ticket_comments table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS ticket_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  comment_text TEXT NOT NULL,
  commented_by VARCHAR(100) NOT NULL,
  commented_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_internal BOOLEAN DEFAULT 1,
  FOREIGN KEY (ticket_id) REFERENCES user_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (commented_by) REFERENCES users(username)
);
`;

db.run(createTableSQL, (err) => {
  if (err) {
    console.error('Error creating ticket_comments table:', err.message);
  } else {
    console.log('✅ ticket_comments table created successfully');
  }
});

// Create index for better performance
const createIndexSQL = `
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at);
`;

db.exec(createIndexSQL, (err) => {
  if (err) {
    console.error('Error creating indexes:', err.message);
  } else {
    console.log('✅ Indexes created successfully');
  }
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
});