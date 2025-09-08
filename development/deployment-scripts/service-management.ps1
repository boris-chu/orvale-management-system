# Orvale Management System - Service Management Script

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "update", "backup")]
    [string]$Action,
    
    [string]$ServiceName = "OrvaleManagementSystem"
)

function Show-Status {
    Write-Host "=== Orvale Management System Status ===" -ForegroundColor Green
    
    # Windows Service Status
    Write-Host "`nWindows Service:" -ForegroundColor Yellow
    Get-Service -Name $ServiceName | Format-Table -AutoSize
    
    # PM2 Process Status
    Write-Host "PM2 Processes:" -ForegroundColor Yellow
    pm2 list
    
    # Port Status
    Write-Host "`nPort Usage:" -ForegroundColor Yellow
    netstat -an | findstr ":80 " | Select-Object -First 1
    netstat -an | findstr ":3001 " | Select-Object -First 1
    
    Write-Host "`nApplication URLs:" -ForegroundColor Cyan
    Write-Host "  Main App:      https://localhost (HTTP redirects to HTTPS)" -ForegroundColor White
    Write-Host "  Health Check:  https://localhost/api/health" -ForegroundColor White
    Write-Host "  Admin Portal:  https://localhost/admin" -ForegroundColor White
    Write-Host "  HTTP Redirect: http://localhost → https://localhost" -ForegroundColor Yellow
}

function Start-OrvaleService {
    Write-Host "Starting Orvale Management System..." -ForegroundColor Green
    Start-Service -Name $ServiceName
    Start-Sleep -Seconds 3
    Show-Status
}

function Stop-OrvaleService {
    Write-Host "Stopping Orvale Management System..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName
    Start-Sleep -Seconds 3
    Show-Status
}

function Restart-OrvaleService {
    Write-Host "Restarting Orvale Management System..." -ForegroundColor Yellow
    Restart-Service -Name $ServiceName
    Start-Sleep -Seconds 5
    Show-Status
}

function Show-Logs {
    Write-Host "=== Recent Application Logs ===" -ForegroundColor Green
    
    $LogsPath = Join-Path (Get-Location) "logs"
    
    if (Test-Path $LogsPath) {
        Write-Host "`nMain Application Logs:" -ForegroundColor Yellow
        Get-Content "$LogsPath\main-combined.log" -Tail 20 -ErrorAction SilentlyContinue
        
        Write-Host "`nSocket Server Logs:" -ForegroundColor Yellow
        Get-Content "$LogsPath\socket-combined.log" -Tail 20 -ErrorAction SilentlyContinue
        
        Write-Host "`nError Logs:" -ForegroundColor Red
        Get-Content "$LogsPath\main-error.log" -Tail 10 -ErrorAction SilentlyContinue
        Get-Content "$LogsPath\socket-error.log" -Tail 10 -ErrorAction SilentlyContinue
    } else {
        Write-Host "Logs directory not found. Creating logs directory..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $LogsPath -Force
    }
}

function Update-Application {
    Write-Host "Updating Orvale Management System..." -ForegroundColor Green
    
    # Stop service
    Write-Host "1. Stopping services..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName
    
    # Backup database
    Write-Host "2. Creating database backup..." -ForegroundColor Yellow
    $BackupName = "orvale_backup_update_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').db"
    Copy-Item "orvale_tickets.db" "backups\$BackupName" -Force
    
    # Pull latest changes
    Write-Host "3. Pulling latest code..." -ForegroundColor Yellow
    git pull origin main
    
    # Install dependencies
    Write-Host "4. Installing dependencies..." -ForegroundColor Yellow
    npm install
    
    # Build application
    Write-Host "5. Building application..." -ForegroundColor Yellow
    npm run build
    
    # Restart service
    Write-Host "6. Starting services..." -ForegroundColor Yellow
    Start-Service -Name $ServiceName
    
    Write-Host "Update completed successfully!" -ForegroundColor Green
    Start-Sleep -Seconds 5
    Show-Status
}

function Backup-Database {
    Write-Host "Creating database backup..." -ForegroundColor Green
    
    $BackupsPath = Join-Path (Get-Location) "backups"
    if (!(Test-Path $BackupsPath)) {
        New-Item -ItemType Directory -Path $BackupsPath -Force
    }
    
    $BackupName = "orvale_backup_manual_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').db"
    $BackupPath = Join-Path $BackupsPath $BackupName
    
    Copy-Item "orvale_tickets.db" $BackupPath -Force
    
    $BackupSize = (Get-Item $BackupPath).Length / 1MB
    Write-Host "Backup created: $BackupName ($([math]::Round($BackupSize, 2)) MB)" -ForegroundColor Green
    
    # Show recent backups
    Write-Host "`nRecent backups:" -ForegroundColor Yellow
    Get-ChildItem $BackupsPath -Filter "*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | Format-Table Name, Length, LastWriteTime -AutoSize
}

# Main execution
switch ($Action) {
    "start" { Start-OrvaleService }
    "stop" { Stop-OrvaleService }
    "restart" { Restart-OrvaleService }
    "status" { Show-Status }
    "logs" { Show-Logs }
    "update" { Update-Application }
    "backup" { Backup-Database }
}

Write-Host "`nFor help, run: .\service-management.ps1 -Action status" -ForegroundColor Cyan