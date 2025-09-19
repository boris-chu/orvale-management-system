# Quick fix for PM2 path issues
# Run this from your deployment directory (C:\Orvale)

param(
    [string]$DeployPath = "C:\Orvale"
)

Write-Host "🔧 Fixing PM2 Configuration Issues..." -ForegroundColor Green

# Navigate to deployment directory
if (Test-Path $DeployPath) {
    Set-Location $DeployPath
    Write-Host "✅ Changed to deployment directory: $DeployPath" -ForegroundColor Gray
} else {
    Write-Host "❌ Deployment directory not found: $DeployPath" -ForegroundColor Red
    exit 1
}

# Stop current PM2 processes and clear PM2 cache
Write-Host "Stopping current PM2 processes and clearing cache..." -ForegroundColor Yellow
pm2 kill 2>$null  # This completely stops PM2 daemon and clears everything
Start-Sleep -Seconds 3

# Auto-detect server IP
$ServerIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" | 
            Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
            Select-Object -First 1).IPAddress
if (-not $ServerIP) {
    $ServerIP = (Get-NetIPAddress -AddressFamily IPv4 | 
                Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
                Select-Object -First 1).IPAddress
}

Write-Host "Detected Server IP: $ServerIP" -ForegroundColor Cyan

# Recreate ecosystem config with correct paths
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

# Write the corrected config
$ecosystemConfig | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8
Write-Host "✅ Fixed ecosystem.config.js with correct paths" -ForegroundColor Green

# Ensure logs directory exists
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    Write-Host "✅ Created logs directory" -ForegroundColor Green
}

# Verify required files exist
$requiredFiles = @("https-server.js", "socket-server.js", "package.json")
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    } else {
        Write-Host "✅ Found: $file" -ForegroundColor Gray
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Missing required files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Current directory contents:" -ForegroundColor Yellow
    Get-ChildItem | Format-Table Name, Length, LastWriteTime
    exit 1
}

# Start PM2 with corrected config
Write-Host "Starting PM2 applications..." -ForegroundColor Yellow
try {
    pm2 start ecosystem.config.js
    pm2 save
    Write-Host "✅ PM2 applications started successfully!" -ForegroundColor Green
    
    # Show status
    Write-Host ""
    pm2 list
    
    Write-Host ""
    Write-Host "🎉 Applications are now running!" -ForegroundColor Green
    Write-Host "Access your application at: https://$ServerIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Management commands:" -ForegroundColor Yellow
    Write-Host "  pm2 list        - Show running processes" -ForegroundColor White
    Write-Host "  pm2 logs        - Show application logs" -ForegroundColor White
    Write-Host "  pm2 restart all - Restart all applications" -ForegroundColor White
    Write-Host "  pm2 stop all    - Stop all applications" -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to start PM2 applications: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual startup alternative:" -ForegroundColor Yellow
    Write-Host "  node https-server.js" -ForegroundColor White
    Write-Host "  (In separate window) node socket-server.js" -ForegroundColor White
}