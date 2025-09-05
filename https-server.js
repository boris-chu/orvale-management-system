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
const AutoSSLDeployment = require('./auto-ssl-deployment');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const httpPort = process.env.HTTP_PORT || 80;
const httpsPort = process.env.HTTPS_PORT || 443;

// SSL Certificate paths
const sslKeyPath = process.env.SSL_KEY_PATH || './ssl/private.key';
const sslCertPath = process.env.SSL_CERT_PATH || './ssl/certificate.crt';
const sslCAPath = process.env.SSL_CA_PATH || './ssl/ca-bundle.crt';
const sslPfxPath = process.env.SSL_PFX_PATH || './ssl/server.pfx';
const sslPfxPassword = process.env.SSL_PFX_PASSWORD || 'orvale2024';

console.log('🚀 Starting Orvale Management System with HTTPS...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Hostname: ${hostname}`);
console.log(`HTTP Port: ${httpPort}`);
console.log(`HTTPS Port: ${httpsPort}`);

// Initialize Next.js app
const app = next({ dev, hostname, port: httpsPort });
const handle = app.getRequestHandler();

// Initialize Auto SSL Deployment
const autoSSL = new AutoSSLDeployment({
  serverIP: hostname,
  caFilePath: sslCAPath,
  enabled: process.env.AUTO_SSL_DEPLOY !== 'false'
});

// SSL Certificate validation
function validateSSLCertificates() {
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
    console.error('Run deploy-production.ps1 or ssl-certificate-setup.ps1 to generate certificates.');
    process.exit(1);
  }

  console.log('✅ SSL Certificate files found (PEM format)');
  return 'pem';
}

// Create HTTPS options
function createHTTPSOptions() {
  const certFormat = validateSSLCertificates();
  
  let options = {};

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

// HTTP to HTTPS redirect server with SSL error detection
function createRedirectServer() {
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

    // Handle Let's Encrypt challenges (if using Let's Encrypt)
    if (req.url && req.url.startsWith('/.well-known/acme-challenge/')) {
      const challengePath = path.join(__dirname, 'ssl', 'webroot', req.url);
      if (fs.existsSync(challengePath)) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(fs.readFileSync(challengePath));
        return;
      }
    }

    // For first-time visitors, trigger SSL error detection
    if (clientIP && autoSSL.isPrivateIP(clientIP) && !autoSSL.deployedClients.has(clientIP)) {
      console.log(`🔍 First HTTP request from ${clientIP}, checking HTTPS availability`);
      
      // Provide immediate download option while checking
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Orvale Management System - Certificate Setup</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
        .btn:hover { background: #0056b3; }
        .auto-deploy { background: #28a745; }
        .status { padding: 15px; margin: 15px 0; border-radius: 4px; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; }
    </style>
    <script>
        // Try to auto-deploy certificate
        fetch('/api/auto-deploy-ssl', { method: 'POST' })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('status').innerHTML = '<div class="status info">🔄 Attempting automatic certificate installation...</div>';
              setTimeout(() => {
                window.location.href = 'https://${hostname}';
              }, 5000);
            }
          })
          .catch(err => console.log('Auto-deploy not available'));
    </script>
</head>
<body>
    <div class="container">
        <h1>🔒 Orvale Management System</h1>
        <h2>SSL Certificate Setup Required</h2>
        
        <div id="status" class="status info">
            📡 To access this server securely, please install our SSL certificate.
        </div>
        
        <h3>Choose Installation Method:</h3>
        
        <a href="/download-installer" class="btn auto-deploy">
            🚀 Download Auto-Installer
        </a>
        
        <a href="/download-certificate" class="btn">
            📥 Download Certificate Only
        </a>
        
        <a href="javascript:window.location.href='/ssl-error-detected'" class="btn">
            🔧 Try Automatic Installation
        </a>
        
        <h3>Manual Installation Instructions:</h3>
        <ol>
            <li>Download and run the <strong>Auto-Installer</strong> (recommended)</li>
            <li>Or download the certificate and import it to "Trusted Root Certification Authorities"</li>
            <li>Once installed, access: <code>https://${hostname}</code></li>
        </ol>
        
        <p><small>This is a one-time setup. After installation, you'll have secure access to all services.</small></p>
    </div>
</body>
</html>`);
        return;
      }
      
      // Schedule SSL deployment attempt
      setTimeout(() => {
        autoSSL.handleSSLError(clientIP, 'http_first_visit');
      }, 1000);
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

  redirectServer.listen(httpPort, (err) => {
    if (err) throw err;
    console.log(`🔄 HTTP redirect server ready on http://${hostname}:${httpPort}`);
  });

  return redirectServer;
}

// Main server startup
async function startServer() {
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

    // Start HTTPS server
    httpsServer.listen(httpsPort, (err) => {
      if (err) throw err;
      console.log(`🔒 HTTPS server ready on https://${hostname}:${httpsPort}`);
    });

    // Create HTTP redirect server
    createRedirectServer();

    // Start SSL auto-deployment monitoring
    autoSSL.startMonitoring();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      autoSSL.stop();
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