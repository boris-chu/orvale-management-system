#!/usr/bin/env npx tsx
import Database from 'better-sqlite3';
import { join } from 'path';

interface TableInfo {
  name: string;
  rowCount: number;
  columns: string[];
}

interface RoleInfo {
  id: string;
  name: string;
  permissions: string[];
  userCount: number;
}

interface TeamInfo {
  id: number;
  name: string;
  active: boolean;
  ticketCount: number;
}

interface CategoryInfo {
  id: number;
  name: string;
  requestTypeCount: number;
}

// Initialize database
const dbPath = join(process.cwd(), 'orvale_tickets.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n🔍 Orvale Management System - Database Structure Check\n');
console.log('=' .repeat(80));

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];

console.log(`\n📊 Total Tables: ${tables.length}\n`);

// Analyze each table
const tableInfo: TableInfo[] = [];

for (const table of tables) {
  // Get row count
  const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
  
  // Get columns
  const columnsInfo = db.prepare(`PRAGMA table_info(${table.name})`).all() as { name: string }[];
  const columns = columnsInfo.map(col => col.name);
  
  tableInfo.push({
    name: table.name,
    rowCount: countResult.count,
    columns
  });
}

// Group tables by category
const authTables = ['users', 'roles', 'role_permissions'];
const ticketTables = ['user_tickets', 'ticket_history', 'ticket_history_detailed', 'ticket_sequences', 'ticket_comments', 'ticket_comment_read_status'];
const orgTables = ['dpss_offices', 'dpss_bureaus', 'dpss_divisions', 'dpss_sections', 'sections', 'ticket_categories', 'request_types', 'subcategories', 'implementations'];
const teamTables = ['teams', 'support_teams', 'support_team_groups', 'helpdesk_team_preferences'];
const configTables = ['portal_settings', 'system_settings', 'system_settings_audit', 'theme_settings', 'theme_presets', 'public_portal_config', 'recovery_requests', 'widget_positions'];
const chatTables = ['chat_channels', 'channel_members', 'chat_messages', 'message_read_status', 'channel_typing_status', 'message_attachments', 'pinned_messages', 'call_logs'];
const systemTables = ['backup_log', 'staff_work_modes'];

// Display tables by category
console.log('\n🔐 Authentication & Authorization Tables:');
displayTables(authTables);

console.log('\n📋 Ticket Management Tables:');
displayTables(ticketTables);

console.log('\n🏢 Organization Structure Tables:');
displayTables(orgTables);

console.log('\n👥 Team Management Tables:');
displayTables(teamTables);

console.log('\n⚙️ Configuration Tables:');
displayTables(configTables);

console.log('\n💬 Chat System Tables:');
displayTables(chatTables);

console.log('\n🔧 System Tables:');
displayTables(systemTables);

function displayTables(tableNames: string[]) {
  for (const tableName of tableNames) {
    const info = tableInfo.find(t => t.name === tableName);
    if (info) {
      console.log(`  • ${info.name} (${info.rowCount} rows) - ${info.columns.length} columns`);
    }
  }
}

// Analyze roles and permissions
console.log('\n👤 Roles & Permissions Analysis:');
console.log('-'.repeat(80));

const roles = db.prepare('SELECT * FROM roles').all() as { id: string; name: string }[];

for (const role of roles) {
  const roleId = role.id;
  
  // Get user count for this role
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(roleId) as { count: number };
  
  // Get all permissions for the role
  const permissions = db.prepare(`
    SELECT permission_id as permission 
    FROM role_permissions 
    WHERE role_id = ?
  `).all(roleId) as { permission: string }[];
  
  console.log(`\n📌 ${role.name.toUpperCase()} Role:`);
  console.log(`   Users: ${userCount.count}`);
  console.log(`   Permissions: ${permissions.length}`);
  
  // Group permissions by category
  const permissionCategories: { [key: string]: string[] } = {};
  permissions.forEach(p => {
    const category = p.permission.split('.')[0];
    if (!permissionCategories[category]) {
      permissionCategories[category] = [];
    }
    permissionCategories[category].push(p.permission);
  });
  
  for (const [category, perms] of Object.entries(permissionCategories)) {
    console.log(`   ${category}: ${perms.length} permissions`);
  }
}

// Get total unique permissions
const allPermissions = db.prepare('SELECT DISTINCT permission_id FROM role_permissions').all() as { permission_id: string }[];
console.log(`\n📊 Total Unique Permissions: ${allPermissions.length}`);

// Analyze teams
console.log('\n\n🏢 Team Analysis:');
console.log('-'.repeat(80));

const teams = db.prepare('SELECT * FROM teams WHERE active = 1').all() as { id: number; name: string; active: boolean }[];

console.log(`\nInternal Teams (${teams.length} active):`);
for (const team of teams) {
  // Get ticket count for this team
  const ticketCount = db.prepare('SELECT COUNT(*) as count FROM user_tickets WHERE assigned_team = ?').get(team.id) as { count: number };
  console.log(`  • ${team.name}: ${ticketCount.count} tickets`);
}

// Analyze support teams
const supportTeams = db.prepare('SELECT * FROM support_teams WHERE active = 1').all() as { id: number; name: string; label: string }[];
console.log(`\nPublic Portal Teams (${supportTeams.length} active):`);
for (const team of supportTeams) {
  console.log(`  • ${team.label} (${team.name})`);
}

// Analyze ticket categories
console.log('\n\n📂 Ticket Categories:');
console.log('-'.repeat(80));

const categories = db.prepare('SELECT * FROM ticket_categories').all() as { id: number; name: string }[];
for (const category of categories) {
  // Get request type count
  const rtCount = db.prepare('SELECT COUNT(*) as count FROM request_types WHERE category_id = ?').get(category.id) as { count: number };
  console.log(`  • ${category.name}: ${rtCount.count} request types`);
}

// Check for any orphaned tables
const knownTables = [
  ...authTables, ...ticketTables, ...orgTables, ...teamTables, 
  ...configTables, ...chatTables, ...systemTables
];
const orphanedTables = tables.filter(t => !knownTables.includes(t.name));

if (orphanedTables.length > 0) {
  console.log('\n\n⚠️ Unknown/Orphaned Tables:');
  console.log('-'.repeat(80));
  for (const table of orphanedTables) {
    const info = tableInfo.find(t => t.name === table.name);
    if (info) {
      console.log(`  • ${info.name} (${info.rowCount} rows)`);
    }
  }
}

// Recent activity check
console.log('\n\n📈 Recent Activity:');
console.log('-'.repeat(80));

// Recent tickets
const recentTickets = db.prepare(`
  SELECT COUNT(*) as count 
  FROM user_tickets 
  WHERE created_date > datetime('now', '-7 days')
`).get() as { count: number };
console.log(`  • Tickets created in last 7 days: ${recentTickets.count}`);

// Recent logins
const recentLogins = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE last_login > datetime('now', '-7 days')
`).get() as { count: number };
console.log(`  • Users logged in last 7 days: ${recentLogins.count}`);

// Chat activity if chat tables exist
try {
  const recentMessages = db.prepare(`
    SELECT COUNT(*) as count 
    FROM chat_messages 
    WHERE created_at > datetime('now', '-7 days')
  `).get() as { count: number };
  console.log(`  • Chat messages in last 7 days: ${recentMessages.count}`);
} catch (e) {
  console.log(`  • Chat system: Not yet active`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ Database structure check complete!\n');

db.close();