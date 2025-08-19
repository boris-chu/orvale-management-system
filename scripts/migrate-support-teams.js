const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Creating support teams tables and migrating data...');

db.serialize(() => {
  // Create support team groups table (subheaders)
  db.run(`
    CREATE TABLE IF NOT EXISTS support_team_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating support_team_groups table:', err);
    } else {
      console.log('✅ Created support_team_groups table');
    }
  });

  // Create support teams table
  db.run(`
    CREATE TABLE IF NOT EXISTS support_teams (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      email TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES support_team_groups(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating support_teams table:', err);
    } else {
      console.log('✅ Created support_teams table');
    }
  });

  // Insert initial data from current hardcoded structure
  console.log('📋 Inserting initial support team data...');

  // Insert ITTS Region 7 group
  db.run(`
    INSERT OR REPLACE INTO support_team_groups (id, name, sort_order) 
    VALUES ('itts_region_7', 'ITTS: Region 7', 0)
  `, (err) => {
    if (err) {
      console.error('Error creating support team group:', err);
    } else {
      console.log('✅ Created support team group: ITTS: Region 7');
    }
  });

  // Insert individual support teams
  const supportTeams = [
    {
      id: 'dpss_academy',
      label: 'DPSS Academy',
      email: 'BechtelTechs@dpss.lacounty.gov',
      description: 'IT Support for DPSS Academy',
      sort_order: 0
    },
    {
      id: 'bhr_tech',
      label: 'Bureau of Human Resources',
      email: 'BHRTechs@dpss.lacounty.gov',
      description: 'IT Support for Bureau of Human Resources',
      sort_order: 1
    },
    {
      id: 'crossroads_east',
      label: 'Crossroads East',
      email: 'CrossroadsITSupport@dpss.lacounty.gov',
      description: 'IT Support for Crossroads East Location',
      sort_order: 2
    },
    {
      id: 'crossroads_main',
      label: 'Crossroads Main',
      email: 'CrossroadsITSupport@dpss.lacounty.gov',
      description: 'IT Support for Crossroads Main Location',
      sort_order: 3
    },
    {
      id: 'crossroads_west',
      label: 'Crossroads West',
      email: 'CrossroadsITSupport@dpss.lacounty.gov',
      description: 'IT Support for Crossroads West Location',
      sort_order: 4
    },
    {
      id: 'kaiser_fod',
      label: 'Kaiser Building (FOD | IHSS | LOD)',
      email: 'FODTechs@dpss.lacounty.gov',
      description: 'IT Support for Kaiser Building - FOD, IHSS, LOD',
      sort_order: 5
    }
  ];

  supportTeams.forEach(team => {
    db.run(`
      INSERT OR REPLACE INTO support_teams (id, group_id, name, label, email, description, sort_order) 
      VALUES (?, 'itts_region_7', ?, ?, ?, ?, ?)
    `, [team.id, team.label, team.label, team.email, team.description, team.sort_order], (err) => {
      if (err) {
        console.error(`Error creating support team ${team.label}:`, err);
      } else {
        console.log(`✅ Created support team: ${team.label}`);
      }
    });
  });

  console.log('🎉 Support teams migration completed!');
  console.log(`📊 Summary:`);
  console.log(`   Groups: 1 (ITTS: Region 7)`);
  console.log(`   Teams: ${supportTeams.length}`);
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📄 Database connection closed successfully');
    }
  });
});