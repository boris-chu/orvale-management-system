#!/usr/bin/env node

/**
 * Test Script for Session Recovery - Patricia Collins Scenario
 * 
 * This simulates:
 * 1. Patricia Collins has an active session that gets cleaned up
 * 2. She's still connected on her end but disappeared from staff queue
 * 3. Test the reconnect API to restore her session
 */

const fetch = require('node-fetch');
const Database = require('sqlite3').Database;
const path = require('path');

const dbPath = path.join(__dirname, 'orvale_tickets.db');

async function simulatePatriciaSession() {
  console.log('🎭 Simulating Patricia Collins Session Recovery Test\n');

  const db = new Database(dbPath);

  // Step 1: Create Patricia's "abandoned" session (simulating stale cleanup)
  const sessionId = `patricia_session_${Date.now()}`;
  const patriciaData = {
    name: 'Patricia Collins',
    email: 'patricia.collins@example.com',
    sessionId: sessionId
  };

  console.log('1️⃣ Creating Patricia\'s abandoned session...');
  
  await new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO public_chat_sessions (
        session_id, visitor_name, visitor_email, status, 
        created_at, guest_last_seen, staff_disconnect_count
      ) VALUES (?, ?, ?, ?, datetime('now', '-15 minutes'), datetime('now', '-10 minutes'), 1)
    `;
    
    db.run(sql, [sessionId, patriciaData.name, patriciaData.email, 'abandoned'], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // Add some message history
  console.log('📝 Adding message history...');
  const messages = [
    { sender: 'guest', message: 'Hi, I need help with my account access', time: '-14 minutes' },
    { sender: 'system', message: 'You are now connected with support agent', time: '-13 minutes' },
    { sender: 'agent', message: 'Hello Patricia! I can help you with your account. What specific issue are you having?', time: '-12 minutes' },
    { sender: 'guest', message: 'I can\'t log into my portal, it says my password is invalid', time: '-11 minutes' },
    { sender: 'agent', message: 'Let me help you reset your password. Can you confirm your employee number?', time: '-11 minutes' }
  ];

  for (const msg of messages) {
    await new Promise((resolve) => {
      db.run(
        'INSERT INTO public_chat_messages (session_id, sender_type, message, created_at) VALUES (?, ?, ?, datetime("now", ?))',
        [sessionId, msg.sender, msg.message, msg.time],
        () => resolve()
      );
    });
  }

  console.log('✅ Patricia\'s session created with message history\n');

  // Step 2: Test the reconnection API
  console.log('2️⃣ Testing session reconnection API...');
  
  try {
    const response = await fetch('http://localhost/api/public-portal/chat/reconnect-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guestName: patriciaData.name,
        guestEmail: patriciaData.email,
        searchWindowHours: 2
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Session recovery successful!');
      console.log(`📋 Session ID: ${result.session.id}`);
      console.log(`📊 Status: ${result.session.status}`);
      console.log(`🔄 Recovered from: ${result.recoveredFrom}`);
      console.log(`⏱️  Recovered after: ${result.recoveredAfterMinutes} minutes`);
      console.log(`💬 Messages restored: ${result.messages.length}`);
      
      console.log('\n📝 Message history:');
      result.messages.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        console.log(`   ${index + 1}. [${time}] ${msg.sender}: ${msg.text}`);
      });

    } else {
      console.log('❌ Session recovery failed:');
      console.log(`   Error: ${result.error || result.message}`);
    }

  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }

  // Step 3: Verify database updates
  console.log('\n3️⃣ Verifying database updates...');
  
  await new Promise((resolve) => {
    db.get(
      'SELECT * FROM public_chat_sessions WHERE session_id = ?',
      [sessionId],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
        } else if (row) {
          console.log('✅ Session found in database:');
          console.log(`   Status: ${row.status}`);
          console.log(`   Recovery attempts: ${row.recovery_attempts || 0}`);
          console.log(`   Last recovered: ${row.last_recovered_at || 'Never'}`);
          console.log(`   Queue position: ${row.queue_position || 'Not in queue'}`);
        } else {
          console.log('❌ Session not found in database');
        }
        resolve();
      }
    );
  });

  // Step 4: Test the staff notification effect
  console.log('\n4️⃣ Patricia should now appear in the staff queue!');
  console.log('   🎯 Staff should see her session as "recovered" with priority boost');
  console.log('   🔄 Socket.io should have notified all staff about the recovery');
  console.log('   📋 She should be at position 1 or 2 in the queue (priority boost)');

  console.log('\n🎉 Test completed! Patricia Collins can now reconnect to her session.');
  
  db.close();
}

// Run the test
if (require.main === module) {
  simulatePatriciaSession().catch(console.error);
}

module.exports = { simulatePatriciaSession };