# Orvale Management System - Production Deployment Script (IP-Based)
# Deploys to C:\Orvale with SSL certificates for IP address access

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,  # The IP address of this server
    
    [string]$CompanyName = "Your Company",
    [string]$DeployPath = "C:\Orvale",
    [string]$ServiceName = "OrvaleManagementSystem"
)

Write-Host "🚀 Deploying Orvale Management System to Production..." -ForegroundColor Green
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Cyan
Write-Host "Server IP: $ServerIP" -ForegroundColor Cyan

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "❌ This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Step 1: Create production directory structure
Write-Host "`n📁 Step 1: Creating production directory structure..." -ForegroundColor Yellow

$directories = @(
    $DeployPath,
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

# Step 2: Build and copy application files
Write-Host "`n🔨 Step 2: Building and copying application..." -ForegroundColor Yellow

try {
    # Build the application
    Write-Host "   Building Next.js application..." -ForegroundColor Gray
    npm run build
    Write-Host "   ✅ Build completed" -ForegroundColor Green

    # Copy all necessary files to production directory
    $filesToCopy = @(
        @{Source = ".next"; Destination = "$DeployPath\.next"},
        @{Source = "public"; Destination = "$DeployPath\public"},
        @{Source = "package.json"; Destination = "$DeployPath\package.json"},
        @{Source = "package-lock.json"; Destination = "$DeployPath\package-lock.json"},
        @{Source = "next.config.js"; Destination = "$DeployPath\next.config.js"},
        @{Source = "https-server.js"; Destination = "$DeployPath\https-server.js"},
        @{Source = "socket-server.js"; Destination = "$DeployPath\socket-server.js"},
        @{Source = "auto-ssl-deployment.js"; Destination = "$DeployPath\auto-ssl-deployment.js"},
        @{Source = "ecosystem.config.js"; Destination = "$DeployPath\ecosystem.config.js"},
        @{Source = "orvale_tickets.db"; Destination = "$DeployPath\orvale_tickets.db"},
        @{Source = "lib"; Destination = "$DeployPath\lib"},
        @{Source = "contexts"; Destination = "$DeployPath\contexts"},
        @{Source = "components"; Destination = "$DeployPath\components"},
        @{Source = "app"; Destination = "$DeployPath\app"},
        @{Source = "hooks"; Destination = "$DeployPath\hooks"},
        @{Source = "middleware.ts"; Destination = "$DeployPath\middleware.ts"},
        @{Source = "config"; Destination = "$DeployPath\config"},
        @{Source = "scripts"; Destination = "$DeployPath\scripts"}
    )

    foreach ($item in $filesToCopy) {
        if (Test-Path $item.Source) {
            Copy-Item -Path $item.Source -Destination $item.Destination -Recurse -Force
            Write-Host "   ✅ Copied: $($item.Source)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Missing: $($item.Source)" -ForegroundColor Yellow
        }
    }

} catch {
    Write-Host "   ❌ Build/Copy failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Install dependencies in production directory
Write-Host "`n📦 Step 3: Installing production dependencies..." -ForegroundColor Yellow

Push-Location $DeployPath
try {
    npm install --production
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Dependency installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Step 4: Setup SSL certificates for IP address
Write-Host "`n🔒 Step 4: Setting up SSL certificates for IP address..." -ForegroundColor Yellow

# Create the certificate generation script
$certScript = @"
param(
    [string]`$ServerIP = "$ServerIP",
    [string]`$CompanyName = "$CompanyName",
    [string]`$SslPath = "$DeployPath\ssl"
)

# Create certificates using PowerShell
try {
    # Create Root CA
    `$rootCA = New-SelfSignedCertificate -Type Custom -KeySpec Signature ``
        -Subject "CN=`$CompanyName Root CA, O=`$CompanyName" ``
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 4096 ``
        -CertStoreLocation "Cert:\LocalMachine\My" ``
        -KeyUsageProperty Sign -KeyUsage CertSign ``
        -NotAfter (Get-Date).AddDays(1825)  # 5 years

    # Create Server Certificate with IP address
    `$serverCert = New-SelfSignedCertificate -Type Custom -KeySpec Signature ``
        -Subject "CN=`$ServerIP, O=`$CompanyName" ``
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 2048 ``
        -CertStoreLocation "Cert:\LocalMachine\My" ``
        -Signer `$rootCA ``
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1", "2.5.29.17={text}IPAddress:`$ServerIP&DNS:localhost&DNS:`$ServerIP") ``
        -NotAfter (Get-Date).AddDays(1460)  # 4 years

    # Export certificates
    Export-Certificate -Cert `$rootCA -FilePath "`$SslPath\ca-bundle.crt" -Type CERT
    Export-Certificate -Cert `$serverCert -FilePath "`$SslPath\certificate.crt" -Type CERT

    # Export private key as PFX
    `$serverPassword = ConvertTo-SecureString -String "orvale2024" -Force -AsPlainText
    `$serverPfxPath = "`$SslPath\server.pfx"
    Export-PfxCertificate -Cert `$serverCert -FilePath `$serverPfxPath -Password `$serverPassword

    # Install Root CA in trusted store
    `$rootStore = Get-Item "Cert:\LocalMachine\Root"
    `$rootStore.Open("ReadWrite")
    `$rootStore.Add(`$rootCA)
    `$rootStore.Close()

    Write-Host "✅ SSL certificates created successfully!" -ForegroundColor Green
    Write-Host "   Root CA Thumbprint: `$(`$rootCA.Thumbprint)" -ForegroundColor Cyan
    Write-Host "   Server Cert Thumbprint: `$(`$serverCert.Thumbprint)" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Certificate creation failed: `$(`$_.Exception.Message)" -ForegroundColor Red
    throw `$_
}
"@

$certScriptPath = Join-Path $DeployPath "create-certificates.ps1"
$certScript | Out-File -FilePath $certScriptPath -Encoding UTF8

# Run certificate creation
try {
    & $certScriptPath -ServerIP $ServerIP -CompanyName $CompanyName -SslPath "$DeployPath\ssl"
    Write-Host "   ✅ SSL certificates created" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Certificate creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Create production environment file
Write-Host "`n⚙️ Step 5: Creating production configuration..." -ForegroundColor Yellow

$envContent = @"
NODE_ENV=production
HOSTNAME=$ServerIP
HTTP_PORT=80
HTTPS_PORT=443
SOCKET_PORT=3001
SSL_KEY_PATH=./ssl/server.pfx
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca-bundle.crt
SSL_PFX_PATH=./ssl/server.pfx
SSL_PFX_PASSWORD=orvale2024
DB_PATH=./orvale_tickets.db
LOG_LEVEL=info
PINO_ENABLED=false
"@

$envPath = Join-Path $DeployPath ".env.local"
$envContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "   ✅ Environment configuration created" -ForegroundColor Green

# Step 6: Update ecosystem config for production paths
Write-Host "`n🔧 Step 6: Updating ecosystem configuration..." -ForegroundColor Yellow

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
        SSL_PFX_PATH: './ssl/server.pfx',
        SSL_PFX_PASSWORD: 'orvale2024',
        SSL_CERT_PATH: './ssl/certificate.crt',
        SSL_CA_PATH: './ssl/ca-bundle.crt',
        AUTO_SSL_DEPLOY: 'true'
      },
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
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

# Step 7: Install and start Windows Service
Write-Host "`n🔧 Step 7: Installing Windows Service..." -ForegroundColor Yellow

Push-Location $DeployPath
try {
    # Install PM2 as Windows service
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Write-Host "   Stopping existing service..." -ForegroundColor Gray
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        pm2 delete all -ErrorAction SilentlyContinue
    }

    # Start PM2 ecosystem
    pm2 start ecosystem.config.js
    pm2 save

    # Install as Windows service if not already
    if (!(Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
        pm2-service-install -n $ServiceName --cwd $DeployPath
    }

    # Set service to auto-start
    Set-Service -Name $ServiceName -StartupType Automatic
    Start-Service -Name $ServiceName

    Write-Host "   ✅ Windows Service installed and started" -ForegroundColor Green

} catch {
    Write-Host "   ⚠️ Service installation warning: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Continuing with manual PM2 startup..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
}
Pop-Location

# Step 8: Configure Windows Firewall
Write-Host "`n🛡️ Step 8: Configuring Windows Firewall..." -ForegroundColor Yellow

$firewallRules = @(
    @{Name = "Orvale HTTPS"; Port = 443},
    @{Name = "Orvale HTTP Redirect"; Port = 80},
    @{Name = "Orvale Socket.IO"; Port = 3001}
)

foreach ($rule in $firewallRules) {
    try {
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol TCP -LocalPort $rule.Port -Action Allow -ErrorAction Stop
        Write-Host "   ✅ Firewall rule added: $($rule.Name) (Port $($rule.Port))" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Firewall rule may already exist: $($rule.Name)" -ForegroundColor Yellow
    }
}

# Step 9: Create quick management script
Write-Host "`n📋 Step 9: Creating management script..." -ForegroundColor Yellow

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
        Write-Host ""
        Write-Host "Application URL: https://$ServerIP" -ForegroundColor Cyan
        Write-Host "Health Check:    https://$ServerIP/api/health" -ForegroundColor Cyan
    }
    "start" { 
        Start-Service $ServiceName -ErrorAction SilentlyContinue
        pm2 start ecosystem.config.js
        Write-Host "✅ Orvale started - Access: https://$ServerIP" -ForegroundColor Green
    }
    "stop" { 
        Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
        pm2 stop all
        Write-Host "⏹️ Orvale stopped" -ForegroundColor Yellow
    }
    "restart" { 
        Restart-Service $ServiceName -ErrorAction SilentlyContinue
        pm2 restart all
        Write-Host "🔄 Orvale restarted - Access: https://$ServerIP" -ForegroundColor Green
    }
    "logs" { 
        Write-Host "=== Recent Logs ===" -ForegroundColor Green
        pm2 logs --lines 20
    }
    "update" {
        Write-Host "Updating from Git repository..." -ForegroundColor Yellow
        git pull
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

# Create CA deployment batch file
$caDeployBatch = @"
@echo off
echo Installing $CompanyName Root CA Certificate...
echo.
echo This will trust the certificate authority for https://$ServerIP
echo.
powershell -Command "Import-Certificate -FilePath '%~dp0ca-bundle.crt' -CertStoreLocation 'Cert:\LocalMachine\Root'"
echo.
echo ✅ Certificate installed successfully!
echo You can now access https://$ServerIP without warnings
echo.
pause
"@

$caDeployPath = Join-Path $DeployPath "ssl\install-ca-certificate.bat"
$caDeployBatch | Out-File -FilePath $caDeployPath -Encoding ASCII
Write-Host "   ✅ CA deployment script created" -ForegroundColor Green

# Final success message
Write-Host ""
Write-Host "🎉 Orvale Management System Production Deployment COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Deployment Location: $DeployPath" -ForegroundColor Cyan
Write-Host "🌐 Application URL:     https://$ServerIP" -ForegroundColor Cyan  
Write-Host "🔧 Service Name:        $ServiceName" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next Step - Deploy CA Certificate:" -ForegroundColor Yellow
Write-Host "  Copy this file to each client machine:" -ForegroundColor White
Write-Host "     $DeployPath\ssl\ca-bundle.crt" -ForegroundColor Cyan
Write-Host "  Or use the batch file:" -ForegroundColor White
Write-Host "     $DeployPath\ssl\install-ca-certificate.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚡ Quick Commands:" -ForegroundColor Yellow
Write-Host "  Status:  cd $DeployPath && .\manage.ps1 status" -ForegroundColor White
Write-Host "  Restart: cd $DeployPath && .\manage.ps1 restart" -ForegroundColor White
Write-Host "  Logs:    cd $DeployPath && .\manage.ps1 logs" -ForegroundColor White
Write-Host "  Update:  cd $DeployPath && .\manage.ps1 update" -ForegroundColor White
Write-Host ""
Write-Host "📂 Key Files:" -ForegroundColor Yellow
Write-Host "  App:         $DeployPath\https-server.js" -ForegroundColor White
Write-Host "  Database:    $DeployPath\orvale_tickets.db" -ForegroundColor White
Write-Host "  SSL Certs:   $DeployPath\ssl\" -ForegroundColor White
Write-Host "  Logs:        $DeployPath\logs\" -ForegroundColor White
Write-Host "  Management:  $DeployPath\manage.ps1" -ForegroundColor White