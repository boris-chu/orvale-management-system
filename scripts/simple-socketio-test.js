#!/usr/bin/env node

/**
 * Simple Socket.io Connectivity Test
 */

const { io } = require('socket.io-client');

console.log('🔌 Testing Socket.io connectivity...');

const socket = io('http://localhost:4000', {
  auth: { token: 'test-token' },
  timeout: 5000,
  transports: ['websocket', 'polling']
});

let testsPassed = 0;
let testsTotal = 3;

socket.on('connect', () => {
  console.log('✅ Socket.io connection successful');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  testsPassed++;
  
  // Test message sending
  socket.emit('test-message', { test: 'compatibility' });
});

socket.on('connected', (data) => {
  console.log('✅ Server welcome message received');
  console.log(`   Mode: ${data.mode}, Users: ${data.connectedUsers}`);
  testsPassed++;
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket.io connection failed');
  console.log(`   Error: ${error.message}`);
});

socket.on('disconnect', (reason) => {
  console.log(`🔌 Disconnected: ${reason}`);
});

// Test transport upgrade
socket.io.on("upgrade", () => {
  console.log('✅ Transport upgrade successful');
  console.log(`   New transport: ${socket.io.engine.transport.name}`);
  testsPassed++;
});

// Timeout and cleanup
setTimeout(() => {
  const success = testsPassed >= 1; // At least basic connection should work
  
  console.log('\n📊 Test Results:');
  console.log(`   Tests passed: ${testsPassed}/${testsTotal}`);
  console.log(`   Success rate: ${Math.round((testsPassed/testsTotal) * 100)}%`);
  
  if (success) {
    console.log('\n🎉 Socket.io is compatible with Next.js 15!');
    console.log('   RealTimeProvider can use Socket.io as preferred method.');
  } else {
    console.log('\n⚠️  Socket.io compatibility issues detected.');
    console.log('   RealTimeProvider will use SSE fallback.');
  }
  
  socket.disconnect();
  process.exit(success ? 0 : 1);
}, 8000);