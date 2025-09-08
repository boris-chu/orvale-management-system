# Orvale Management System - Production Deployment Script v1.2
# Deploys from Git repository to C:\Orvale with IP-based SSL certificates
# Version 1.2 - IP-based SSL certificates (no domain required)

param(
    [string]$CompanyName = "Your Company",
    [string]$ServerIP = "", # Auto-detected if not provided
    [string]$DeployPath = "C:\Orvale",
    [string]$ServiceName = "OrvaleManagementSystem",
    [string]$GitRepo = "https://github.com/YOUR_USERNAME/orvale-management-system.git",
    [switch]$Update = $false
)

# Auto-detect server IP if not provided
if (-not $ServerIP) {
    $ServerIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" | 
                Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
                Select-Object -First 1).IPAddress
    if (-not $ServerIP) {
        $ServerIP = (Get-NetIPAddress -AddressFamily IPv4 | 
                    Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
                    Select-Object -First 1).IPAddress
    }
}

Write-Host "🚀 Orvale Management System Production Deployment v1.2" -ForegroundColor Green
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Cyan
Write-Host "Server IP: $ServerIP" -ForegroundColor Cyan
if ($Update) {
    Write-Host "Mode: Update existing deployment" -ForegroundColor Yellow
} else {
    Write-Host "Mode: Fresh deployment" -ForegroundColor Yellow
}

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "❌ This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Step 1: Handle Git repository
if ($Update) {
    Write-Host "`n🔄 Step 1: Updating from Git repository..." -ForegroundColor Yellow
    
    if (!(Test-Path "$DeployPath\.git")) {
        Write-Host "   ❌ No Git repository found at $DeployPath" -ForegroundColor Red
        Write-Host "   Please run without -Update flag for fresh deployment" -ForegroundColor Yellow
        exit 1
    }
    
    Push-Location $DeployPath
    try {
        Write-Host "   Pulling latest changes..." -ForegroundColor Gray
        git pull origin main
        Write-Host "   ✅ Git repository updated" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Git pull failed: $($_.Exception.Message)" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    Write-Host "`n📥 Step 1: Cloning Git repository..." -ForegroundColor Yellow
    
    # Create production directory if it doesn't exist
    if (!(Test-Path $DeployPath)) {
        New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null
    }
    
    # Check if directory is empty or has .git folder
    if ((Get-ChildItem $DeployPath -Force | Measure-Object).Count -gt 0) {
        if (Test-Path "$DeployPath\.git") {
            Write-Host "   ⚠️  Git repository already exists. Use -Update flag to update." -ForegroundColor Yellow
            exit 1
        } else {
            Write-Host "   ⚠️  Directory not empty. Please use empty directory or use -Update flag." -ForegroundColor Yellow
            exit 1
        }
    }
    
    try {
        Write-Host "   Cloning repository: $GitRepo" -ForegroundColor Gray
        git clone $GitRepo $DeployPath
        Write-Host "   ✅ Repository cloned successfully" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Git clone failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Please check your Git repository URL and access permissions" -ForegroundColor Yellow
        exit 1
    }
}

# Step 1b: Create required directories
Write-Host "`n📁 Step 1b: Ensuring directory structure..." -ForegroundColor Yellow

$directories = @(
    "$DeployPath\logs",
    "$DeployPath\ssl",
    "$DeployPath\backups",
    "$DeployPath\uploads"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   ✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "   📂 Exists: $dir" -ForegroundColor Gray
    }
}

# Step 2: Build application 
Write-Host "`n🔨 Step 2: Building application..." -ForegroundColor Yellow

Push-Location $DeployPath
try {
    # Install dependencies
    Write-Host "   Installing dependencies..." -ForegroundColor Gray
    # Use --omit=dev instead of --production for newer npm versions
    npm install --omit=dev 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Fallback to --production for older npm versions
        npm install --production
    }
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
    
    # Address security vulnerabilities
    Write-Host "   Fixing security vulnerabilities..." -ForegroundColor Gray
    npm audit fix --omit=dev 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "     Note: Some vulnerabilities may require manual attention" -ForegroundColor Yellow
    }
    
    # Build the application
    Write-Host "   Building Next.js application..." -ForegroundColor Gray
    npm run build
    Write-Host "   ✅ Build completed" -ForegroundColor Green

} catch {
    Write-Host "   ❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Step 3: Setup Internal CA and SSL certificates
Write-Host "`n🔒 Step 3: Setting up Internal CA and SSL certificates..." -ForegroundColor Yellow

# Create the internal CA setup script in the deploy directory
$internalCAScript = @"
param(
    [string]`$CompanyName = "$CompanyName",
    [string]`$ServerIP = "$ServerIP",
    [string]`$SslPath = "$DeployPath\ssl"
)

# Create certificates using PowerShell with IP address
try {
    Write-Host "Creating Root CA certificate..." -ForegroundColor Gray
    # Create Root CA
    `$rootCA = New-SelfSignedCertificate -Type Custom -KeySpec Signature ``
        -Subject "CN=`$CompanyName Root CA, O=`$CompanyName" ``
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 4096 ``
        -CertStoreLocation "Cert:\LocalMachine\My" ``
        -KeyUsageProperty Sign -KeyUsage CertSign ``
        -NotAfter (Get-Date).AddDays(1825)  # 5 years

    if (-not `$rootCA) {
        throw "Failed to create Root CA certificate"
    }

    Write-Host "Creating server certificate for IP: `$ServerIP..." -ForegroundColor Gray
    # Create Server Certificate - simplified approach for better compatibility
    `$serverCert = New-SelfSignedCertificate -Type Custom -KeySpec Signature ``
        -Subject "CN=`$ServerIP, O=`$CompanyName" ``
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 2048 ``
        -CertStoreLocation "Cert:\LocalMachine\My" ``
        -Signer `$rootCA ``
        -NotAfter (Get-Date).AddDays(1460)  # 4 years

    if (-not `$serverCert) {
        throw "Failed to create server certificate"
    }

    Write-Host "Exporting certificates..." -ForegroundColor Gray
    # Export certificates
    Export-Certificate -Cert `$rootCA -FilePath "`$SslPath\ca-bundle.crt" -Type CERT | Out-Null
    Export-Certificate -Cert `$serverCert -FilePath "`$SslPath\certificate.crt" -Type CERT | Out-Null

    # Export private key
    `$serverPassword = ConvertTo-SecureString -String "orvale2024" -Force -AsPlainText
    `$serverPfxPath = "`$SslPath\server.pfx"
    Export-PfxCertificate -Cert `$serverCert -FilePath `$serverPfxPath -Password `$serverPassword | Out-Null

    Write-Host "Installing Root CA in trusted store..." -ForegroundColor Gray
    # Install Root CA in trusted store
    `$rootStore = Get-Item "Cert:\LocalMachine\Root"
    `$rootStore.Open("ReadWrite")
    `$rootStore.Add(`$rootCA)
    `$rootStore.Close()

    # Clean up certificates from personal store
    Remove-Item -Path "Cert:\LocalMachine\My\`$(`$rootCA.Thumbprint)" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "Cert:\LocalMachine\My\`$(`$serverCert.Thumbprint)" -Force -ErrorAction SilentlyContinue

    Write-Host "✅ Internal CA and server certificates created successfully!" -ForegroundColor Green
    Write-Host "   Root CA Thumbprint: `$(`$rootCA.Thumbprint)" -ForegroundColor Cyan
    Write-Host "   Server Cert Thumbprint: `$(`$serverCert.Thumbprint)" -ForegroundColor Cyan
    Write-Host "   Certificate IP: `$ServerIP" -ForegroundColor Cyan
    Write-Host "   Certificate files:" -ForegroundColor Cyan
    Write-Host "     - Root CA: `$SslPath\ca-bundle.crt" -ForegroundColor Gray
    Write-Host "     - Server Cert: `$SslPath\certificate.crt" -ForegroundColor Gray
    Write-Host "     - Private Key: `$SslPath\server.pfx" -ForegroundColor Gray

} catch {
    Write-Host "❌ Certificate creation failed: `$(`$_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Error details: `$(`$_.Exception.GetType().FullName)" -ForegroundColor Red
    Write-Host "   This may require running PowerShell as Administrator with elevated privileges" -ForegroundColor Yellow
    throw `$_
}
"@

$certScriptPath = Join-Path $DeployPath "create-certificates.ps1"
$internalCAScript | Out-File -FilePath $certScriptPath -Encoding UTF8

# Run certificate creation
try {
    & $certScriptPath -CompanyName $CompanyName -ServerIP $ServerIP -SslPath "$DeployPath\ssl"
    Write-Host "   ✅ SSL certificates created" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Certificate creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Create production environment file
Write-Host "`n⚙️ Step 4: Creating production configuration..." -ForegroundColor Yellow

$envContent = @"
NODE_ENV=production
HOSTNAME=$ServerIP
HTTP_PORT=80
HTTPS_PORT=443
SOCKET_PORT=3001
SSL_KEY_PATH=./ssl/server.pfx
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca-bundle.crt
DB_PATH=./orvale_tickets.db
LOG_LEVEL=info
PINO_ENABLED=false
"@

$envPath = Join-Path $DeployPath ".env.local"
$envContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "   ✅ Environment configuration created" -ForegroundColor Green

# Step 5: Update ecosystem config for production paths
Write-Host "`n🔧 Step 5: Updating ecosystem configuration..." -ForegroundColor Yellow

$ecosystemConfig = @"
module.exports = {
  apps: [
    {
      name: 'orvale-main',
      script: './https-server.js',
      cwd: '$DeployPath',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '$ServerIP',
        HTTP_PORT: 80,
        HTTPS_PORT: 443,
        SSL_KEY_PATH: './ssl/server.pfx',
        SSL_CERT_PATH: './ssl/certificate.crt',
        SSL_CA_PATH: './ssl/ca-bundle.crt'
      },
      error_file: '$DeployPath/logs/main-error.log',
      out_file: '$DeployPath/logs/main-out.log',
      log_file: '$DeployPath/logs/main-combined.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'orvale-socket',
      script: './socket-server.js',
      cwd: '$DeployPath',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001
      },
      error_file: '$DeployPath/logs/socket-error.log',
      out_file: '$DeployPath/logs/socket-out.log',
      log_file: '$DeployPath/logs/socket-combined.log',
      time: true,
      merge_logs: true
    }
  ]
};
"@

$ecosystemPath = Join-Path $DeployPath "ecosystem.config.js"
$ecosystemConfig | Out-File -FilePath $ecosystemPath -Encoding UTF8
Write-Host "   ✅ Ecosystem configuration updated" -ForegroundColor Green

# Step 6: Install PM2 and setup Windows Service
Write-Host "`n🔧 Step 6: Installing PM2 and setting up Windows Service..." -ForegroundColor Yellow

# Check if PM2 is installed
$pm2Installed = $false
try {
    pm2 --version | Out-Null
    $pm2Installed = $true
    Write-Host "   ✅ PM2 is already installed" -ForegroundColor Green
} catch {
    Write-Host "   📦 PM2 not found, installing..." -ForegroundColor Yellow
}

# Install PM2 if not present
if (-not $pm2Installed) {
    try {
        Write-Host "   Installing PM2 globally..." -ForegroundColor Gray
        npm install -g pm2
        
        Write-Host "   Installing PM2 Windows Service..." -ForegroundColor Gray  
        npm install -g pm2-windows-service
        
        Write-Host "   ✅ PM2 installed successfully" -ForegroundColor Green
        $pm2Installed = $true
    } catch {
        Write-Host "   ❌ PM2 installation failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   You may need to install PM2 manually:" -ForegroundColor Yellow
        Write-Host "   npm install -g pm2" -ForegroundColor White
        Write-Host "   npm install -g pm2-windows-service" -ForegroundColor White
        $pm2Installed = $false
    }
}

Push-Location $DeployPath

if ($pm2Installed) {
    try {
        # Stop existing PM2 processes and clear cache
        Write-Host "   Stopping existing PM2 processes and clearing cache..." -ForegroundColor Gray
        pm2 kill 2>$null  # Completely stops PM2 daemon and clears cached paths
        Start-Sleep -Seconds 3

        # Remove existing service if it exists
        if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
            Write-Host "   Removing existing service..." -ForegroundColor Gray
            Stop-Service -Name $ServiceName -Force
            pm2-service-uninstall 2>$null
            Start-Sleep -Seconds 2
        }

        # Start PM2 ecosystem
        Write-Host "   Starting PM2 applications..." -ForegroundColor Gray
        pm2 start ecosystem.config.js
        pm2 save

        # Install as Windows service
        Write-Host "   Installing PM2 as Windows service..." -ForegroundColor Gray
        
        # Try different PM2 service installation methods
        $serviceInstalled = $false
        
        # Method 1: pm2-service-install
        try {
            pm2-service-install -n $ServiceName 2>$null
            $serviceInstalled = $true
            Write-Host "     ✅ Service installed via pm2-service-install" -ForegroundColor Gray
        } catch {
            Write-Host "     pm2-service-install not available, trying alternative..." -ForegroundColor Gray
        }
        
        # Method 2: Direct PM2 service installation
        if (-not $serviceInstalled) {
            try {
                pm2 install pm2-windows-service 2>$null
                pm2-service-install -n $ServiceName 2>$null
                $serviceInstalled = $true
                Write-Host "     ✅ Service installed via PM2 module" -ForegroundColor Gray
            } catch {
                Write-Host "     PM2 service module installation failed" -ForegroundColor Gray
            }
        }
        
        if (-not $serviceInstalled) {
            throw "Unable to install PM2 as Windows service. PM2 will run manually."
        }

        # Set service to auto-start and start it
        Set-Service -Name $ServiceName -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service -Name $ServiceName -ErrorAction SilentlyContinue

        Write-Host "   ✅ Windows Service installed and started" -ForegroundColor Green

    } catch {
        Write-Host "   ❌ Service installation failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Trying manual PM2 startup..." -ForegroundColor Yellow
        
        try {
            pm2 start ecosystem.config.js
            pm2 save
            Write-Host "   ✅ PM2 started manually (not as Windows service)" -ForegroundColor Green
            Write-Host "   Note: Applications will not auto-start on reboot" -ForegroundColor Yellow
        } catch {
            Write-Host "   ❌ Manual PM2 startup also failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Please install PM2 manually and re-run deployment" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ❌ Cannot proceed without PM2. Please install manually:" -ForegroundColor Red
    Write-Host "   1. npm install -g pm2" -ForegroundColor White
    Write-Host "   2. npm install -g pm2-windows-service" -ForegroundColor White
    Write-Host "   3. Re-run this deployment script" -ForegroundColor White
}

Pop-Location

# Step 7: Configure Windows Firewall
Write-Host "`n🛡️ Step 7: Configuring Windows Firewall..." -ForegroundColor Yellow

$firewallRules = @(
    @{Name = "Orvale HTTPS"; Port = 443},
    @{Name = "Orvale HTTP Redirect"; Port = 80},
    @{Name = "Orvale Socket.IO"; Port = 3001}
)

foreach ($rule in $firewallRules) {
    try {
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol TCP -LocalPort $rule.Port -Action Allow -ErrorAction SilentlyContinue
        Write-Host "   ✅ Firewall rule added: $($rule.Name) (Port $($rule.Port))" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Firewall rule may already exist: $($rule.Name)" -ForegroundColor Yellow
    }
}

# Step 8: Create quick management script
Write-Host "`n📋 Step 8: Creating management script..." -ForegroundColor Yellow

$quickManageScript = @"
# Orvale Management System - Quick Management
# Run from $DeployPath

param(
    [Parameter(Mandatory=`$true)]
    [ValidateSet("status", "start", "stop", "restart", "logs", "update")]
    [string]`$Action
)

Set-Location '$DeployPath'

switch (`$Action) {
    "status" {
        Write-Host "=== Orvale Management System Status ===" -ForegroundColor Green
        Get-Service $ServiceName -ErrorAction SilentlyContinue | Format-Table -AutoSize
        pm2 list
        Write-Host "Application URL: https://$ServerIP" -ForegroundColor Cyan
    }
    "start" { 
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Start-Service $ServiceName
            Write-Host "✅ Orvale service started - Access: https://$ServerIP" -ForegroundColor Green
        } else {
            pm2 start ecosystem.config.js
            Write-Host "✅ Orvale started via PM2 - Access: https://$ServerIP" -ForegroundColor Green
        }
    }
    "stop" { 
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Stop-Service $ServiceName -Force
        }
        pm2 stop all 2>`$null
        Write-Host "⏹️ Orvale stopped" -ForegroundColor Yellow
    }
    "restart" { 
        if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
            Restart-Service $ServiceName
            Write-Host "🔄 Orvale service restarted - Access: https://$ServerIP" -ForegroundColor Green
        } else {
            pm2 restart all
            Write-Host "🔄 Orvale restarted via PM2 - Access: https://$ServerIP" -ForegroundColor Green
        }
    }
    "logs" { 
        Write-Host "=== Recent Logs ===" -ForegroundColor Green
        pm2 logs --lines 20
    }
    "update" {
        Write-Host "Updating from Git repository..." -ForegroundColor Yellow
        git pull origin main
        npm install --production
        npm run build
        pm2 restart all
        Write-Host "✅ Update completed!" -ForegroundColor Green
    }
}
"@

$manageScriptPath = Join-Path $DeployPath "manage.ps1"
$quickManageScript | Out-File -FilePath $manageScriptPath -Encoding UTF8
Write-Host "   ✅ Management script created: $manageScriptPath" -ForegroundColor Green

# Final success message
Write-Host ""
Write-Host "🎉 Orvale Management System Production Deployment COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Deployment Location: $DeployPath" -ForegroundColor Cyan
Write-Host "🌐 Application URL:     https://$ServerIP" -ForegroundColor Cyan  
Write-Host "🔧 Service Name:        $ServiceName" -ForegroundColor Cyan
Write-Host "📦 Git Repository:      $GitRepo" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy Root CA certificate to client machines for trusted HTTPS" -ForegroundColor White
Write-Host "     Copy: $DeployPath\ssl\ca-bundle.crt to client machines" -ForegroundColor White
Write-Host "     Install: Import certificate to 'Trusted Root Certification Authorities'" -ForegroundColor White
Write-Host "  2. Access application: https://$ServerIP" -ForegroundColor White
Write-Host ""
Write-Host "⚡ Quick Commands:" -ForegroundColor Yellow
Write-Host "  Fresh Deploy: .\deploy-production.ps1 -GitRepo '$GitRepo'" -ForegroundColor White  
Write-Host "  Update:       .\deploy-production.ps1 -Update" -ForegroundColor White
Write-Host "  Status:       cd $DeployPath && .\manage.ps1 status" -ForegroundColor White
Write-Host "  Restart:      cd $DeployPath && .\manage.ps1 restart" -ForegroundColor White
Write-Host "  Logs:         cd $DeployPath && .\manage.ps1 logs" -ForegroundColor White
Write-Host ""
Write-Host "📂 Key Files:" -ForegroundColor Yellow
Write-Host "  App:         $DeployPath\https-server.js" -ForegroundColor White
Write-Host "  Database:    $DeployPath\orvale_tickets.db" -ForegroundColor White
Write-Host "  SSL Certs:   $DeployPath\ssl\" -ForegroundColor White
Write-Host "  Logs:        $DeployPath\logs\" -ForegroundColor White
Write-Host "  Management:  $DeployPath\manage.ps1" -ForegroundColor White