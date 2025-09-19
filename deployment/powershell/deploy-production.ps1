# Orvale Management System - Production Deployment Script v1.2
# Deploys from Git repository to C:\Orvale with IP-based SSL certificates
# Version 1.2 - IP-based SSL certificates (no domain required)

param(
    [string]$CompanyName = "Your Company",
    [string]$ServerIP = "", # Auto-detected if not provided
    [string]$DeployPath = "C:\Orvale",
    [string]$ServiceName = "OrvaleManagementSystem",
    [string]$GitRepo = "https://github.com/YOUR_USERNAME/orvale-management-system.git",
    [switch]$Update = $false,
    [switch]$EnableSSLMonitoring = $false,
    [int]$SSLMonitorIntervalMinutes = 30
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
      script: 'https-server.js',
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
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'orvale-socket',
      script: 'socket-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001
      },
      error_file: './logs/socket-error.log',
      out_file: './logs/socket-out.log',
      log_file: './logs/socket-combined.log',
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
Write-Host "  With SSL Mon: .\deploy-production.ps1 -GitRepo '$GitRepo' -EnableSSLMonitoring" -ForegroundColor White
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

# Step 9: Setup SSL Certificate Monitoring (Optional)
if ($EnableSSLMonitoring) {
    Write-Host "`n🔍 Step 9: Setting up SSL certificate monitoring..." -ForegroundColor Yellow
    
    # Create SSL monitoring script
    $sslMonitorScript = @"
# Orvale SSL Certificate Auto-Deployment Script
# Monitors application logs for SSL handshake failures and certificate errors
# Automatically deploys Root CA certificate to client workstations

param(
    [int]`$CheckIntervalMinutes = $SSLMonitorIntervalMinutes,
    [switch]`$RunOnce = `$false,
    [switch]`$SkipSetup = `$false
)

# Check if running as Administrator
`$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not `$IsAdmin) {
    Write-Host "ERROR: SSL monitoring must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

`$ScriptDirectory = "$DeployPath"
`$CertPath = Join-Path `$ScriptDirectory "ssl\ca-bundle.crt"
`$LogPath = Join-Path `$ScriptDirectory "logs"

Write-Host "Orvale SSL Certificate Auto-Deployment System" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Server IP: $ServerIP" -ForegroundColor Cyan
Write-Host "Certificate: `$CertPath" -ForegroundColor Cyan
Write-Host ""

# Auto-setup WinRM for remote certificate deployment
if (-not `$SkipSetup) {
    Write-Host "Performing initial setup..." -ForegroundColor Cyan
    
    # Configure WinRM TrustedHosts for local network
    Write-Host "  Configuring WinRM TrustedHosts..." -NoNewline
    try {
        `$CurrentTrustedHosts = (Get-Item WSMan:\localhost\Client\TrustedHosts).Value
        `$NetworkRanges = @("10.*", "192.168.*", "172.16.*", "172.17.*", "172.18.*", "172.19.*", "172.20.*", "172.21.*", "172.22.*", "172.23.*", "172.24.*", "172.25.*", "172.26.*", "172.27.*", "172.28.*", "172.29.*", "172.30.*", "172.31.*")
        
        `$NewTrustedHosts = `$NetworkRanges -join ","
        if (`$CurrentTrustedHosts -ne `$NewTrustedHosts) {
            Set-Item WSMan:\localhost\Client\TrustedHosts -Value `$NewTrustedHosts -Force
            Write-Host " ✓" -ForegroundColor Green
        } else {
            Write-Host " Already configured" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host " Failed: `$(`$_.Exception.Message)" -ForegroundColor Red
        Write-Host "  You may need to run: winrm quickconfig" -ForegroundColor Yellow
    }
    
    # Check certificate file
    Write-Host "  Checking certificate file..." -NoNewline
    if (-not (Test-Path `$CertPath)) {
        Write-Host " Missing!" -ForegroundColor Red
        Write-Host "Certificate file not found: `$CertPath" -ForegroundColor Yellow
        Write-Host "Please ensure the deployment completed successfully." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host " ✓" -ForegroundColor Green
    }
    
    # Enable WinRM if not already enabled
    Write-Host "  Ensuring WinRM is enabled..." -NoNewline
    try {
        `$WinRMService = Get-Service -Name WinRM -ErrorAction SilentlyContinue
        if (`$WinRMService.Status -ne "Running") {
            Start-Service WinRM
            Write-Host " Started" -ForegroundColor Green
        } else {
            Write-Host " ✓" -ForegroundColor Green
        }
    }
    catch {
        Write-Host " Failed: `$(`$_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "Setup complete!" -ForegroundColor Green
    Write-Host ""
}

# Function to parse Orvale application logs for SSL errors
function Get-SSLErrorsFromOrvaleLog {
    param([string]`$LogPath)
    
    `$SSLErrors = @{}
    `$Today = Get-Date -Format "yyyy-MM-dd"
    
    # Check main application logs
    `$LogFiles = @(
        "main-error.log",
        "main-combined.log",
        "socket-error.log",
        "app.log",
        "error.log"
    )
    
    foreach (`$LogFile in `$LogFiles) {
        `$FullPath = Join-Path `$LogPath `$LogFile
        if (Test-Path `$FullPath) {
            Get-Content `$FullPath -Tail 500 -ErrorAction SilentlyContinue | ForEach-Object {
                # Look for SSL/TLS errors with IP addresses
                if (`$_ -match 'SSL.*error.*?(\d+\.\d+\.\d+\.\d+)' -or
                    `$_ -match 'TLS.*handshake.*failed.*?(\d+\.\d+\.\d+\.\d+)' -or
                    `$_ -match 'certificate.*verify.*failed.*?(\d+\.\d+\.\d+\.\d+)' -or
                    `$_ -match 'CERT_UNTRUSTED.*?(\d+\.\d+\.\d+\.\d+)' -or
                    `$_ -match 'ERR_CERT_AUTHORITY_INVALID.*?(\d+\.\d+\.\d+\.\d+)') {
                    `$IP = `$matches[1]
                    if (`$IP -ne "127.0.0.1" -and `$IP -ne "$ServerIP") {
                        `$SSLErrors[`$IP] = Get-Date
                    }
                }
                # Look for browser connection patterns that suggest SSL issues
                elseif (`$_ -match '(\d+\.\d+\.\d+\.\d+).*?(connection.*reset|connection.*refused|handshake.*timeout)') {
                    `$IP = `$matches[1]
                    if (`$IP -ne "127.0.0.1" -and `$IP -ne "$ServerIP") {
                        `$SSLErrors[`$IP] = Get-Date
                    }
                }
            }
        }
    }
    
    return `$SSLErrors
}

# Function to monitor HTTP requests that suggest SSL problems
function Get-PotentialSSLIssues {
    param([string]`$LogPath)
    
    `$SuspiciousPatterns = @{}
    
    # Check for patterns in main logs that suggest SSL fallback
    `$LogFiles = @("main-combined.log", "app.log")
    
    foreach (`$LogFile in `$LogFiles) {
        `$FullPath = Join-Path `$LogPath `$LogFile
        if (Test-Path `$FullPath) {
            `$LogData = @{}
            
            # Analyze access patterns
            Get-Content `$FullPath -Tail 1000 -ErrorAction SilentlyContinue | ForEach-Object {
                if (`$_ -match '(\d+\.\d+\.\d+\.\d+).*?HTTP.*?(GET|POST)') {
                    `$IP = `$matches[1]
                    if (`$IP -ne "127.0.0.1" -and `$IP -ne "$ServerIP") {
                        if (-not `$LogData.ContainsKey(`$IP)) {
                            `$LogData[`$IP] = @{
                                HTTPRequests = 0
                                HTTPSRequests = 0
                                LastSeen = Get-Date
                            }
                        }
                        
                        if (`$_ -match 'https://') {
                            `$LogData[`$IP].HTTPSRequests++
                        } else {
                            `$LogData[`$IP].HTTPRequests++
                        }
                        `$LogData[`$IP].LastSeen = Get-Date
                    }
                }
            }
            
            # Detect suspicious patterns
            foreach (`$IP in `$LogData.Keys) {
                `$Data = `$LogData[`$IP]
                
                # Pattern: Lots of HTTP requests but few/no HTTPS (SSL avoidance)
                if (`$Data.HTTPRequests -gt 5 -and `$Data.HTTPSRequests -eq 0) {
                    `$SuspiciousPatterns[`$IP] = "HTTP only access - possible HTTPS avoidance due to SSL issues"
                }
                # Pattern: Recent activity (user is actively trying to access)
                elseif ((`$Data.LastSeen -gt (Get-Date).AddMinutes(-10)) -and (`$Data.HTTPRequests + `$Data.HTTPSRequests -gt 3)) {
                    `$SuspiciousPatterns[`$IP] = "Recent connection attempts - potential SSL issues"
                }
            }
        }
    }
    
    return `$SuspiciousPatterns
}

# Function to deploy certificate to detected problem workstations
function Deploy-ToProblematicWorkstation {
    param(
        [string]`$IPAddress,
        [string]`$CertificatePath,
        [string]`$Reason
    )
    
    Write-Host "  Detected SSL issue for `$IPAddress - `$Reason" -ForegroundColor Yellow
    
    try {
        # Quick test if it's reachable
        if (Test-Connection -ComputerName `$IPAddress -Count 1 -Quiet) {
            `$RemotePath = "\\\\`$IPAddress\\C`$\\temp\\orvale-ca.crt"
            
            # Create temp directory
            `$TempDir = "\\\\`$IPAddress\\C`$\\temp"
            if (-not (Test-Path `$TempDir)) {
                New-Item -Path `$TempDir -ItemType Directory -Force | Out-Null
            }
            
            # Copy and install certificate
            Copy-Item -Path `$CertificatePath -Destination `$RemotePath -Force
            
            Invoke-Command -ComputerName `$IPAddress -ScriptBlock {
                param(`$certPath)
                Import-Certificate -FilePath `$certPath -CertStoreLocation "Cert:\\LocalMachine\\Root"
                Remove-Item `$certPath -Force -ErrorAction SilentlyContinue
            } -ArgumentList "C:\\temp\\orvale-ca.crt"
            
            Write-Host "    ✓ Certificate deployed successfully to `$IPAddress!" -ForegroundColor Green
            
            # Log the deployment
            `$LogEntry = "`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | `$IPAddress | Deployed due to: `$Reason"
            Add-Content -Path (Join-Path `$ScriptDirectory "ssl-deployments.log") -Value `$LogEntry
            
            return `$true
        }
        else {
            Write-Host "    ✗ Cannot reach `$IPAddress (offline or firewall blocking)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "    ✗ Failed to deploy to `$IPAddress`: `$(`$_.Exception.Message)" -ForegroundColor Red
        
        # Log the failure
        `$LogEntry = "`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | `$IPAddress | FAILED: `$(`$_.Exception.Message)"
        Add-Content -Path (Join-Path `$ScriptDirectory "ssl-deployments.log") -Value `$LogEntry
    }
    
    return `$false
}

# Tracking for already handled IPs
`$HandledIPs = @{}
`$HandledIPsFile = Join-Path `$ScriptDirectory "ssl-handled-ips.json"

if (Test-Path `$HandledIPsFile) {
    try {
        `$Content = Get-Content `$HandledIPsFile -Raw
        if (`$Content.Trim()) {
            `$HandledIPs = `$Content | ConvertFrom-Json -AsHashtable
        }
    }
    catch {
        `$HandledIPs = @{}
    }
}

# Main monitoring loop
do {
    `$CurrentTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "`n[`$CurrentTime] - Checking Orvale logs for SSL errors..." -ForegroundColor Cyan
    
    `$AllSSLErrors = @{}
    
    # Check Orvale application logs
    if (Test-Path `$LogPath) {
        `$OrvaleErrors = Get-SSLErrorsFromOrvaleLog -LogPath `$LogPath
        foreach (`$IP in `$OrvaleErrors.Keys) {
            `$AllSSLErrors[`$IP] = "Orvale SSL certificate error detected in logs"
        }
        
        # Check for suspicious patterns
        `$Suspicious = Get-PotentialSSLIssues -LogPath `$LogPath
        foreach (`$IP in `$Suspicious.Keys) {
            if (-not `$AllSSLErrors.ContainsKey(`$IP)) {
                `$AllSSLErrors[`$IP] = `$Suspicious[`$IP]
            }
        }
    }
    
    # Deploy to problematic IPs
    `$NewProblems = @()
    
    foreach (`$IP in `$AllSSLErrors.Keys) {
        if (-not `$HandledIPs.ContainsKey(`$IP)) {
            `$NewProblems += `$IP
        }
        else {
            # Check if we should retry (after 24 hours)
            try {
                `$LastDeployed = [DateTime]::ParseExact(`$HandledIPs[`$IP].DetectedAt, "yyyy-MM-dd HH:mm:ss", `$null)
                `$HoursSinceDeployment = ((Get-Date) - `$LastDeployed).TotalHours
                
                if (`$HoursSinceDeployment -gt 24) {
                    `$NewProblems += `$IP
                }
            }
            catch {
                `$NewProblems += `$IP
            }
        }
    }
    
    if (`$NewProblems.Count -gt 0) {
        Write-Host "[`$CurrentTime] Found `$(`$NewProblems.Count) workstations with potential SSL issues!" -ForegroundColor Yellow
        
        foreach (`$IP in `$NewProblems) {
            `$DeploymentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Write-Host "[`$DeploymentTime] Deploying Orvale CA certificate to `$IP..." -ForegroundColor Cyan
            
            `$Success = Deploy-ToProblematicWorkstation -IPAddress `$IP ``
                                                          -CertificatePath `$CertPath ``
                                                          -Reason `$AllSSLErrors[`$IP]
            
            # Mark as handled
            `$HandledIPs[`$IP] = @{
                DetectedAt = `$DeploymentTime
                Reason = `$AllSSLErrors[`$IP]
                Deployed = `$Success
            }
        }
        
        # Save handled IPs
        `$HandledIPs | ConvertTo-Json | Out-File `$HandledIPsFile -Encoding UTF8
        Write-Host "[`$CurrentTime] Deployment status saved" -ForegroundColor Gray
    }
    else {
        Write-Host "[`$CurrentTime] No new SSL errors detected" -ForegroundColor Gray
    }
    
    # Show statistics
    `$TotalHandled = `$HandledIPs.Count
    `$Deployed = (`$HandledIPs.Values | Where-Object { `$_.Deployed }).Count
    `$Failed = (`$HandledIPs.Values | Where-Object { `$_.Deployed -eq `$false }).Count
    
    Write-Host "[`$CurrentTime] SSL Deployment Statistics:" -ForegroundColor Cyan
    Write-Host "  Total workstations handled: `$TotalHandled" -ForegroundColor White
    Write-Host "  Successfully deployed: `$Deployed" -ForegroundColor Green
    Write-Host "  Failed deployments: `$Failed" -ForegroundColor Red
    
    if (-not `$RunOnce) {
        `$NextCheck = (Get-Date).AddMinutes(`$CheckIntervalMinutes).ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "[`$CurrentTime] Next check: `$NextCheck" -ForegroundColor Gray
        Start-Sleep -Seconds (`$CheckIntervalMinutes * 60)
    }
    
} while (-not `$RunOnce)
"@

    # Write SSL monitoring script
    $sslMonitorPath = Join-Path $DeployPath "monitor-ssl-errors.ps1"
    $sslMonitorScript | Out-File -FilePath $sslMonitorPath -Encoding UTF8
    Write-Host "   ✅ SSL monitoring script created: $sslMonitorPath" -ForegroundColor Green
    
    # Create a scheduled task to run SSL monitoring
    Write-Host "   Setting up SSL monitoring scheduled task..." -ForegroundColor Gray
    try {
        $TaskName = "OrvaleSSLMonitoring"
        $TaskAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$sslMonitorPath`""
        $TaskTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes $SSLMonitorIntervalMinutes)
        $TaskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        $TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnDemand -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -StartWhenAvailable
        
        # Remove existing task if it exists
        if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        }
        
        Register-ScheduledTask -TaskName $TaskName -Action $TaskAction -Trigger $TaskTrigger -Principal $TaskPrincipal -Settings $TaskSettings | Out-Null
        Write-Host "   ✅ SSL monitoring scheduled task created" -ForegroundColor Green
        Write-Host "   📅 Monitoring will check every $SSLMonitorIntervalMinutes minutes" -ForegroundColor Cyan
        
    } catch {
        Write-Host "   ⚠️  Could not create scheduled task: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   You can run SSL monitoring manually: .\monitor-ssl-errors.ps1" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "🔍 SSL Certificate Monitoring Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 SSL Monitoring Features:" -ForegroundColor Yellow
    Write-Host "  • Monitors Orvale application logs for SSL certificate errors" -ForegroundColor White
    Write-Host "  • Automatically detects client workstations with SSL issues" -ForegroundColor White
    Write-Host "  • Deploys Root CA certificate to affected workstations via WinRM" -ForegroundColor White
    Write-Host "  • Tracks deployment history and prevents duplicate deployments" -ForegroundColor White
    Write-Host "  • Runs every $SSLMonitorIntervalMinutes minutes via scheduled task" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 SSL Monitoring Commands:" -ForegroundColor Yellow
    Write-Host "  Manual run:     cd $DeployPath && .\monitor-ssl-errors.ps1 -RunOnce" -ForegroundColor White
    Write-Host "  Check status:   Get-ScheduledTask -TaskName 'OrvaleSSLMonitoring'" -ForegroundColor White
    Write-Host "  View logs:      Get-Content $DeployPath\ssl-deployments.log" -ForegroundColor White
    Write-Host "  Handled IPs:    Get-Content $DeployPath\ssl-handled-ips.json" -ForegroundColor White
}