# Let's Encrypt SSL Setup for Orvale Management System
# Uses win-acme for automatic SSL certificate management

param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [string]$Email,
    [string]$NodePort = "8080",
    [string]$SocketPort = "3001"
)

Write-Host "Setting up Let's Encrypt SSL for Orvale Management System..." -ForegroundColor Green
Write-Host "Domain: $DomainName" -ForegroundColor Cyan

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Create SSL directory
$sslDir = "C:\SSL"
if (!(Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force
}

# Download win-acme
Write-Host "Downloading win-acme (Let's Encrypt client)..." -ForegroundColor Yellow
$winAcmeUrl = "https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.2.9.1701.x64.pluggable.zip"
$winAcmeZip = Join-Path $sslDir "win-acme.zip"
$winAcmeDir = Join-Path $sslDir "win-acme"

try {
    Invoke-WebRequest -Uri $winAcmeUrl -OutFile $winAcmeZip -UseBasicParsing
    Expand-Archive -Path $winAcmeZip -DestinationPath $winAcmeDir -Force
    Write-Host "win-acme downloaded and extracted successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error downloading win-acme. Please download manually from:" -ForegroundColor Red
    Write-Host "https://github.com/win-acme/win-acme/releases/latest" -ForegroundColor Yellow
    exit 1
}

# Create win-acme settings file
$settingsContent = @"
{
  "ClientName": "win-acme",
  "ConfigurationPath": "C:\\SSL\\win-acme\\settings",
  "LogPath": "C:\\SSL\\win-acme\\logs",
  "CachePath": "C:\\SSL\\win-acme\\cache",
  "DefaultCertificateStore": "WebHosting",
  "ScheduledTaskName": "win-acme renew",
  "NotificationRecipients": ["$Email"],
  "Validation": {
    "HttpPort": 80,
    "HttpsPort": 443
  },
  "Store": {
    "CertificateStore": {
      "StoreName": "WebHosting",
      "KeepExisting": true
    }
  },
  "Installation": {
    "IIS": {
      "SiteId": 1
    }
  }
}
"@

$settingsDir = Join-Path $winAcmeDir "settings"
if (!(Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force
}
$settingsPath = Join-Path $settingsDir "settings.json"
$settingsContent | Out-File -FilePath $settingsPath -Encoding UTF8

# Create certificate request script
$certRequestScript = @"
@echo off
echo Requesting Let's Encrypt certificate for $DomainName...
cd /d "C:\SSL\win-acme"

REM Create certificate with IIS binding
wacs.exe --target iis --siteid 1 --host $DomainName --emailaddress $Email --accepttos --unattended

echo.
echo Certificate request completed!
echo Check the logs in C:\SSL\win-acme\logs for details.
echo.
echo If successful, the certificate will be:
echo 1. Installed in Windows Certificate Store
echo 2. Bound to IIS website
echo 3. Auto-renewal scheduled as Windows Task
echo.
pause
"@

$certScriptPath = Join-Path $sslDir "request-certificate.bat"
$certRequestScript | Out-File -FilePath $certScriptPath -Encoding ASCII

# Create renewal check script
$renewalScript = @"
@echo off
echo Checking SSL certificate renewal...
cd /d "C:\SSL\win-acme"
wacs.exe --renew --unattended
echo Certificate renewal check completed.
"@

$renewalScriptPath = Join-Path $sslDir "check-renewal.bat"
$renewalScript | Out-File -FilePath $renewalScriptPath -Encoding ASCII

Write-Host ""
Write-Host "Let's Encrypt setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure domain $DomainName points to this server's public IP" -ForegroundColor White
Write-Host "2. Configure IIS website (run ssl-setup-iis.ps1 first if not done)" -ForegroundColor White
Write-Host "3. Run: C:\SSL\request-certificate.bat" -ForegroundColor White
Write-Host "4. Certificate will auto-renew via scheduled task" -ForegroundColor White
Write-Host ""
Write-Host "Scripts created:" -ForegroundColor Cyan
Write-Host "  Certificate Request: C:\SSL\request-certificate.bat" -ForegroundColor White
Write-Host "  Renewal Check:      C:\SSL\check-renewal.bat" -ForegroundColor White
Write-Host ""
Write-Host "Important Notes:" -ForegroundColor Red
Write-Host "- Port 80 must be open for domain validation" -ForegroundColor White
Write-Host "- Domain must resolve to this server before requesting certificate" -ForegroundColor White
Write-Host "- Let's Encrypt has rate limits (5 certificates per domain per week)" -ForegroundColor White