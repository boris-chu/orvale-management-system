#!/usr/bin/env node

/**
 * Socket.io + Next.js 15 Compatibility Test
 * Tests Socket.io server connectivity and basic functionality
 */

const { io } = require('socket.io-client');

// Node.js 18+ has built-in fetch

console.log('🧪 Starting Socket.io + Next.js 15 Compatibility Test');
console.log('=' .repeat(60));

// Test configuration
const SOCKET_URL = 'http://localhost:4000';
const TEST_TOKEN = 'test-token-for-compatibility';
const TESTS = [];

// Test result tracking
let passedTests = 0;
let failedTests = 0;

function addTest(name, testFn) {
  TESTS.push({ name, testFn });
}

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
  if (passed) passedTests++;
  else failedTests++;
}

// Test 1: Socket.io Server Health Check
addTest('Socket.io Server Health Check', async () => {
  try {
    const response = await fetch(`${SOCKET_URL}/health`);
    const data = await response.json();
    const isHealthy = response.ok && data.status === 'healthy';
    logTest('Socket.io Server Health Check', isHealthy, 
      isHealthy ? `Status: ${data.status}, Uptime: ${Math.round(data.uptime)}s` : 'Server unhealthy');
    return isHealthy;
  } catch (error) {
    logTest('Socket.io Server Health Check', false, `Error: ${error.message}`);
    return false;
  }
});

// Test 2: Socket.io Connection Test  
addTest('Socket.io Connection', () => {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: TEST_TOKEN },
      timeout: 5000,
      transports: ['websocket', 'polling']
    });

    let connected = false;
    
    const cleanup = () => {
      socket.disconnect();
      resolve(connected);
    };

    socket.on('connect', () => {
      connected = true;
      logTest('Socket.io Connection', true, `Connected with ID: ${socket.id}`);
      cleanup();
    });

    socket.on('connect_error', (error) => {
      logTest('Socket.io Connection', false, `Connection error: ${error.message}`);
      cleanup();
    });

    // Timeout fallback
    setTimeout(() => {
      if (!connected) {
        logTest('Socket.io Connection', false, 'Connection timeout after 5s');
        cleanup();
      }
    }, 5000);
  });
});

// Test 3: WebSocket Transport Test
addTest('WebSocket Transport', () => {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: TEST_TOKEN },
      timeout: 5000,
      transports: ['websocket'] // Force WebSocket only
    });

    let connected = false;
    
    const cleanup = () => {
      socket.disconnect();
      resolve(connected);
    };

    socket.on('connect', () => {
      connected = true;
      const transport = socket.io.engine.transport.name;
      logTest('WebSocket Transport', transport === 'websocket', 
        `Transport: ${transport}`);
      cleanup();
    });

    socket.on('connect_error', (error) => {
      logTest('WebSocket Transport', false, `WebSocket failed: ${error.message}`);
      cleanup();
    });

    setTimeout(cleanup, 5000);
  });
});

// Test 4: Polling Transport Fallback
addTest('Polling Transport Fallback', () => {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: TEST_TOKEN },
      timeout: 5000,
      transports: ['polling'] // Force polling only
    });

    let connected = false;
    
    const cleanup = () => {
      socket.disconnect();
      resolve(connected);
    };

    socket.on('connect', () => {
      connected = true;
      const transport = socket.io.engine.transport.name;
      logTest('Polling Transport Fallback', transport === 'polling', 
        `Transport: ${transport}`);
      cleanup();
    });

    socket.on('connect_error', (error) => {
      logTest('Polling Transport Fallback', false, `Polling failed: ${error.message}`);
      cleanup();
    });

    setTimeout(cleanup, 5000);
  });
});

// Test 5: Message Echo Test
addTest('Message Echo', () => {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: TEST_TOKEN },
      timeout: 5000
    });

    let messageReceived = false;
    const testMessage = { test: 'compatibility-check', timestamp: Date.now() };
    
    const cleanup = () => {
      socket.disconnect();
      resolve(messageReceived);
    };

    socket.on('connect', () => {
      // Send test message
      socket.emit('message', testMessage);
    });

    socket.on('message', (data) => {
      if (data.test === 'compatibility-check') {
        messageReceived = true;
        logTest('Message Echo', true, 'Message round-trip successful');
        cleanup();
      }
    });

    socket.on('connect_error', (error) => {
      logTest('Message Echo', false, `Connection error: ${error.message}`);
      cleanup();
    });

    // Timeout
    setTimeout(() => {
      if (!messageReceived) {
        logTest('Message Echo', false, 'No echo response after 8s');
        cleanup();
      }
    }, 8000);
  });
});

// Test 6: Auto-reconnection Test
addTest('Auto-reconnection', () => {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      auth: { token: TEST_TOKEN },
      timeout: 3000,
      reconnection: true,
      reconnectionAttempts: 2,
      reconnectionDelay: 500
    });

    let reconnected = false;
    let initialConnection = false;
    
    const cleanup = () => {
      socket.disconnect();
      resolve(reconnected);
    };

    socket.on('connect', () => {
      if (!initialConnection) {
        initialConnection = true;
        // Simulate connection loss by forcing disconnect
        setTimeout(() => {
          socket.io.engine.close();
        }, 500);
      } else {
        reconnected = true;
        logTest('Auto-reconnection', true, 'Reconnection successful');
        cleanup();
      }
    });

    socket.on('reconnect', () => {
      reconnected = true;
      logTest('Auto-reconnection', true, 'Automatic reconnection worked');
      cleanup();
    });

    socket.on('reconnect_failed', () => {
      logTest('Auto-reconnection', false, 'Reconnection failed after attempts');
      cleanup();
    });

    // Timeout
    setTimeout(() => {
      if (!reconnected) {
        logTest('Auto-reconnection', false, 'Reconnection timeout');
        cleanup();
      }
    }, 10000);
  });
});

// Run all tests
async function runTests() {
  console.log(`\n🔄 Running ${TESTS.length} compatibility tests...\n`);
  
  for (const test of TESTS) {
    try {
      await test.testFn();
    } catch (error) {
      logTest(test.name, false, `Exception: ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  const isCompatible = passedTests >= 4; // At least 4 out of 6 tests should pass
  console.log(`\n🎯 Socket.io + Next.js 15 Compatibility: ${isCompatible ? '✅ COMPATIBLE' : '❌ ISSUES DETECTED'}`);
  
  if (isCompatible) {
    console.log('\n🎉 Socket.io server is compatible with Next.js 15!');
    console.log('   RealTimeProvider can safely use Socket.io as preferred connection method.');
  } else {
    console.log('\n⚠️  Socket.io compatibility issues detected.');
    console.log('   RealTimeProvider will fall back to SSE polling mode.');
  }
  
  process.exit(isCompatible ? 0 : 1);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test terminated');
  process.exit(1);
});

// Start tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});