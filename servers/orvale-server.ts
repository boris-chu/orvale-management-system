#!/usr/bin/env tsx

/**
 * Orvale Management System - Unified TypeScript Server
 *
 * This single server handles:
 * - HTTPS/HTTP web server with Next.js
 * - Socket.io real-time messaging
 * - SSL certificate management
 * - WebRTC signaling for audio/video calls
 * - User presence tracking
 * - Channel/room management
 *
 * Runs as Windows service with node-windows
 */

import https from 'https';
import http from 'http';
import next from 'next';
import fs from 'fs';
import path from 'path';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Database from 'sqlite3';
import type { NextApiRequest, NextApiResponse } from 'next';

// Extend Socket type to include custom properties
interface AuthenticatedSocket extends Socket {
  userId: string;
  userInfo: any;
}

// Import auto-SSL deployment
const AutoSSLDeployment = require('../deployment/auto-ssl-deployment');

// Configuration
const isDev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const httpPort = parseInt(process.env.HTTP_PORT || '80');
const httpsPort = parseInt(process.env.HTTPS_PORT || '443');
const socketPort = parseInt(process.env.SOCKET_PORT || '3001');
const jwtSecret = process.env.JWT_SECRET || 'orvale-management-system-secret-key-2025';

// SSL Certificate paths
const sslKeyPath = process.env.SSL_KEY_PATH || './deployment/ssl/private.key';
const sslCertPath = process.env.SSL_CERT_PATH || './deployment/ssl/certificate.crt';
const sslCAPath = process.env.SSL_CA_PATH || './deployment/ssl/ca-bundle.crt';
const sslPfxPath = process.env.SSL_PFX_PATH || './deployment/ssl/server.pfx';
const sslPfxPassword = process.env.SSL_PFX_PASSWORD || 'orvale2024';

// Database configuration
const dbPath = path.join(__dirname, '../database/orvale_tickets.db');

// Connection limits
const defaultMaxConnectionsPerUser = isDev ? 10 : 5;
const defaultMaxConnectionsPerIP = isDev ? 25 : 15;
const defaultMaxTotalConnections = isDev ? 500 : 200;

// Store active connections and presence
const connectedUsers = new Map<string, Set<string>>();
const connectedClients = new Map<string, any>();
const userPresence = new Map<string, { status: string; lastSeen: Date }>();

console.log('🚀 Starting Orvale Management System (TypeScript)...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Hostname: ${hostname}`);
console.log(`HTTP Port: ${httpPort}`);
console.log(`HTTPS Port: ${httpsPort}`);
console.log(`Socket Port: ${socketPort}`);

// Initialize Next.js app
const app = next({ dev: isDev, hostname, port: httpsPort });
const handle = app.getRequestHandler();

// Initialize Auto SSL Deployment
const autoSSL = new AutoSSLDeployment({
  serverIP: hostname,
  caFilePath: sslCAPath,
  enabled: process.env.AUTO_SSL_DEPLOY !== 'false'
});

// Utility functions
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

function validateSSLCertificates(): 'pfx' | 'pem' {
  // Check if PFX file exists first (preferred for Windows deployment)
  if (fs.existsSync(sslPfxPath)) {
    console.log('✅ SSL Certificate found (PFX format)');
    return 'pfx';
  }

  // Fall back to separate key/cert files
  const requiredFiles = [
    { path: sslKeyPath, name: 'Private Key' },
    { path: sslCertPath, name: 'Certificate' }
  ];

  const missingFiles: string[] = [];

  requiredFiles.forEach(file => {
    if (!fs.existsSync(file.path)) {
      missingFiles.push(`${file.name}: ${file.path}`);
    }
  });

  if (missingFiles.length > 0) {
    console.error('❌ SSL Certificate files missing:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\nPlease ensure SSL certificates are properly installed.');
    console.error('Run deployment\\powershell\\deploy-production.ps1 to generate certificates.');
    process.exit(1);
  }

  console.log('✅ SSL Certificate files found (PEM format)');
  return 'pem';
}

function createHTTPSOptions(): https.ServerOptions {
  const certFormat = validateSSLCertificates();

  let options: https.ServerOptions = {};

  if (certFormat === 'pfx') {
    // Use PFX certificate (Windows deployment)
    options = {
      pfx: fs.readFileSync(sslPfxPath),
      passphrase: sslPfxPassword
    };
    console.log('✅ PFX Certificate loaded');
  } else {
    // Use separate key/cert files (manual deployment)
    options = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };

    // Add CA bundle if available
    if (fs.existsSync(sslCAPath)) {
      options.ca = fs.readFileSync(sslCAPath);
      console.log('✅ CA Bundle loaded');
    }

    console.log('✅ PEM Certificates loaded');
  }

  return options;
}

// Socket.io authentication middleware
function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    (socket as AuthenticatedSocket).userId = decoded.username;
    (socket as AuthenticatedSocket).userInfo = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
}

// Database helper functions
function queryDB(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = new Database.Database(dbPath);
    db.get(sql, params, (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function queryAllDB(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const db = new Database.Database(dbPath);
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// HTTP to HTTPS redirect server
function createRedirectServer(): http.Server {
  const redirectServer = http.createServer((req, res) => {
    const clientIP = req.connection.remoteAddress?.replace('::ffff:', '');

    // Handle SSL error detection endpoint
    if (req.url === '/ssl-error-detected' || req.headers['x-ssl-error']) {
      console.log(`🔍 SSL error detected from ${clientIP} via HTTP fallback`);
      autoSSL.handleSSLError(clientIP, 'http_fallback');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(autoSSL.getSSLFixingPage(clientIP));
      return;
    }

    // Handle certificate download requests
    if (req.url === '/download-certificate') {
      if (fs.existsSync(sslCAPath)) {
        const cert = fs.readFileSync(sslCAPath);
        res.writeHead(200, {
          'Content-Type': 'application/x-x509-ca-cert',
          'Content-Disposition': 'attachment; filename="orvale-ca.crt"'
        });
        res.end(cert);
        return;
      }
    }

    // Handle installer download
    if (req.url === '/download-installer') {
      const installerScript = `
@echo off
echo Installing Orvale SSL Certificate...
echo.
powershell -Command "Invoke-WebRequest -Uri 'http://${hostname}/download-certificate' -OutFile 'orvale-ca.crt'; Import-Certificate -FilePath 'orvale-ca.crt' -CertStoreLocation 'Cert:\\LocalMachine\\Root'; Remove-Item 'orvale-ca.crt'"
echo.
echo ✅ Certificate installation completed!
echo You can now access https://${hostname} without warnings
echo.
pause
`;

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="install-orvale-certificate.bat"'
      });
      res.end(installerScript);
      return;
    }

    // Default redirect to HTTPS
    const httpsUrl = `https://${req.headers.host || hostname}${req.url}`;
    res.writeHead(301, {
      'Location': httpsUrl,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-SSL-Auto-Deploy': 'available'
    });
    res.end();
  });

  redirectServer.listen(httpPort, () => {
    console.log(`🔄 HTTP redirect server ready on http://${hostname}:${httpPort}`);
  });

  return redirectServer;
}

// Socket.io server setup
function setupSocketServer(httpsServer: https.Server): SocketServer {
  const io = new SocketServer(httpsServer, {
    cors: {
      origin: [`https://${hostname}`, `http://${hostname}`, 'http://localhost:3000'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket.io middleware
  io.use(authenticateSocket);

  // Socket.io connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    console.log(`👤 User ${userId} connected (${socket.id})`);

    // Track user connections
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);
    connectedClients.set(socket.id, { userId, socket });

    // Update user presence
    userPresence.set(userId, { status: 'online', lastSeen: new Date() });
    socket.broadcast.emit('presence_update', { userId, status: 'online' });

    // Handle chat events
    socket.on('send_message', async (data) => {
      try {
        const { channelId, message, messageType = 'text' } = data;

        // Insert message into database
        const db = new Database.Database(dbPath);
        const timestamp = new Date().toISOString();

        db.run(
          `INSERT INTO chat_messages (channel_id, user_id, message, message_type, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [channelId, userId, message, messageType, timestamp],
          function(err) {
            if (err) {
              console.error('Error saving message:', err);
              socket.emit('message_error', { error: 'Failed to save message' });
              return;
            }

            // Broadcast message to channel members
            const messageData = {
              id: this.lastID,
              channelId,
              userId,
              message,
              messageType,
              timestamp,
              username: socket.userInfo.display_name || userId
            };

            io.to(`channel_${channelId}`).emit('message_received', messageData);
          }
        );

        db.close();
      } catch (error) {
        console.error('Error handling send_message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle channel joining
    socket.on('join_channel', async (channelId) => {
      try {
        socket.join(`channel_${channelId}`);
        socket.emit('channel_joined', { channelId });

        // Notify other users in channel
        socket.to(`channel_${channelId}`).emit('user_joined_channel', {
          userId,
          channelId,
          username: socket.userInfo.display_name || userId
        });
      } catch (error) {
        console.error('Error joining channel:', error);
      }
    });

    // Handle channel leaving
    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel_${channelId}`);
      socket.to(`channel_${channelId}`).emit('user_left_channel', {
        userId,
        channelId,
        username: socket.userInfo.display_name || userId
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`channel_${data.channelId}`).emit('typing_start', {
        userId,
        channelId: data.channelId,
        username: socket.userInfo.display_name || userId
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`channel_${data.channelId}`).emit('typing_stop', {
        userId,
        channelId: data.channelId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`👤 User ${userId} disconnected (${socket.id})`);

      // Remove from tracking
      const userConnections = connectedUsers.get(userId);
      if (userConnections) {
        userConnections.delete(socket.id);
        if (userConnections.size === 0) {
          connectedUsers.delete(userId);
          userPresence.set(userId, { status: 'offline', lastSeen: new Date() });
          socket.broadcast.emit('presence_update', { userId, status: 'offline' });
        }
      }
      connectedClients.delete(socket.id);
    });
  });

  return io;
}

// Main server startup function
async function startServer(): Promise<void> {
  try {
    // Prepare Next.js app
    console.log('⚡ Preparing Next.js application...');
    await app.prepare();

    // Create HTTPS options (this also validates certificates)
    const httpsOptions = createHTTPSOptions();

    // Create HTTPS server
    const httpsServer = https.createServer(httpsOptions, (req, res) => {
      // Add security headers
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      return handle(req, res);
    });

    // Setup Socket.io server on the same HTTPS server
    const io = setupSocketServer(httpsServer);

    // Start HTTPS server
    httpsServer.listen(httpsPort, () => {
      console.log(`🔒 HTTPS server ready on https://${hostname}:${httpsPort}`);
      console.log(`💬 Socket.io server ready on wss://${hostname}:${httpsPort}/socket.io/`);
    });

    // Create HTTP redirect server
    createRedirectServer();

    // Start SSL auto-deployment monitoring
    autoSSL.startMonitoring();

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('🛑 Shutting down gracefully...');
      autoSSL.stop();
      io.close(() => {
        httpsServer.close(() => {
          console.log('✅ Server closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    console.log('🎉 Orvale Management System started successfully!');
    console.log(`📱 Access your application at: https://${hostname}`);
    console.log(`💬 Socket.io endpoint: wss://${hostname}/socket.io/`);

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default startServer;