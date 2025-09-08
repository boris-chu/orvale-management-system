# Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. NPM Warnings During Installation

**Issue**: You see warnings like:
```
npm warn config production Use `--omit=dev` instead.
npm warn deprecated inflight@1.0.6: This module is not supported...
```

**Solution**: These are mostly warnings about deprecated packages. The deployment script now handles this automatically.

**Manual Fix (Optional)**:
```powershell
# Update npm to latest version
npm install -g npm@latest

# Update Node.js to latest LTS version
# Download from: https://nodejs.org/
```

### 2. SSL Certificate Creation Errors

**Issue**: Certificate creation fails with permission errors.

**Solutions**:

#### A. Run as Administrator
- Right-click PowerShell and select "Run as Administrator"
- Re-run the deployment script

#### B. Enable PowerShell Script Execution
```powershell
# Check current policy
Get-ExecutionPolicy

# Set to allow local scripts (run as Administrator)
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine

# Or for current user only
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### C. Certificate Store Issues
If you get certificate store errors:
```powershell
# Clear certificate store conflicts
Get-ChildItem Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*Your Company*"} | Remove-Item
Get-ChildItem Cert:\LocalMachine\Root | Where-Object {$_.Subject -like "*Your Company*"} | Remove-Item
```

### 3. Git Clone/Pull Errors

**Issue**: Git operations fail during deployment.

**Solutions**:

#### A. Git Not Installed
```powershell
# Install Git using winget
winget install --id Git.Git -e --source winget

# Or download from: https://git-scm.com/download/win
```

#### B. Git Authentication Issues
For private repositories:
```powershell
# Configure Git credentials
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# For HTTPS repos, Windows will prompt for credentials
# For SSH repos, set up SSH keys first
```

### 4. Port Already in Use

**Issue**: Ports 80, 443, or 3001 are already in use.

**Solution**:
```powershell
# Check what's using the ports
netstat -ano | findstr :80
netstat -ano | findstr :443
netstat -ano | findstr :3001

# Stop conflicting services
# For IIS (if installed):
iisreset /stop

# For other applications, stop them manually or change ports in the script
```

### 5. PM2 Installation Issues

**Issue**: `pm2 is not recognized` or PM2 Windows service installation fails.

**Solutions**:

#### A. Install PM2 Globally (Run as Administrator)
```powershell
# Install PM2 and Windows service support
npm install -g pm2
npm install -g pm2-windows-service

# Verify installation
pm2 --version
```

#### B. If PM2 Installation Fails
```powershell
# Clear npm cache
npm cache clean --force

# Try installing with different registry
npm install -g pm2 --registry https://registry.npmjs.org/

# Or use alternative startup method
.\start-simple.ps1
```

#### C. Manual PM2 Service Setup
```powershell
# Navigate to deployment directory
cd C:\Orvale

# Start PM2 manually
pm2 start ecosystem.config.js
pm2 save

# Install as service
pm2-service-install -n OrvaleManagementSystem

# Set service to auto-start
Set-Service -Name OrvaleManagementSystem -StartupType Automatic
Start-Service -Name OrvaleManagementSystem
```

#### D. Alternative: Simple Startup (No PM2)
If PM2 continues to fail, use the simple startup script:
```powershell
# Copy start-simple.ps1 to your deployment directory
# Then run:
.\start-simple.ps1

# This starts the applications without PM2 or Windows services
# Good for testing or development environments
```

### 6. Build Failures

**Issue**: Next.js build fails.

**Common Causes & Solutions**:

#### A. Node.js Version Issues
- Ensure Node.js 18+ is installed
- Download latest LTS from: https://nodejs.org/

#### B. Memory Issues
```powershell
# Increase Node.js memory limit
$env:NODE_OPTIONS="--max_old_space_size=4096"
npm run build
```

#### C. TypeScript Errors
Check the build output for specific TypeScript errors and fix them before deployment.

### 7. Firewall Issues

**Issue**: Application not accessible from other machines.

**Solutions**:

#### A. Windows Firewall Rules
```powershell
# Add firewall rules manually
New-NetFirewallRule -DisplayName "Orvale HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "Orvale HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Orvale Socket" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

#### B. Network Discovery
```powershell
# Enable network discovery
netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes
```

### 8. Database Issues

**Issue**: Database not accessible or corrupted.

**Solutions**:

#### A. Check Database File
```powershell
# Verify database file exists
Test-Path "C:\Orvale\orvale_tickets.db"

# Check file permissions
icacls "C:\Orvale\orvale_tickets.db"
```

#### B. Restore from Backup
```powershell
# Copy backup from development folder if needed
Copy-Item "C:\Orvale\development\backups\*.db" "C:\Orvale\orvale_tickets.db"
```

## Getting More Help

### Check Deployment Logs
```powershell
# PM2 logs
cd C:\Orvale
pm2 logs

# Application logs
Get-Content C:\Orvale\logs\*.log -Tail 50
```

### Verify Installation
```powershell
# Check service status
Get-Service OrvaleManagementSystem

# Check PM2 processes
pm2 list

# Test application
Invoke-WebRequest https://localhost -SkipCertificateCheck
```

### Clean Reinstall
If all else fails:
```powershell
# Stop services
pm2 delete all
Remove-Service OrvaleManagementSystem -Force

# Remove installation
Remove-Item C:\Orvale -Recurse -Force

# Start fresh deployment
.\deploy-production.ps1 -GitRepo "your-repo-url"
```

## Contact Information

For additional support, check:
1. Application logs in `C:\Orvale\logs\`
2. PM2 process status: `pm2 list`
3. Windows Event Viewer for system-level errors