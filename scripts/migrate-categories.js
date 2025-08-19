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
    { id: 'bas', name: 'Bureau of Administrative Services', office_id: 'crossroads_main' },
    { id: 'bcsc', name: 'Bureau of Customer Service Centers', office_id: 'crossroads_main' },
    { id: 'bhr_bureau', name: 'Bureau of Human Resources', office_id: 'bhr' },
    { id: 'bpp', name: 'Bureau of Program & Policy', office_id: 'crossroads_main' },
    { id: 'bso', name: 'Bureau of Special Operations', office_id: 'crossroads_main' },
    { id: 'bts', name: 'Bureau of Technology Services', office_id: 'crossroads_main' },
    { id: 'bws_north', name: 'Bureau of Workforce Services North', office_id: 'crossroads_north' },
    { id: 'bws_south', name: 'Bureau of Workforce Services South', office_id: 'crossroads_south' },
    { id: 'dpss_admin', name: 'DPSS Administration', office_id: 'crossroads_main' }
  ];

  defaultBureaus.forEach(bureau => {
    db.run(
      `INSERT OR IGNORE INTO dpss_bureaus (id, name, office_id) VALUES (?, ?, ?)`,
      [bureau.id, bureau.name, bureau.office_id],
      function(err) {
        if (err) {
          console.error(`Error creating bureau ${bureau.id}:`, err);
        } else {
          console.log(`✅ Bureau created: ${bureau.name}`);
        }
      }
    );
  });

  // Insert sample DPSS divisions
  const defaultDivisions = [
    { id: 'it_division', name: 'Information Technology Division', bureau_id: 'bts' },
    { id: 'network_division', name: 'Network Services Division', bureau_id: 'bts' },
    { id: 'security_division', name: 'Information Security Division', bureau_id: 'bts' },
    { id: 'hr_operations', name: 'HR Operations Division', bureau_id: 'bhr_bureau' },
    { id: 'hr_recruitment', name: 'Recruitment Division', bureau_id: 'bhr_bureau' },
    { id: 'fiscal_mgmt', name: 'Fiscal Management Division', bureau_id: 'bas' },
    { id: 'facilities_mgmt', name: 'Facilities Management Division', bureau_id: 'bas' },
    { id: 'customer_ops', name: 'Customer Operations Division', bureau_id: 'bcsc' }
  ];

  defaultDivisions.forEach(division => {
    db.run(
      `INSERT OR IGNORE INTO dpss_divisions (id, name, bureau_id) VALUES (?, ?, ?)`,
      [division.id, division.name, division.bureau_id],
      function(err) {
        if (err) {
          console.error(`Error creating division ${division.id}:`, err);
        } else {
          console.log(`✅ Division created: ${division.name}`);
        }
      }
    );
  });

  // Insert sample DPSS sections (these appear in ticket forms)
  const defaultSections = [
    { id: 'it_support', name: 'IT Technical Support', division_id: 'it_division' },
    { id: 'it_infrastructure', name: 'IT Infrastructure', division_id: 'it_division' },
    { id: 'network_ops', name: 'Network Operations', division_id: 'network_division' },
    { id: 'network_security', name: 'Network Security', division_id: 'network_division' },
    { id: 'info_security', name: 'Information Security', division_id: 'security_division' },
    { id: 'hr_admin', name: 'HR Administration', division_id: 'hr_operations' },
    { id: 'hr_benefits', name: 'Benefits Administration', division_id: 'hr_operations' },
    { id: 'recruitment', name: 'Recruitment Services', division_id: 'hr_recruitment' },
    { id: 'fiscal_ops', name: 'Fiscal Operations', division_id: 'fiscal_mgmt' },
    { id: 'budget_analysis', name: 'Budget Analysis', division_id: 'fiscal_mgmt' },
    { id: 'facilities', name: 'Facilities Operations', division_id: 'facilities_mgmt' },
    { id: 'customer_service', name: 'Customer Service', division_id: 'customer_ops' },
    { id: 'case_management', name: 'Case Management', division_id: 'customer_ops' }
  ];

  defaultSections.forEach(section => {
    db.run(
      `INSERT OR IGNORE INTO dpss_sections (id, name, division_id) VALUES (?, ?, ?)`,
      [section.id, section.name, section.division_id],
      function(err) {
        if (err) {
          console.error(`Error creating section ${section.id}:`, err);
        } else {
          console.log(`✅ Section created: ${section.name}`);
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