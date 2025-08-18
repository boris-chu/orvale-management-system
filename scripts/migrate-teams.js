const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Creating teams and organizational structure tables...');

db.serialize(() => {
  // Create organizational sections table
  db.run(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_section_id TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_section_id) REFERENCES sections(id)
    )
  `);

  // Create teams table
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      section_id TEXT NOT NULL,
      lead_user_id INTEGER,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (lead_user_id) REFERENCES users(id)
    )
  `);

  // Insert default sections
  const defaultSections = [
    { id: 'ITD', name: 'IT Department', description: 'Information Technology Department' },
    { id: 'NET', name: 'Network Services', description: 'Network Infrastructure and Services', parent: 'ITD' },
    { id: 'DEV', name: 'Development', description: 'Software Development and Applications', parent: 'ITD' },
    { id: 'SEC', name: 'Security', description: 'Information Security and Compliance', parent: 'ITD' },
    { id: 'ADMIN', name: 'Administration', description: 'Administrative Services' },
    { id: 'SUPPORT', name: 'Technical Support', description: 'End-user Technical Support', parent: 'ITD' }
  ];

  defaultSections.forEach(section => {
    db.run(
      `INSERT OR IGNORE INTO sections (id, name, description, parent_section_id) VALUES (?, ?, ?, ?)`,
      [section.id, section.name, section.description, section.parent || null],
      function(err) {
        if (err) {
          console.error(`Error creating section ${section.id}:`, err);
        } else {
          console.log(`✅ Section created: ${section.name}`);
        }
      }
    );
  });

  // Insert default teams
  const defaultTeams = [
    { id: 'ITTS_Region7', name: 'ITTS: Region 7', description: 'IT Technical Support for Region 7', section: 'SUPPORT' },
    { id: 'ITTS_Region1', name: 'ITTS: Region 1', description: 'IT Technical Support for Region 1', section: 'SUPPORT' },
    { id: 'ITTS_Region2', name: 'ITTS: Region 2', description: 'IT Technical Support for Region 2', section: 'SUPPORT' },
    { id: 'ITTS_Main', name: 'ITTS: Main Office', description: 'IT Technical Support for Main Office', section: 'SUPPORT' },
    { id: 'NET_North', name: 'Network: North Zone', description: 'Network Infrastructure - North Zone', section: 'NET' },
    { id: 'NET_South', name: 'Network: South Zone', description: 'Network Infrastructure - South Zone', section: 'NET' },
    { id: 'DEV_Alpha', name: 'Dev Team Alpha', description: 'Development Team Alpha - Core Applications', section: 'DEV' },
    { id: 'DEV_Beta', name: 'Dev Team Beta', description: 'Development Team Beta - Web Applications', section: 'DEV' },
    { id: 'SEC_Core', name: 'Security: Core', description: 'Core Security Operations', section: 'SEC' },
    { id: 'ADMIN', name: 'Administration', description: 'Administrative Team', section: 'ADMIN' }
  ];

  defaultTeams.forEach(team => {
    db.run(
      `INSERT OR IGNORE INTO teams (id, name, description, section_id) VALUES (?, ?, ?, ?)`,
      [team.id, team.name, team.description, team.section],
      function(err) {
        if (err) {
          console.error(`Error creating team ${team.id}:`, err);
        } else {
          console.log(`✅ Team created: ${team.name}`);
        }
      }
    );
  });

  console.log('🎉 Teams and sections migration completed!');
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📄 Database connection closed successfully');
    }
  });
});