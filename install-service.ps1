# Orvale Management System - Windows Service Installation
# Run this script as Administrator

param(
    [string]$ServiceName = "OrvaleManagementSystem",
    [string]$ServiceDisplayName = "Orvale Management System",
    [string]$ServiceDescription = "Unified platform for tickets, projects, communication, and analytics"
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "Installing Orvale Management System as Windows Service..." -ForegroundColor Green

# Get current directory
$CurrentDir = Get-Location
$ServicePath = Join-Path $CurrentDir "ecosystem.config.js"

Write-Host "Service Path: $ServicePath" -ForegroundColor Yellow

# Install PM2 as Windows service
try {
    # Install PM2 service
    Write-Host "Installing PM2 Windows Service..." -ForegroundColor Yellow
    npm install -g pm2-windows-service
    pm2-service-install -n $ServiceName --cwd $CurrentDir
    
    # Start PM2 ecosystem
    Write-Host "Starting PM2 ecosystem..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
    pm2 save
    
    # Set service to auto-start
    Write-Host "Configuring service for auto-start..." -ForegroundColor Yellow
    Set-Service -Name $ServiceName -StartupType Automatic
    
    Write-Host "Service installation completed successfully!" -ForegroundColor Green
    Write-Host "Service Name: $ServiceName" -ForegroundColor Cyan
    Write-Host "The service will automatically start on system boot." -ForegroundColor Cyan
    
    # Show service status
    Get-Service -Name $ServiceName | Format-Table -AutoSize
    
} catch {
    Write-Host "Error occurred during service installation:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure Windows Firewall to allow ports 80 and 3001" -ForegroundColor White
Write-Host "2. Test the application at http://localhost" -ForegroundColor White
Write-Host "3. Configure automatic database backups" -ForegroundColor White
Write-Host ""
Write-Host "Service Management Commands:" -ForegroundColor Yellow
Write-Host "  Start:   Start-Service $ServiceName" -ForegroundColor White
Write-Host "  Stop:    Stop-Service $ServiceName" -ForegroundColor White
Write-Host "  Status:  Get-Service $ServiceName" -ForegroundColor White
Write-Host "  PM2:     pm2 list" -ForegroundColor White