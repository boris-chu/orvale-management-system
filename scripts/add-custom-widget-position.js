#!/usr/bin/env node

/**
 * Add Custom Widget Position Columns
 * Adds widget_position_x and widget_position_y columns to support free-floating widget
 * Run: node scripts/add-custom-widget-position.js
 */

const Database = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new Database.Database(dbPath);

console.log('🎯 Adding Custom Widget Position Support...\n');

async function addCustomPositionColumns() {
  try {
    console.log('📋 Adding custom position columns to database...\n');
    
    // Add widget_position_x column
    await new Promise((resolve, reject) => {
      db.run(
        'ALTER TABLE public_portal_widget_settings ADD COLUMN widget_position_x INTEGER DEFAULT 0',
        (err) => {
          if (err && !err.message.includes('duplicate column')) {
            reject(err);
          } else if (err && err.message.includes('duplicate column')) {
            console.log('⏭️  Column widget_position_x already exists');
            resolve();
          } else {
            console.log('✅ Added widget_position_x column');
            resolve();
          }
        }
      );
    });
    
    // Add widget_position_y column
    await new Promise((resolve, reject) => {
      db.run(
        'ALTER TABLE public_portal_widget_settings ADD COLUMN widget_position_y INTEGER DEFAULT 0',
        (err) => {
          if (err && !err.message.includes('duplicate column')) {
            reject(err);
          } else if (err && err.message.includes('duplicate column')) {
            console.log('⏭️  Column widget_position_y already exists');
            resolve();
          } else {
            console.log('✅ Added widget_position_y column');
            resolve();
          }
        }
      );
    });
    
    // Update existing settings to have default values
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE public_portal_widget_settings 
         SET widget_position_x = 100, widget_position_y = 100 
         WHERE widget_position_x IS NULL OR widget_position_y IS NULL`,
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Updated ${this.changes} existing records with default positions`);
            resolve();
          }
        }
      );
    });
    
    console.log('\n🎉 Custom widget positioning added successfully!');
    console.log('\n📊 New Features Available:');
    console.log('   • Free-floating widget positioning anywhere on screen');
    console.log('   • Drag-and-drop repositioning for visitors');
    console.log('   • Admin-defined initial positions');
    console.log('   • Automatic position persistence in browser');
    console.log('   • Viewport-constrained dragging');
    
  } catch (error) {
    console.error('\n💥 Error adding custom position support:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

addCustomPositionColumns();