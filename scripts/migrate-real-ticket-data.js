const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Migrating real ticket category and organizational data...');

// Import real data from config files
// Import real data from config files
// Note: Using dynamic import since config files use ES6 modules
let mainCategories, requestTypes, subcategories, organizationalData;

async function loadConfigData() {
  try {
    const categoriesModule = await import('../config/categories/main-categories.js');
    const requestTypesModule = await import('../config/categories/request-types.js');
    const subcategoriesModule = await import('../config/categories/ticket-categories.js');
    const organizationalModule = await import('../config/organizational-data.js');
    
    mainCategories = categoriesModule.categories;
    requestTypes = requestTypesModule.requestTypes;
    subcategories = subcategoriesModule.subcategories;
    organizationalData = organizationalModule.organizationalData;
    
    console.log('✅ Config data loaded successfully');
    console.log(`   Categories: ${Object.keys(mainCategories).length}`);
    console.log(`   Request Types: ${Object.keys(requestTypes).length}`);
    console.log(`   Subcategories: ${Object.keys(subcategories).length}`);
    console.log(`   Offices: ${organizationalData.offices.length}`);
    console.log(`   Bureaus: ${organizationalData.bureaus.length}`);
    console.log(`   Divisions: ${organizationalData.divisions.length}`);
    console.log(`   Sections: ${organizationalData.sections.length}`);
  } catch (error) {
    console.error('❌ Error loading config data:', error);
    process.exit(1);
  }
}

// DPSS organizational data will be loaded from config file

// Helper function to generate ID from name
const generateId = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
};

async function runMigration() {
  await loadConfigData();
  
  db.serialize(() => {
    console.log('🗑️ Clearing existing data...');
    
    // Clear existing data in proper order (children first)
    db.run('DELETE FROM implementations');
    db.run('DELETE FROM subcategories');
    db.run('DELETE FROM request_types');
    db.run('DELETE FROM ticket_categories');
    db.run('DELETE FROM dpss_sections');
    db.run('DELETE FROM dpss_divisions');
    db.run('DELETE FROM dpss_bureaus');
    db.run('DELETE FROM dpss_offices');

    // ==== TICKET CATEGORIES ====
    console.log('📂 Inserting main categories...');
    let categoryIndex = 0;
    Object.entries(mainCategories).forEach(([key, name]) => {
      db.run(
        `INSERT INTO ticket_categories (id, name, sort_order) VALUES (?, ?, ?)`,
        [key, name, categoryIndex++],
        function(err) {
          if (err) {
            console.error(`Error creating category ${name}:`, err);
          } else {
            console.log(`✅ Category: ${name}`);
          }
        }
      );
    });

    // Insert request types
    console.log('📋 Inserting request types...');
    Object.entries(requestTypes).forEach(([categoryKey, requests]) => {
      requests.forEach((request, index) => {
        db.run(
          `INSERT INTO request_types (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)`,
          [request.value, categoryKey, request.text, index],
          function(err) {
            if (err) {
              console.error(`Error creating request type ${request.text}:`, err);
            } else {
              console.log(`✅ Request Type: ${request.text} (${categoryKey})`);
            }
          }
        );
      });
    });

    // Insert subcategories
    console.log('📝 Inserting subcategories...');
    Object.entries(subcategories).forEach(([categoryKey, requestTypeGroups]) => {
      Object.entries(requestTypeGroups).forEach(([requestTypeKey, subs]) => {
        subs.forEach((sub, index) => {
          db.run(
            `INSERT INTO subcategories (id, request_type_id, name, sort_order) VALUES (?, ?, ?, ?)`,
            [sub.value, requestTypeKey, sub.text, index],
            function(err) {
              if (err) {
                console.error(`Error creating subcategory ${sub.text}:`, err);
              } else {
                console.log(`✅ Subcategory: ${sub.text} (${requestTypeKey})`);
              }
            }
          );
        });
      });
    });

    // ==== DPSS ORGANIZATIONAL DATA ====
    console.log('🏢 Inserting DPSS organizational data...');
    
    // Insert offices
    organizationalData.offices.forEach((office, index) => {
      const id = generateId(office);
      db.run(
        `INSERT INTO dpss_offices (id, name, sort_order) VALUES (?, ?, ?)`,
        [id, office, index],
        function(err) {
          if (err) {
            console.error(`Error creating office ${office}:`, err);
          } else {
            console.log(`✅ Office: ${office}`);
          }
        }
      );
    });

    // Insert bureaus
    organizationalData.bureaus.forEach((bureau, index) => {
      const id = generateId(bureau);
      db.run(
        `INSERT INTO dpss_bureaus (id, name, sort_order) VALUES (?, ?, ?)`,
        [id, bureau, index],
        function(err) {
          if (err) {
            console.error(`Error creating bureau ${bureau}:`, err);
          } else {
            console.log(`✅ Bureau: ${bureau}`);
          }
        }
      );
    });

    // Insert divisions
    organizationalData.divisions.forEach((division, index) => {
      const id = generateId(division);
      db.run(
        `INSERT INTO dpss_divisions (id, name, sort_order) VALUES (?, ?, ?)`,
        [id, division, index],
        function(err) {
          if (err) {
            console.error(`Error creating division ${division}:`, err);
          } else {
            console.log(`✅ Division: ${division}`);
          }
        }
      );
    });

    // Insert sections
    organizationalData.sections.forEach((section, index) => {
      const id = generateId(section);
      db.run(
        `INSERT INTO dpss_sections (id, name, sort_order) VALUES (?, ?, ?)`,
        [id, section, index],
        function(err) {
          if (err) {
            console.error(`Error creating section ${section}:`, err);
          } else {
            console.log(`✅ Section: ${section}`);
          }
        }
      );
    });

    console.log('🎉 Real ticket and organizational data migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   Categories: ${Object.keys(mainCategories).length}`);
    console.log(`   Request Types: ${Object.values(requestTypes).flat().length}`);
    console.log(`   Subcategories: ${Object.values(subcategories).reduce((total, category) => total + Object.values(category).flat().length, 0)}`);
    console.log(`   Offices: ${organizationalData.offices.length}`);
    console.log(`   Bureaus: ${organizationalData.bureaus.length}`);
    console.log(`   Divisions: ${organizationalData.divisions.length}`);
    console.log(`   Sections: ${organizationalData.sections.length}`);
    
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('📄 Database connection closed successfully');
      }
    });
  });
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});