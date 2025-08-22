const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('🗄️ Creating chat system database tables...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Chat channels (teams, departments, general)
const createChannelsTable = `
CREATE TABLE IF NOT EXISTS chat_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('public', 'private', 'direct')) DEFAULT 'public',
    created_by TEXT NOT NULL,
    team_id TEXT, -- Link to teams table
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(username),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);
`;

// Channel members
const createChannelMembersTable = `
CREATE TABLE IF NOT EXISTS chat_channel_members (
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('member', 'admin', 'owner')) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id),
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(username)
);
`;

// Chat messages
const createMessagesTable = `
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('text', 'file', 'image', 'ticket_link', 'system')) DEFAULT 'text',
    reply_to_id INTEGER, -- For threaded messages
    ticket_reference TEXT, -- Link to tickets
    file_attachment TEXT, -- File path or URL
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id)
);
`;

// User presence tracking
const createPresenceTable = `
CREATE TABLE IF NOT EXISTS user_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
    status_message TEXT,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_id TEXT, -- For WebSocket connection tracking
    FOREIGN KEY (user_id) REFERENCES users(username)
);
`;

// Message reactions (emojis)
const createReactionsTable = `
CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(username),
    UNIQUE(message_id, user_id, emoji)
);
`;

// Create indexes for performance
const createIndexes = `
-- Channel indexes
CREATE INDEX IF NOT EXISTS idx_chat_channels_team_id ON chat_channels(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_active ON chat_channels(active);

-- Channel members indexes
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_id ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_last_read ON chat_channel_members(last_read_at);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_ticket_ref ON chat_messages(ticket_reference);

-- Presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_active ON user_presence(last_active);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
`;

// Execute table creation
const tables = [
  { name: 'chat_channels', sql: createChannelsTable },
  { name: 'chat_channel_members', sql: createChannelMembersTable },
  { name: 'chat_messages', sql: createMessagesTable },
  { name: 'user_presence', sql: createPresenceTable },
  { name: 'message_reactions', sql: createReactionsTable }
];

async function createTables() {
  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.run(table.sql, (err) => {
        if (err) {
          console.error(`❌ Error creating ${table.name} table:`, err.message);
          reject(err);
        } else {
          console.log(`✅ ${table.name} table created successfully`);
          resolve();
        }
      });
    });
  }

  // Create indexes
  await new Promise((resolve, reject) => {
    db.exec(createIndexes, (err) => {
      if (err) {
        console.error('❌ Error creating indexes:', err.message);
        reject(err);
      } else {
        console.log('✅ Database indexes created successfully');
        resolve();
      }
    });
  });

  console.log('\n📊 Chat System Database Schema Summary:');
  console.log('   - chat_channels: Public/private channels with team linking');
  console.log('   - chat_channel_members: User-channel relationships with read status');
  console.log('   - chat_messages: Messages with threading, files, ticket links');
  console.log('   - user_presence: Real-time online/offline status tracking');
  console.log('   - message_reactions: Emoji reactions with unique constraints');
  console.log('   - Performance indexes: Optimized for real-time queries');
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n🎉 Chat system database setup complete!');
    }
  });
}

createTables().catch(console.error);