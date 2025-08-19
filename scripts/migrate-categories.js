const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Creating ticket categories and DPSS organizational structure tables...');

db.serialize(() => {
  // Ticket Categories System Tables
  
  // Main ticket categories
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Request types within categories
  db.run(`
    CREATE TABLE IF NOT EXISTS request_types (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES ticket_categories(id)
    )
  `);

  // Subcategories within request types
  db.run(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      request_type_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_type_id) REFERENCES request_types(id)
    )
  `);

  // Implementation types within subcategories
  db.run(`
    CREATE TABLE IF NOT EXISTS implementations (
      id TEXT PRIMARY KEY,
      subcategory_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
    )
  `);

  // DPSS Organizational Structure Tables

  // DPSS Offices
  db.run(`
    CREATE TABLE IF NOT EXISTS dpss_offices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DPSS Bureaus
  db.run(`
    CREATE TABLE IF NOT EXISTS dpss_bureaus (
      id TEXT PRIMARY KEY,
      office_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES dpss_offices(id)
    )
  `);

  // DPSS Divisions
  db.run(`
    CREATE TABLE IF NOT EXISTS dpss_divisions (
      id TEXT PRIMARY KEY,
      bureau_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bureau_id) REFERENCES dpss_bureaus(id)
    )
  `);

  // DPSS Sections
  db.run(`
    CREATE TABLE IF NOT EXISTS dpss_sections (
      id TEXT PRIMARY KEY,
      division_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (division_id) REFERENCES dpss_divisions(id)
    )
  `);

  // Insert default ticket categories
  const defaultCategories = [
    { id: 'app_support', name: 'Application/System Support', description: 'Issues with software applications and systems' },
    { id: 'hw_infra', name: 'Hardware - Infrastructure Management', description: 'Network and server infrastructure issues' },
    { id: 'hw_support', name: 'Hardware - Technical Support', description: 'Desktop and peripheral hardware support' },
    { id: 'infra_mgmt', name: 'Infrastructure Management', description: 'General infrastructure management tasks' },
    { id: 'media_services', name: 'Media Services Support', description: 'Audio/visual and media equipment support' },
    { id: 'tech_support', name: 'Technical Support', description: 'General technical support requests' },
    { id: 'tech_admin', name: 'Technical Support Admin', description: 'Administrative technical support tasks' },
    { id: 'vtc_support', name: 'VTC Support', description: 'Video teleconferencing support' },
    { id: 'webex_support', name: 'WebEx Support', description: 'WebEx meeting and conferencing support' }
  ];

  defaultCategories.forEach(category => {
    db.run(
      `INSERT OR IGNORE INTO ticket_categories (id, name, description) VALUES (?, ?, ?)`,
      [category.id, category.name, category.description],
      function(err) {
        if (err) {
          console.error(`Error creating category ${category.id}:`, err);
        } else {
          console.log(`✅ Category created: ${category.name}`);
        }
      }
    );
  });

  // Insert sample DPSS offices
  const defaultOffices = [
    { id: 'bhr', name: 'Bureau of Human Resources' },
    { id: 'crossroads_east', name: 'Crossroads East' },
    { id: 'crossroads_main', name: 'Crossroads Main' },
    { id: 'crossroads_west', name: 'Crossroads West' },
    { id: 'dpss_academy', name: 'DPSS Academy' },
    { id: 'fiscal_mgmt', name: 'Fiscal Management Division' },
    { id: 'fiscal_ops', name: 'Fiscal Operations Division' },
    { id: 'ihss_crossroads', name: 'IHSS Crossroads' },
    { id: 'line_ops', name: 'Line Operation Division' }
  ];

  defaultOffices.forEach(office => {
    db.run(
      `INSERT OR IGNORE INTO dpss_offices (id, name) VALUES (?, ?)`,
      [office.id, office.name],
      function(err) {
        if (err) {
          console.error(`Error creating office ${office.id}:`, err);
        } else {
          console.log(`✅ Office created: ${office.name}`);
        }
      }
    );
  });

  // Insert sample DPSS bureaus
  const defaultBureaus = [
    { id: 'bas', name: 'Bureau of Administrative Services' },
    { id: 'bcsc', name: 'Bureau of Customer Service Centers' },
    { id: 'bhr_bureau', name: 'Bureau of Human Resources' },
    { id: 'bpp', name: 'Bureau of Program & Policy' },
    { id: 'bso', name: 'Bureau of Special Operations' },
    { id: 'bts', name: 'Bureau of Technology Services' },
    { id: 'bws_north', name: 'Bureau of Workforce Services North' },
    { id: 'bws_south', name: 'Bureau of Workforce Services South' },
    { id: 'dpss_admin', name: 'DPSS Administration' }
  ];

  defaultBureaus.forEach(bureau => {
    db.run(
      `INSERT OR IGNORE INTO dpss_bureaus (id, name) VALUES (?, ?)`,
      [bureau.id, bureau.name],
      function(err) {
        if (err) {
          console.error(`Error creating bureau ${bureau.id}:`, err);
        } else {
          console.log(`✅ Bureau created: ${bureau.name}`);
        }
      }
    );
  });

  console.log('🎉 Categories and DPSS organizational structure migration completed!');
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📄 Database connection closed successfully');
    }
  });
});