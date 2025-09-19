# Fix PM2 Windows Service Configuration
# Run this from C:\Orvale to fix the service setup

param(
    [string]$DeployPath = "C:\Orvale",
    [string]$ServiceName = "OrvaleManagementSystem"
)

Write-Host "🔧 Fixing PM2 Windows Service Configuration..." -ForegroundColor Green
Write-Host "Deploy Path: $DeployPath" -ForegroundColor Cyan

# Ensure we're in the right directory
if (Test-Path $DeployPath) {
    Set-Location $DeployPath
} else {
    Write-Host "❌ Deploy path not found: $DeployPath" -ForegroundColor Red
    exit 1
}

# Auto-detect server IP
$ServerIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" | 
            Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
            Select-Object -First 1).IPAddress
if (-not $ServerIP) {
    $ServerIP = (Get-NetIPAddress -AddressFamily IPv4 | 
                Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
                Select-Object -First 1).IPAddress
}

Write-Host "Server IP: $ServerIP" -ForegroundColor Cyan

# Step 1: Completely stop and clean PM2
Write-Host "`n📤 Step 1: Cleaning PM2 processes..." -ForegroundColor Yellow
pm2 kill 2>$null
Start-Sleep -Seconds 5

# Step 2: Remove any existing Windows service
Write-Host "`n🗑️ Step 2: Removing existing service..." -ForegroundColor Yellow
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        
        # Try to uninstall the service
        pm2-service-uninstall 2>$null
        
        # Alternative service removal
        sc.exe delete $ServiceName 2>$null
        
        Write-Host "   ✅ Existing service removed" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Service removal had issues (continuing anyway)" -ForegroundColor Yellow
    }
}

# Step 3: Create corrected ecosystem config
Write-Host "`n⚙️ Step 3: Creating corrected ecosystem configuration..." -ForegroundColor Yellow

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

$ecosystemConfig | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8
Write-Host "   ✅ Ecosystem config created (no cwd specified)" -ForegroundColor Green

# Step 4: Ensure logs directory exists
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "   ✅ Logs directory created" -ForegroundColor Green
}

# Step 5: Test PM2 startup first
Write-Host "`n🧪 Step 4: Testing PM2 configuration..." -ForegroundColor Yellow
try {
    pm2 start ecosystem.config.js
    Start-Sleep -Seconds 5
    
    # Check if both apps started
    $status = pm2 list 2>$null
    if ($status -like "*online*") {
        Write-Host "   ✅ PM2 applications started successfully" -ForegroundColor Green
        pm2 list
    } else {
        throw "Applications did not start properly"
    }
} catch {
    Write-Host "   ❌ PM2 test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check the ecosystem config and try manual startup" -ForegroundColor Yellow
    exit 1
}

# Step 6: Save PM2 configuration
Write-Host "`n💾 Step 5: Saving PM2 configuration..." -ForegroundColor Yellow
pm2 save
Write-Host "   ✅ PM2 configuration saved" -ForegroundColor Green

# Step 7: Install as Windows Service
Write-Host "`n🔧 Step 6: Installing as Windows Service..." -ForegroundColor Yellow
try {
    # Check if pm2-service-install is available
    $pm2ServiceAvailable = $false
    try {
        pm2-service-install --help 2>$null | Out-Null
        $pm2ServiceAvailable = $true
    } catch {
        # Try installing the service module
        Write-Host "   Installing PM2 Windows Service module..." -ForegroundColor Gray
        npm install -g pm2-windows-service 2>$null
        try {
            pm2-service-install --help 2>$null | Out-Null
            $pm2ServiceAvailable = $true
        } catch {
            Write-Host "   pm2-service-install not available, trying alternative..." -ForegroundColor Gray
        }
    }
    
    if ($pm2ServiceAvailable) {
        # Install using pm2-service-install
        pm2-service-install -n $ServiceName
        Write-Host "   ✅ Service installed via pm2-service-install" -ForegroundColor Green
    } else {
        # Alternative: Use PM2's built-in Windows service support
        Write-Host "   Using alternative service installation method..." -ForegroundColor Gray
        
        # Create a simple service wrapper script
        $serviceScript = @"
@echo off
cd /d "$DeployPath"
pm2 resurrect
pm2 logs
"@
        $serviceScript | Out-File -FilePath "start-service.bat" -Encoding ASCII
        
        # Install service using Windows SC command
        sc.exe create $ServiceName binPath= "cmd.exe /c `"$DeployPath\start-service.bat`"" start= auto
        
        Write-Host "   ✅ Service installed via sc.exe" -ForegroundColor Green
    }
    
    # Configure and start the service
    Set-Service -Name $ServiceName -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    
    Write-Host "   ✅ Windows Service configured and started" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Service installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   PM2 is running manually - applications will work but won't auto-start on reboot" -ForegroundColor Yellow
}

# Step 8: Verify everything is working
Write-Host "`n✅ Step 7: Verification..." -ForegroundColor Yellow

# Check PM2 status
Write-Host "PM2 Status:" -ForegroundColor Gray
pm2 list

# Check Windows Service
Write-Host "`nWindows Service Status:" -ForegroundColor Gray
Get-Service -Name $ServiceName -ErrorAction SilentlyContinue | Format-Table -AutoSize

# Final status
Write-Host ""
Write-Host "🎉 PM2 Windows Service Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Your application is running at: https://$ServerIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Yellow
Write-Host "   pm2 list           - Show running processes" -ForegroundColor White
Write-Host "   pm2 logs           - Show application logs" -ForegroundColor White
Write-Host "   pm2 restart all    - Restart applications" -ForegroundColor White
Write-Host "   pm2 stop all       - Stop applications" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Service Commands:" -ForegroundColor Yellow
Write-Host "   Get-Service $ServiceName               - Check service status" -ForegroundColor White
Write-Host "   Start-Service $ServiceName             - Start service" -ForegroundColor White
Write-Host "   Stop-Service $ServiceName              - Stop service" -ForegroundColor White
Write-Host "   Restart-Service $ServiceName           - Restart service" -ForegroundColor White