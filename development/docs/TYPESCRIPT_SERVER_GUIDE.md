# TypeScript Server Implementation Guide

## Overview

The Orvale Management System now supports a modern TypeScript server implementation that combines both HTTPS and Socket.io servers into a single, cleaner, and more maintainable solution.

## New TypeScript Architecture

### **Single Unified Server**: `servers/orvale-server.ts`
- **HTTPS/HTTP Server**: Serves Next.js application with SSL/TLS
- **Socket.io Server**: Real-time messaging on the same HTTPS connection
- **SSL Management**: Auto-detection of PFX/PEM certificates
- **Windows Service**: Native Windows service support via node-windows

### **Benefits of TypeScript Approach**
1. **Type Safety**: Full TypeScript type checking for better code quality
2. **Single Process**: Both web and socket servers in one process
3. **Better Resource Usage**: Shared SSL certificates and ports
4. **Cleaner Code**: Modern async/await patterns and interfaces
5. **Windows Native**: Direct Windows service installation with node-windows
6. **Hot Reload**: Development mode with tsx watch support

## Usage Methods

### **1. Development Mode**
```bash
# Start with hot reload (recommended for development)
npm run server:dev

# Or start without hot reload
npm run server:ts
```

### **2. Production Mode (PM2)**
```bash
# Start unified TypeScript server with PM2
pm2 start ecosystem.config.js --only orvale-unified

# Or start all servers (legacy + new)
pm2 start ecosystem.config.js
```

### **3. Windows Service (Recommended for Production)**
```bash
# Install as Windows service
npm run service:install

# Service management
npm run service:start
npm run service:stop
npm run service:restart
npm run service:status

# Uninstall service
npm run service:uninstall
```

## Configuration

### **Environment Variables**
```bash
NODE_ENV=production          # Environment mode
HOSTNAME=localhost           # Server hostname/IP
HTTP_PORT=80                 # HTTP redirect port
HTTPS_PORT=443              # HTTPS main port
SOCKET_PORT=3001            # Socket.io port (combined with HTTPS)

# SSL Certificate paths
SSL_KEY_PATH=./deployment/ssl/private.key
SSL_CERT_PATH=./deployment/ssl/certificate.crt
SSL_CA_PATH=./deployment/ssl/ca-bundle.crt
SSL_PFX_PATH=./deployment/ssl/server.pfx
SSL_PFX_PASSWORD=orvale2024

# Auto-SSL deployment
AUTO_SSL_DEPLOY=true
JWT_SECRET=orvale-management-system-secret-key-2025
```

### **SSL Certificate Support**
- **PFX Format**: Windows-preferred format (auto-detected)
- **PEM Format**: Standard key/cert/CA files (fallback)
- **Auto-Detection**: Automatically chooses available format
- **Path Validation**: Validates certificate existence before startup

## Windows Service Details

### **Service Configuration**
- **Service Name**: `OrvaleManagementSystem`
- **Display Name**: `Orvale Management System`
- **Startup Type**: Automatic with delayed start
- **Recovery**: Restart on failure (3 attempts)
- **Account**: Network Service (secure default)

### **Service Management**
```powershell
# Windows Service Manager
services.msc

# Command line management
sc query "OrvaleManagementSystem"
sc start "OrvaleManagementSystem"
sc stop "OrvaleManagementSystem"

# View service logs
Get-EventLog -LogName Application -Source "OrvaleManagementSystem"
```

### **Automatic Installation Script**
The service installer (`servers/service-installer.ts`) provides:
- One-command installation and configuration
- Automatic dependency resolution
- Error handling and recovery options
- Service status monitoring
- Clean uninstallation

## Network Architecture

### **Port Configuration**
```
Port 80  (HTTP)  → Redirect to HTTPS + SSL certificate management
Port 443 (HTTPS) → Next.js Application + Socket.io WebSocket
```

### **Connection Flow**
1. **HTTP (Port 80)**: Certificate download, auto-installer, redirects to HTTPS
2. **HTTPS (Port 443)**: Main web application and Socket.io real-time features
3. **WebSocket**: Real-time chat, presence, notifications (same port as HTTPS)

### **SSL Certificate Management**
- **Auto-detection**: PFX preferred, falls back to PEM
- **Auto-deployment**: Automatic certificate installation to client machines
- **Certificate endpoints**: Download and installer generation
- **Error handling**: SSL error detection with auto-remediation

## Development vs Production

### **Development Mode**
```bash
# Hot reload with tsx watch
npm run server:dev

# Features:
# - TypeScript compilation on-the-fly
# - Hot reload on file changes
# - Enhanced error messages
# - Console logging
```

### **Production Mode**
```bash
# Windows Service (recommended)
npm run service:install

# PM2 Process Manager (alternative)
pm2 start ecosystem.config.js --only orvale-unified

# Features:
# - Optimized TypeScript execution
# - Automatic restart on failure
# - Process monitoring
# - Log file management
# - System integration
```

## Migration from JavaScript Servers

### **Backwards Compatibility**
The original JavaScript servers (`https-server.js`, `socket-server.js`) remain available for backward compatibility:

```bash
# Legacy mode (two separate servers)
pm2 start ecosystem.config.js --only orvale-main,orvale-socket

# New unified mode (single TypeScript server)
pm2 start ecosystem.config.js --only orvale-unified
```

### **Migration Steps**
1. **Test TypeScript server**: `npm run server:ts`
2. **Verify functionality**: Test all features (web, chat, SSL)
3. **Install as service**: `npm run service:install`
4. **Remove legacy PM2**: `pm2 delete orvale-main orvale-socket`
5. **Update documentation**: Use new service commands

## Troubleshooting

### **Common Issues**

**TypeScript Compilation Errors**:
```bash
# Check TypeScript errors
npm run typecheck

# Common fixes:
# - Update type definitions
# - Fix import statements
# - Check interface implementations
```

**Service Installation Fails**:
```powershell
# Run as Administrator
# Check Windows permissions
# Verify tsx installation: npm list tsx
```

**SSL Certificate Issues**:
```bash
# Check certificate paths
ls deployment/ssl/

# Verify certificate format
# Ensure proper permissions
```

**Port Conflicts**:
```powershell
# Check what's using the ports
netstat -an | findstr ":80 :443"

# Stop conflicting services
# Update port configuration if needed
```

### **Diagnostic Commands**
```bash
# Check server status
npm run service:status

# View service logs
type servers\logs\unified-combined.log

# Test SSL certificates
npm run server:ts  # Will validate certificates on startup

# Check TypeScript compilation
npm run typecheck
```

## Performance Benefits

### **Resource Optimization**
- **Single Process**: Reduced memory footprint
- **Shared SSL**: Single certificate loading and validation
- **Unified Logging**: Centralized log management
- **Connection Pooling**: Shared database connections

### **Scalability**
- **Horizontal Scaling**: Easy to replicate the single server
- **Load Balancing**: Single endpoint for all services
- **Monitoring**: Simplified process monitoring
- **Updates**: Single server restart for all features

## Security Features

### **Built-in Security**
- **HTTPS Only**: All traffic encrypted by default
- **Security Headers**: Comprehensive security header implementation
- **JWT Authentication**: Token-based authentication for Socket.io
- **Input Validation**: TypeScript interface validation
- **Error Handling**: Secure error messages without information leakage

### **Windows Service Security**
- **Network Service Account**: Minimal privilege account
- **Service Recovery**: Automatic restart on failure
- **Log Isolation**: Separate log files for security audit
- **Process Isolation**: Isolated from other Windows services

## Future Enhancements

### **Planned Features**
- **WebRTC Integration**: Audio/video calling on the same connection
- **Cluster Mode**: Multi-instance scaling
- **Health Monitoring**: Advanced health check endpoints
- **Configuration API**: Dynamic configuration updates
- **Performance Metrics**: Built-in performance monitoring

### **Development Roadmap**
1. **Complete WebRTC Integration** (Q1 2025)
2. **Cluster Mode Support** (Q2 2025)
3. **Advanced Monitoring** (Q3 2025)
4. **Configuration Management** (Q4 2025)

## Conclusion

The TypeScript server implementation provides a modern, maintainable, and efficient solution for the Orvale Management System. With native Windows service support, comprehensive SSL management, and unified architecture, it represents a significant improvement over the original JavaScript implementation while maintaining full backward compatibility.