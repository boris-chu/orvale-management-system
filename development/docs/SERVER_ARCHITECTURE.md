# Orvale Management System - Server Architecture

## Overview

The Orvale Management System uses a dual-server architecture with a primary HTTPS web server and a secondary WebSocket server for real-time features.

## Server Architecture

### Primary Server: `https-server.js`
**Location**: `/servers/https-server.js`
**Purpose**: Main web application server
**Ports**: 80 (HTTP redirect), 443 (HTTPS)

#### Key Features:
- **Next.js Wrapper**: Wraps the Next.js application with HTTPS support
- **SSL/TLS Management**: Supports both PFX (Windows) and PEM certificate formats
- **Auto-SSL Deployment**: Automatic certificate installation and management
- **HTTP→HTTPS Redirect**: Automatic redirect from port 80 to 443
- **Security Headers**: Comprehensive security header implementation
- **Certificate Downloads**: Provides endpoints for certificate installation

#### SSL Certificate Support:
- **PFX Format**: Windows-preferred format with password protection
- **PEM Format**: Standard key/cert/CA bundle files
- **Auto-Detection**: Automatically detects available certificate format
- **Validation**: Validates certificates before server startup

#### Special Endpoints:
- `/download-certificate` - Downloads CA certificate for client installation
- `/download-installer` - Generates Windows batch installer script
- `/ssl-error-detected` - Triggers automatic SSL deployment

### Secondary Server: `socket-server.js`
**Location**: `/servers/socket-server.js`
**Purpose**: Real-time communication server
**Port**: 3001 (WebSocket)

#### Key Features:
- **Socket.io Server**: Handles WebSocket connections
- **Real-time Updates**: Live notifications, chat, status updates
- **Database Integration**: Direct SQLite database access for real-time data
- **Client Connection Management**: Tracks and manages client connections

## Process Management

Both servers are managed by PM2 as defined in `ecosystem.config.js`:

### Main Application (`orvale-main`)
```javascript
{
  name: 'orvale-main',
  script: './servers/https-server.js',
  instances: 1,
  env: {
    NODE_ENV: 'production',
    HOSTNAME: 'localhost',
    HTTP_PORT: 80,
    HTTPS_PORT: 443
  }
}
```

### Socket Server (`orvale-socket`)
```javascript
{
  name: 'orvale-socket',
  script: './servers/socket-server.js',
  instances: 1,
  env: {
    NODE_ENV: 'production',
    SOCKET_PORT: 3001
  }
}
```

## Server Startup Sequence

### Development Mode
```bash
npm run dev  # Starts Next.js dev server
node servers/socket-server.js  # Start socket server separately
```

### Production Mode (PM2)
```bash
pm2 start ecosystem.config.js  # Starts both servers
```

### Production Mode (Simple)
```powershell
.\deployment\powershell\start-simple.ps1  # Starts both servers without PM2
```

## Environment Variables

### HTTPS Server
- `NODE_ENV` - Environment mode (development/production)
- `HOSTNAME` - Server hostname/IP address
- `HTTP_PORT` - HTTP redirect port (default: 80)
- `HTTPS_PORT` - HTTPS main port (default: 443)
- `SSL_KEY_PATH` - SSL private key path
- `SSL_CERT_PATH` - SSL certificate path
- `SSL_CA_PATH` - SSL CA bundle path
- `SSL_PFX_PATH` - SSL PFX file path (Windows)
- `SSL_PFX_PASSWORD` - PFX file password
- `AUTO_SSL_DEPLOY` - Enable/disable auto SSL deployment

### Socket Server
- `NODE_ENV` - Environment mode
- `SOCKET_PORT` - WebSocket server port (default: 3001)

## Security Features

### HTTPS Server Security
- **Strict Transport Security (HSTS)**: Forces HTTPS connections
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: XSS attack prevention
- **Referrer-Policy**: Controls referrer information
- **SSL/TLS Encryption**: All traffic encrypted with SSL certificates

### Certificate Management
- **Internal CA**: Creates internal Certificate Authority for private networks
- **IP-based Certificates**: Generates certificates using server IP address
- **Automatic Installation**: Auto-deploys certificates to client machines
- **Trust Store Integration**: Installs certificates in Windows trust store

## Client Access

### Primary Access Point
Users access the application via the HTTPS server:
```
https://<server-ip-address>
```

### Real-time Features
The web application automatically connects to the WebSocket server:
```
ws://<server-ip-address>:3001
```

## Logging

### Log Locations
- **Main Server Logs**: `/servers/logs/main-*.log`
- **Socket Server Logs**: `/servers/logs/socket-*.log`
- **Individual Log Files**: `/servers/logs/server.log`, `/servers/logs/socket-server.log`

### Log Types
- **Error Logs**: Application errors and exceptions
- **Output Logs**: Standard application output
- **Combined Logs**: Merged error and output logs
- **Access Logs**: HTTP/HTTPS request logging

## Deployment Architecture

### Windows Production Deployment
1. **PowerShell Scripts**: Automated deployment via `/deployment/powershell/`
2. **SSL Certificate Generation**: Automatic internal CA and certificate creation
3. **Windows Service**: PM2 runs as Windows service for auto-startup
4. **Firewall Configuration**: Automatic port opening (80, 443, 3001)

### Service Management
```powershell
# From deployment directory
.\manage.ps1 status    # Check service status
.\manage.ps1 start     # Start services
.\manage.ps1 stop      # Stop services
.\manage.ps1 restart   # Restart services
.\manage.ps1 logs      # View logs
```

## Data Flow

1. **User Request**: Client connects to `https://server-ip`
2. **HTTPS Server**: Handles request, serves Next.js application
3. **Real-time Connection**: Client establishes WebSocket connection to `:3001`
4. **Database Access**: Both servers access SQLite database in `/database/`
5. **Live Updates**: Socket server pushes real-time updates to connected clients

## Development vs Production

### Development
- Next.js dev server with hot reload
- Separate socket server process
- HTTP connections allowed
- Console logging enabled

### Production
- Compiled Next.js application
- PM2 process management
- HTTPS-only with certificate validation
- File-based logging
- Automatic restarts and monitoring

## Troubleshooting

### Common Issues
1. **SSL Certificate Errors**: Check certificate paths and permissions
2. **Port Conflicts**: Ensure ports 80, 443, 3001 are available
3. **Database Access**: Verify database file permissions and location
4. **Firewall Blocking**: Check Windows Firewall settings for required ports

### Diagnostic Commands
```powershell
# Check service status
pm2 status

# View logs
pm2 logs orvale-main
pm2 logs orvale-socket

# Restart services
pm2 restart all

# Check ports
netstat -an | findstr ":80 :443 :3001"
```

## File Structure Summary

```
/servers/
├── https-server.js          # Main HTTPS web server
├── socket-server.js         # WebSocket real-time server
└── logs/                    # Server log files

/deployment/
├── powershell/              # Deployment scripts
├── auto-ssl-deployment.js   # SSL automation
└── DEPLOYMENT.md           # Deployment guide

/database/
└── orvale_tickets.db       # SQLite database

ecosystem.config.js         # PM2 process configuration
```

This dual-server architecture provides robust, secure, and scalable web application hosting with real-time features and enterprise-grade SSL certificate management.