#!/usr/bin/env node

/**
 * HTTPS Server for Orvale Management System
 * 
 * This creates an HTTPS server that wraps the Next.js application
 * with SSL/TLS support using certificates from the file system.
 */

const https = require('https');
const http = require('http');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const httpPort = process.env.HTTP_PORT || 80;
const httpsPort = process.env.HTTPS_PORT || 443;

// SSL Certificate paths
const sslKeyPath = process.env.SSL_KEY_PATH || './ssl/private.key';
const sslCertPath = process.env.SSL_CERT_PATH || './ssl/certificate.crt';
const sslCAPath = process.env.SSL_CA_PATH || './ssl/ca-bundle.crt';

console.log('🚀 Starting Orvale Management System with HTTPS...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Hostname: ${hostname}`);
console.log(`HTTP Port: ${httpPort}`);
console.log(`HTTPS Port: ${httpsPort}`);

// Initialize Next.js app
const app = next({ dev, hostname, port: httpsPort });
const handle = app.getRequestHandler();

// SSL Certificate validation
function validateSSLCertificates() {
  const requiredFiles = [
    { path: sslKeyPath, name: 'Private Key' },
    { path: sslCertPath, name: 'Certificate' }
  ];

  const missingFiles = [];

  requiredFiles.forEach(file => {
    if (!fs.existsSync(file.path)) {
      missingFiles.push(`${file.name}: ${file.path}`);
    }
  });

  if (missingFiles.length > 0) {
    console.error('❌ SSL Certificate files missing:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\nPlease ensure SSL certificates are properly installed.');
    console.error('Run ssl-certificate-setup.ps1 to generate certificates.');
    process.exit(1);
  }

  console.log('✅ SSL Certificate files found');
  return true;
}

// Create HTTPS options
function createHTTPSOptions() {
  const options = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath)
  };

  // Add CA bundle if available
  if (fs.existsSync(sslCAPath)) {
    options.ca = fs.readFileSync(sslCAPath);
    console.log('✅ CA Bundle loaded');
  }

  return options;
}

// HTTP to HTTPS redirect server
function createRedirectServer() {
  const redirectServer = http.createServer((req, res) => {
    // Handle Let's Encrypt challenges (if using Let's Encrypt)
    if (req.url && req.url.startsWith('/.well-known/acme-challenge/')) {
      // Serve ACME challenge files from webroot
      const challengePath = path.join(__dirname, 'ssl', 'webroot', req.url);
      if (fs.existsSync(challengePath)) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(fs.readFileSync(challengePath));
        return;
      }
    }

    // Redirect all other traffic to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    res.writeHead(301, {
      'Location': httpsUrl,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });
    res.end();
  });

  redirectServer.listen(httpPort, (err) => {
    if (err) throw err;
    console.log(`🔄 HTTP redirect server ready on http://${hostname}:${httpPort}`);
  });

  return redirectServer;
}

// Main server startup
async function startServer() {
  try {
    // Validate SSL certificates
    validateSSLCertificates();

    // Prepare Next.js app
    console.log('⚡ Preparing Next.js application...');
    await app.prepare();

    // Create HTTPS options
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

    // Start HTTPS server
    httpsServer.listen(httpsPort, (err) => {
      if (err) throw err;
      console.log(`🔒 HTTPS server ready on https://${hostname}:${httpsPort}`);
    });

    // Create HTTP redirect server
    createRedirectServer();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      httpsServer.close(() => {
        console.log('✅ HTTPS server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      httpsServer.close(() => {
        console.log('✅ HTTPS server closed');
        process.exit(0);
      });
    });

    console.log('🎉 Orvale Management System started successfully!');
    console.log(`📱 Access your application at: https://${hostname}`);

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();