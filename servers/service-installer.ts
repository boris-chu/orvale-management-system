#!/usr/bin/env tsx

/**
 * Windows Service Installer for Orvale Management System
 *
 * This script installs/uninstalls the Orvale server as a Windows service
 * using node-windows package with tsx TypeScript execution.
 */

import { Service } from 'node-windows';
import path from 'path';

// Service configuration
const serviceName = 'OrvaleManagementSystem';
const serviceDescription = 'Orvale Management System - Unified platform for tickets, projects, communication, and analytics';
const scriptPath = path.join(__dirname, 'orvale-server.ts');
const nodeArgs = ['--loader', 'tsx']; // Use tsx loader for TypeScript execution

// Create service instance
const svc = new Service({
  name: serviceName,
  description: serviceDescription,
  script: scriptPath,
  nodeOptions: nodeArgs,
  env: {
    name: 'NODE_ENV',
    value: 'production'
  },
  // Restart policy
  maxRestarts: 5,
  maxRetries: 3,
  wait: 2,
  grow: 0.5,
  abortOnError: false
});

// Get command from arguments
const command = process.argv[2];

if (!command) {
  console.log('Usage: tsx service-installer.ts [install|uninstall|start|stop|restart|status]');
  process.exit(1);
}

switch (command.toLowerCase()) {
  case 'install':
    console.log(`🔧 Installing ${serviceName} as Windows service...`);
    console.log(`Script: ${scriptPath}`);
    console.log(`Node Args: ${nodeArgs.join(' ')}`);

    svc.on('install', () => {
      console.log(`✅ ${serviceName} installed successfully!`);
      console.log('Starting service...');
      svc.start();
    });

    svc.on('alreadyinstalled', () => {
      console.log(`⚠️  ${serviceName} is already installed.`);
      console.log('Use "npm run service:uninstall" to remove it first.');
    });

    svc.on('start', () => {
      console.log(`🚀 ${serviceName} started successfully!`);
      console.log('Service is now running in the background.');
      console.log('');
      console.log('🎯 Access points:');
      console.log('  • Main application: https://localhost');
      console.log('  • Service management: services.msc');
      console.log('');
      console.log('💡 Management commands:');
      console.log('  • npm run service:stop');
      console.log('  • npm run service:start');
      console.log('  • npm run service:restart');
      console.log('  • npm run service:uninstall');
    });

    svc.on('error', (err) => {
      console.error(`❌ Installation failed:`, err);
    });

    svc.install();
    break;

  case 'uninstall':
    console.log(`🗑️  Uninstalling ${serviceName}...`);

    svc.on('uninstall', () => {
      console.log(`✅ ${serviceName} uninstalled successfully!`);
    });

    svc.on('doesnotexist', () => {
      console.log(`⚠️  ${serviceName} is not installed.`);
    });

    svc.on('error', (err) => {
      console.error(`❌ Uninstallation failed:`, err);
    });

    svc.uninstall();
    break;

  case 'start':
    console.log(`▶️  Starting ${serviceName}...`);

    svc.on('start', () => {
      console.log(`✅ ${serviceName} started successfully!`);
      console.log('Access the application at: https://localhost');
    });

    svc.on('error', (err) => {
      console.error(`❌ Start failed:`, err);
    });

    svc.start();
    break;

  case 'stop':
    console.log(`⏹️  Stopping ${serviceName}...`);

    svc.on('stop', () => {
      console.log(`✅ ${serviceName} stopped successfully!`);
    });

    svc.on('error', (err) => {
      console.error(`❌ Stop failed:`, err);
    });

    svc.stop();
    break;

  case 'restart':
    console.log(`🔄 Restarting ${serviceName}...`);

    svc.on('stop', () => {
      console.log('Service stopped. Starting again...');
      setTimeout(() => {
        svc.start();
      }, 2000);
    });

    svc.on('start', () => {
      console.log(`✅ ${serviceName} restarted successfully!`);
    });

    svc.on('error', (err) => {
      console.error(`❌ Restart failed:`, err);
    });

    svc.stop();
    break;

  case 'status':
    // Note: node-windows doesn't have built-in status check
    // This is a workaround using Windows SC command
    const { exec } = require('child_process');

    exec(`sc query "${serviceName}"`, (error, stdout, stderr) => {
      if (error) {
        if (error.message.includes('The specified service does not exist')) {
          console.log(`❌ ${serviceName} is not installed.`);
        } else {
          console.error('Error checking service status:', error.message);
        }
        return;
      }

      if (stdout.includes('RUNNING')) {
        console.log(`✅ ${serviceName} is running.`);
        console.log('Access the application at: https://localhost');
      } else if (stdout.includes('STOPPED')) {
        console.log(`⏹️  ${serviceName} is stopped.`);
        console.log('Use "npm run service:start" to start it.');
      } else {
        console.log(`🔍 ${serviceName} status:`, stdout);
      }
    });
    break;

  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Available commands: install, uninstall, start, stop, restart, status');
    process.exit(1);
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});