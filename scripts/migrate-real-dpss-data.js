const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Migrating real DPSS organizational data...');

// Real DPSS organizational data from config file
const realDpssData = {
  offices: [
    'Bureau of Human Resources',
    'Crossroads East',
    'Crossroads Main',
    'Crossroads West',
    'DPSS Academy',
    'Fiscal Management Division',
    'Fiscal Operations Division',
    'IHSS Crossroads',
    'Line Operation Division'
  ],
  bureaus: [
    'Bureau of Administrative Services',
    'Bureau of Customer Service Centers',
    'Bureau of Human Resources',
    'Bureau of Program & Policy',
    'Bureau of Special Operations',
    'Bureau of Technology Services',
    'Bureau of Workforce Services North',
    'Bureau of Workforce Services South',
    'DPSS Administration'
  ],
  divisions: [
    'AACES Division',
    'BAS Administration',
    'BPP Administration',
    'BSO Administration',
    'BWS North Administration',
    'BWS South Administration',
    'Bureau of Customer Service Centers Division',
    'Bureau of Human Resources Administration',
    'Bureau of Technology Services Administration',
    'CalWORKs & GAIN Program Division',
    'Chief Deputy Director',
    'Chief of Operations',
    'Communications & Project Management Division',
    'Contract Administration and Monitoring Division',
    'Contract Development Division',
    'Customer Service Center Division I',
    'Customer Service Center Division II',
    'Customer Service Center Division III',
    'Department Administration',
    'Financial Management Division',
    'Fiscal Operations Division',
    'General Relief & CalFresh Program Division',
    'General Services Division',
    'Human Capital Management Branch',
    'Human Relations Management Branch',
    'IHSS Operations Division',
    'Information Technology Services Division',
    'Medi-Cal / IHSS Program Division',
    'North Division I',
    'North Division II',
    'North Division III',
    'Program Compliance Division',
    'Research, Evaluation & Quality Assurance Division',
    'South Division I',
    'South Division II',
    'South Division III',
    'Special Assistant/Board Liaison',
    'Workforce Safety Leave & Disability Comp Branch'
  ],
  sections: [
    'Automation and Release Management',
    'BAS Administration Section',
    'BPP Administration Section',
    'BSO Administration Section',
    'BTS Administration',
    'BWS North Administration Section',
    'BWS South Administration Section',
    'Budget Planning & Control',
    'Budget Policy',
    'Benefit Recovery Accounting',
    'Bureau of Customer Service Centers Division Admin',
    'CalFresh Program Section I',
    'CalFresh Program Section II',
    'CalSAWs Project',
    'CalWORKs & GAIN Program Division Administration',
    'CalWORKs Program Section',
    'Chief Deputy Director Administration',
    'Chief of Operations Administration',
    'Child Care Program Section',
    'Civic Center',
    'Civil Rights',
    'Communications & Project Management Division Admin',
    'Communications Section',
    'Contract Administration and Monitoring Division Admin',
    'Contract Development Division Administration',
    'Cost Accounting & Revenue Management',
    'Contracts I',
    'Contracts II',
    'Contracts III',
    'Contracts IV',
    'Contracts V',
    'Contracts VI',
    'Customer Service Center Division I Administration',
    'Customer Service Center Division II Administration',
    'Customer Service Center Division III Administration',
    'Customer Service Center I - El Monte',
    'Customer Service Center II - La Cienega',
    'Customer Service Center IV',
    'Customer Service Center V',
    'Customer Service Center VI',
    'Customer Service Center VII',
    'Customer Service Center VIII',
    'DPSS Academy',
    'DPSS Administration Section',
    'DPSSTATS Section',
    'Discipline Policy and Litigation',
    'East Valley',
    'Emergency Safety and Security',
    'Field Technical Support',
    'Financial Management Division Administration',
    'Financial Special Projects and Revenue Management',
    'Fiscal Compliance',
    'Fiscal Intergrity & Compliance',
    'Fiscal Operations Division Administration',
    'Fund Management',
    'General Accounting',
    'GAIN Program Policy Section I',
    'GAIN Program Policy Section II',
    'GAIN Program Policy Section III',
    'GAIN Region III Pomona, sub',
    'GAIN Region III San Gabriel Valley Main',
    'GR & CF Division Administration',
    'GR Special Projects & SSI Advocacy Section',
    'GROW Program Section',
    'General Relief & CAPI Section',
    'General Services Division Administration',
    'Governmental Inquiry & Response',
    'HR Operations',
    'Health Care Reform Section',
    'Homeless Services Section',
    'Human Capital Management Administration',
    'Human Relations Management Administration',
    'Human Resources Administration Section',
    'IHSS Operations Division Administration',
    'IHSS Call Center Main - Industry',
    'IHSS Ops I Chatsworth',
    'IHSS Program',
    'Information Technology Security',
    'Intergovernmental Relations and CSBG Section',
    'Internal Affairs & Employee Relations',
    'Leave Management and Disability Compliance',
    'Line Operations and Integrated Services',
    'Long-Term LOA Section',
    'Management and Research Services',
    'Medi-Cal Program Section',
    'Medi-Cal LTC',
    'Medi-Cal/IHSS Program Division Administration',
    'Metro East',
    'North Division I Administration',
    'North Division II Administration',
    'North Division III Administration',
    'Norwalk',
    'Office Management',
    'PCD Line Operations Support',
    'Pomona',
    'Program Compliance Division Administration',
    'Project Management Office',
    'Property Management',
    'Recruitment & Position Management',
    'Renewal Line I',
    'Research, Evaluation & Quality Assurance Div Admin',
    'Security & Storage Management',
    'South Division I Administration',
    'South Division II Administration',
    'South Division III Administration',
    'South Family',
    'Special Asistant/Board Liaison Administration',
    'Technical Support',
    'Telecommunication & Electronic Document Management',
    'Warehouse Logistics & Asset Management',
    'Workforce Safety Leave & Disability Comp Admin'
  ]
};

// Helper function to generate ID from name
const generateId = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
};

db.serialize(() => {
  // Clear existing data
  console.log('🗑️ Clearing existing DPSS organizational data...');
  db.run('DELETE FROM dpss_sections');
  db.run('DELETE FROM dpss_divisions');
  db.run('DELETE FROM dpss_bureaus');
  db.run('DELETE FROM dpss_offices');

  // Insert real offices
  console.log('📍 Inserting offices...');
  realDpssData.offices.forEach((office, index) => {
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

  // Insert real bureaus
  console.log('🏢 Inserting bureaus...');
  realDpssData.bureaus.forEach((bureau, index) => {
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

  // Insert real divisions
  console.log('📋 Inserting divisions...');
  realDpssData.divisions.forEach((division, index) => {
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

  // Insert real sections (these are what appear in ticket forms)
  console.log('📝 Inserting sections...');
  realDpssData.sections.forEach((section, index) => {
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

  console.log('🎉 Real DPSS organizational data migration completed!');
  console.log(`📊 Summary: ${realDpssData.offices.length} offices, ${realDpssData.bureaus.length} bureaus, ${realDpssData.divisions.length} divisions, ${realDpssData.sections.length} sections`);
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📄 Database connection closed successfully');
    }
  });
});