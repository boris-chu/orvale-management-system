# Simple Orvale Management System Startup Script
# Alternative to PM2 for testing or simple deployments

param(
    [string]$ServerIP = "",
    [switch]$Help
)

if ($Help) {
    Write-Host "Simple Orvale Startup Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-simple.ps1                    # Auto-detect IP"
    Write-Host "  .\start-simple.ps1 -ServerIP 192.168.1.100"
    Write-Host ""
    Write-Host "This script starts the Orvale system without PM2 or Windows services."
    Write-Host "Useful for testing or development environments."
    exit
}

# Auto-detect IP if not provided
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

Write-Host "🚀 Starting Orvale Management System (Simple Mode)" -ForegroundColor Green
Write-Host "Server IP: $ServerIP" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:NODE_ENV = "production"
$env:HOSTNAME = $ServerIP
$env:HTTP_PORT = "80"
$env:HTTPS_PORT = "443" 
$env:SOCKET_PORT = "3001"

Write-Host "📂 Current directory: $PWD" -ForegroundColor Gray

# Check if required files exist
$requiredFiles = @("https-server.js", "socket-server.js", "package.json")
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Missing required files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please run from the Orvale deployment directory or run the full deployment script first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All required files found" -ForegroundColor Green

# Start the applications in separate processes
Write-Host ""
Write-Host "🔧 Starting applications..." -ForegroundColor Yellow

try {
    # Start main HTTPS server
    Write-Host "   Starting HTTPS server on port 443..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-Command", "node https-server.js" -WindowStyle Minimized
    
    # Wait a moment
    Start-Sleep -Seconds 2
    
    # Start Socket.IO server  
    Write-Host "   Starting Socket.IO server on port 3001..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-Command", "node socket-server.js" -WindowStyle Minimized
    
    Write-Host "   ✅ Applications started" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Failed to start applications: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Orvale Management System Started!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   Main Application: https://$ServerIP" -ForegroundColor White
Write-Host "   Socket Server:    ws://$ServerIP`:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Management:" -ForegroundColor Yellow
Write-Host "   To stop: Close the PowerShell windows or use Task Manager" -ForegroundColor White
Write-Host "   To check: Get-Process node" -ForegroundColor White
Write-Host "   To kill all: Get-Process node | Stop-Process -Force" -ForegroundColor White
Write-Host ""
Write-Host "📝 Note: This is a simple startup mode. For production, use the full deployment script with PM2." -ForegroundColor Gray