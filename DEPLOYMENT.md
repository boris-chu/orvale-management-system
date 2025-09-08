# Orvale Management System - Deployment Guide v1.1

## Quick Start

### First-time Deployment
```powershell
.\deploy-production.ps1 -GitRepo "https://github.com/YOUR_USERNAME/orvale-management-system.git"
```

### Update Existing Deployment
```powershell
.\deploy-production.ps1 -Update
```

## Deployment Script Features

The `deploy-production.ps1` script (v1.1) provides automated deployment from Git repository to Windows Server with:

- **Git Repository Support**: Clones from GitHub/GitLab/etc on fresh install, pulls updates on existing deployments
- **Automated SSL Setup**: Creates Internal CA and server certificates
- **Windows Service**: Installs as Windows service using PM2
- **Firewall Configuration**: Opens required ports automatically
- **Production Build**: Builds Next.js app for production

## Parameters

- `-GitRepo`: Your Git repository URL (required for fresh deployment)
- `-CompanyName`: Your company name for SSL certificates (default: "Your Company")
- `-DomainName`: Domain name for the application (default: "orvale.internal")
- `-DeployPath`: Installation directory (default: "C:\Orvale")
- `-ServiceName`: Windows service name (default: "OrvaleManagementSystem")
- `-Update`: Switch to update existing deployment

## Post-Deployment Steps

1. **DNS Configuration**: Add the domain name to your DNS server or hosts file
2. **SSL Trust**: Deploy the Root CA certificate (`C:\Orvale\ssl\ca-bundle.crt`) to client machines
3. **Access Application**: Navigate to `https://your-domain-name`

## Management Commands

From the deployment directory (`C:\Orvale`):

```powershell
.\manage.ps1 status   # Check service status
.\manage.ps1 start    # Start services
.\manage.ps1 stop     # Stop services
.\manage.ps1 restart  # Restart services
.\manage.ps1 logs     # View recent logs
.\manage.ps1 update   # Git pull and rebuild
```

## File Structure

After deployment, only essential web app files remain in root:
- `/app` - Next.js application pages
- `/components` - React components
- `/lib` - Utility libraries
- `/public` - Static assets
- `/scripts` - Database scripts
- `deploy-production.ps1` - Deployment script

All documentation, backups, and development files are organized in `/development` folder.