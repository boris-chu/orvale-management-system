# Diagnose Orvale Setup Issues
# Run this to check your current deployment status

param(
    [string]$DeployPath = "C:\Orvale"
)

Write-Host "🔍 Orvale Management System - Deployment Diagnosis" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Check if deployment path exists
Write-Host "📂 Checking deployment path..." -ForegroundColor Yellow
if (Test-Path $DeployPath) {
    Write-Host "✅ Deployment path exists: $DeployPath" -ForegroundColor Green
    Set-Location $DeployPath
    Write-Host "   Current directory: $PWD" -ForegroundColor Gray
} else {
    Write-Host "❌ Deployment path NOT found: $DeployPath" -ForegroundColor Red
    Write-Host "   Please check your deployment location" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check required files
Write-Host "📋 Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "https-server.js",
    "socket-server.js", 
    "package.json",
    "ecosystem.config.js",
    "orvale_tickets.db"
)

$foundFiles = @()
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        $foundFiles += $file
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        $missingFiles += $file
        Write-Host "❌ Missing: $file" -ForegroundColor Red
    }
}

Write-Host ""

# Check directory structure
Write-Host "📁 Directory Contents:" -ForegroundColor Yellow
Get-ChildItem | Format-Table Name, Length, LastWriteTime -AutoSize

Write-Host ""

# Check PM2 status
Write-Host "🔧 PM2 Status..." -ForegroundColor Yellow
try {
    pm2 --version | Out-Null
    Write-Host "✅ PM2 is installed" -ForegroundColor Green
    
    Write-Host "Current PM2 processes:" -ForegroundColor Gray
    pm2 list
    
} catch {
    Write-Host "❌ PM2 is NOT installed" -ForegroundColor Red
    Write-Host "   Install with: npm install -g pm2" -ForegroundColor Yellow
}

Write-Host ""

# Check ecosystem config if it exists
if (Test-Path "ecosystem.config.js") {
    Write-Host "⚙️ Ecosystem Configuration:" -ForegroundColor Yellow
    try {
        $content = Get-Content "ecosystem.config.js" -Raw
        if ($content -like "*C:\Orvale\Orvale*") {
            Write-Host "⚠️  FOUND PATH ISSUE: ecosystem.config.js contains duplicate path 'C:\Orvale\Orvale'" -ForegroundColor Red
            Write-Host "   This needs to be fixed!" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Ecosystem config paths look correct" -ForegroundColor Green
        }
        
        # Show relevant lines
        $content | Select-String -Pattern "script:|cwd:|error_file:|out_file:" | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Could not read ecosystem.config.js" -ForegroundColor Red
    }
}

Write-Host ""

# Check SSL certificates
Write-Host "🔒 SSL Certificate Status..." -ForegroundColor Yellow
if (Test-Path "ssl") {
    $sslFiles = @("ca-bundle.crt", "certificate.crt", "server.pfx")
    foreach ($file in $sslFiles) {
        if (Test-Path "ssl\$file") {
            Write-Host "✅ Found: ssl\$file" -ForegroundColor Green
        } else {
            Write-Host "❌ Missing: ssl\$file" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ SSL directory not found" -ForegroundColor Red
}

Write-Host ""

# Summary and recommendations
Write-Host "📊 DIAGNOSIS SUMMARY" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

if ($missingFiles.Count -eq 0) {
    Write-Host "✅ All required files are present" -ForegroundColor Green
} else {
    Write-Host "❌ Missing files detected:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
}

Write-Host ""
Write-Host "🔧 RECOMMENDED ACTIONS:" -ForegroundColor Yellow

if ($missingFiles.Count -gt 0) {
    Write-Host "1. Run the full deployment script to restore missing files:" -ForegroundColor White
    Write-Host "   .\deploy-production.ps1 -Update" -ForegroundColor Gray
}

if (Test-Path "ecosystem.config.js") {
    $content = Get-Content "ecosystem.config.js" -Raw
    if ($content -like "*C:\Orvale\Orvale*") {
        Write-Host "2. Fix PM2 path issues by running:" -ForegroundColor White
        Write-Host "   .\fix-pm2-paths.ps1" -ForegroundColor Gray
    }
}

try {
    pm2 list 2>$null | Out-Null
    $pm2Running = $true
} catch {
    $pm2Running = $false
}

if (-not $pm2Running) {
    Write-Host "3. Install PM2 if not present:" -ForegroundColor White
    Write-Host "   npm install -g pm2" -ForegroundColor Gray
    Write-Host "   npm install -g pm2-windows-service" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 For immediate startup without PM2, use:" -ForegroundColor Yellow
Write-Host "   .\start-simple.ps1" -ForegroundColor Gray