# 🔒 SSL/HTTPS Deployment Guide for Orvale Management System

## Overview
This guide provides three different approaches to implement SSL/HTTPS for your Orvale Management System on Windows Server.

## 🎯 Recommended Approaches

### **Option 1: IIS Reverse Proxy + Let's Encrypt (RECOMMENDED)**
**Best for: Production servers with public domain names**

**Advantages:**
- ✅ Free SSL certificates that auto-renew
- ✅ Professional IIS management
- ✅ Excellent performance and caching
- ✅ Easy Windows integration
- ✅ Handles both HTTP→HTTPS redirect and Socket.IO proxy

**Setup Steps:**
```powershell
# 1. Setup IIS reverse proxy
.\ssl-setup-iis.ps1 -DomainName "yourdomain.com" -NodePort "8080" -SocketPort "3001"

# 2. Setup Let's Encrypt
.\ssl-letsencrypt-setup.ps1 -DomainName "yourdomain.com" -Email "admin@yourdomain.com"

# 3. Request certificate
C:\SSL\request-certificate.bat

# 4. Update app to run on port 8080 (instead of 80)
# Edit ecosystem.config.js: HTTP_PORT: 8080, HTTPS_PORT: 8080
```

### **Option 2: Native Node.js HTTPS (ALTERNATIVE)**
**Best for: Smaller deployments or when IIS is not preferred**

**Advantages:**
- ✅ Direct Node.js control
- ✅ No IIS dependency
- ✅ Simpler architecture
- ✅ Built-in HTTP→HTTPS redirect

**Setup Steps:**
```powershell
# 1. Generate or obtain SSL certificates
.\ssl-certificate-setup.ps1 -CertificateType "self-signed" -DomainName "yourdomain.com"
# OR for Let's Encrypt
.\ssl-certificate-setup.ps1 -CertificateType "letsencrypt-manual" -DomainName "yourdomain.com"

# 2. Ecosystem config is already updated to use https-server.js

# 3. Deploy with HTTPS enabled
pm2 start ecosystem.config.js
```

### **Option 3: Commercial SSL Certificate**
**Best for: Enterprise environments with purchased certificates**

**Setup Steps:**
```powershell
# 1. Follow commercial certificate instructions
.\ssl-certificate-setup.ps1 -CertificateType "commercial" -DomainName "yourdomain.com"

# 2. Install certificates to ./ssl/ directory
# 3. Use either IIS proxy or Node.js HTTPS approach above
```

## 🚀 Quick Start (Recommended Path)

### For Production with Public Domain:
```powershell
# Prerequisites: Domain pointing to server, ports 80/443 open

# 1. Setup IIS with reverse proxy
.\ssl-setup-iis.ps1 -DomainName "orvale.yourdomain.com" -NodePort "8080"

# 2. Setup Let's Encrypt
.\ssl-letsencrypt-setup.ps1 -DomainName "orvale.yourdomain.com" -Email "admin@yourdomain.com"

# 3. Request certificate
C:\SSL\request-certificate.bat

# 4. Update application ports
# Edit ecosystem.config.js to change port 80 → 8080
```

### For Development/Internal Use:
```powershell
# 1. Generate self-signed certificate
.\ssl-certificate-setup.ps1 -CertificateType "self-signed" -DomainName "localhost"

# 2. Start with HTTPS
pm2 start ecosystem.config.js
```

## 🔧 Configuration Details

### Port Configuration:
- **IIS Approach**: IIS (80/443) → Node.js (8080) + Socket.IO (3001)
- **Node.js Approach**: Node.js HTTPS (443) + HTTP Redirect (80) + Socket.IO (3001)

### Firewall Rules:
```powershell
# Allow HTTPS
New-NetFirewallRule -DisplayName "Orvale HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow HTTP (for redirects/Let's Encrypt validation)
New-NetFirewallRule -DisplayName "Orvale HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Socket.IO (internal - may not need external access)
New-NetFirewallRule -DisplayName "Orvale Socket" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### SSL Certificate Locations:
- **Node.js HTTPS**: `./ssl/private.key`, `./ssl/certificate.crt`, `./ssl/ca-bundle.crt`
- **IIS**: Windows Certificate Store (managed by win-acme)
- **Let's Encrypt**: Auto-managed by win-acme with scheduled renewal

## 🔒 Security Features

### Automatic Security Headers:
Both approaches include:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### HTTP to HTTPS Redirect:
- **IIS**: Automatic redirect rule in web.config
- **Node.js**: Built-in redirect server on port 80

### Let's Encrypt Auto-Renewal:
- Scheduled Windows Task created automatically
- Runs twice daily to check for renewal
- 30-day renewal window before expiration

## 🛠️ Troubleshooting

### Common Issues:

1. **Certificate not found**:
   ```powershell
   # Check certificate files exist
   ls ssl/
   # Should show: private.key, certificate.crt, (ca-bundle.crt)
   ```

2. **Port conflicts**:
   ```powershell
   # Check what's using port 80/443
   netstat -an | findstr ":80 "
   netstat -an | findstr ":443 "
   ```

3. **Let's Encrypt validation fails**:
   - Ensure domain points to server
   - Check port 80 is open and not blocked
   - Verify domain is not rate-limited

4. **IIS module missing**:
   ```powershell
   # Reinstall URL Rewrite and ARR modules
   .\ssl-setup-iis.ps1 -DomainName "yourdomain.com"
   ```

### Testing SSL Setup:

```powershell
# Test HTTP redirect
curl -I http://yourdomain.com

# Test HTTPS
curl -I https://yourdomain.com

# Test Socket.IO
curl https://yourdomain.com/socket.io/socket.io.js

# SSL certificate check
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## 📋 Maintenance

### Certificate Renewal:
- **Let's Encrypt**: Automatic via scheduled task
- **Commercial**: Manual renewal required before expiration
- **Self-signed**: Generate new certificate before expiration

### Monitoring:
```powershell
# Check certificate expiration
.\service-management.ps1 -Action status

# Check renewal task
schtasks /query /tn "win-acme renew"

# Manual renewal check
C:\SSL\check-renewal.bat
```

## 🎉 Success Criteria

After successful SSL setup, you should have:
- ✅ HTTPS access to main application
- ✅ Automatic HTTP → HTTPS redirect
- ✅ Socket.IO working over secure connection
- ✅ Valid SSL certificate (no browser warnings for commercial/Let's Encrypt)
- ✅ Security headers in place
- ✅ Auto-renewal configured (for Let's Encrypt)

**Access URLs:**
- Main App: `https://yourdomain.com`
- Admin: `https://yourdomain.com/admin`
- API Health: `https://yourdomain.com/api/health`
- Chat: `https://yourdomain.com/chat`

Your Orvale Management System will now be fully secured with SSL/TLS encryption! 🔒