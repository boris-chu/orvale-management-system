# IIS SSL Setup for Orvale Management System
# Run this script as Administrator

param(
    [string]$DomainName = "your-domain.com",
    [string]$NodePort = "8080",
    [string]$SocketPort = "3001",
    [string]$CertificateThumbprint = ""
)

Write-Host "Setting up IIS SSL Reverse Proxy for Orvale Management System..." -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Install IIS features if not already installed
Write-Host "Installing IIS features..." -ForegroundColor Yellow
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-DirectoryBrowsing -All

# Install URL Rewrite Module (required for reverse proxy)
Write-Host "Installing URL Rewrite Module..." -ForegroundColor Yellow
$rewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$rewritePath = "$env:TEMP\urlrewrite.msi"
Invoke-WebRequest -Uri $rewriteUrl -OutFile $rewritePath
Start-Process msiexec.exe -ArgumentList "/i `"$rewritePath`" /quiet" -Wait

# Install Application Request Routing (ARR)
Write-Host "Installing Application Request Routing..." -ForegroundColor Yellow
$arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
$arrPath = "$env:TEMP\arr.msi"
Invoke-WebRequest -Uri $arrUrl -OutFile $arrPath
Start-Process msiexec.exe -ArgumentList "/i `"$arrPath`" /quiet" -Wait

Write-Host "IIS modules installed. Creating website configuration..." -ForegroundColor Yellow

# Import WebAdministration module
Import-Module WebAdministration

# Create web.config for reverse proxy
$webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- Main application reverse proxy -->
                <rule name="ReverseProxyInboundRule1" stopProcessing="true">
                    <match url="^(?!socket\.io)(.*)" />
                    <conditions>
                        <add input="{CACHE_URL}" pattern="^(https?)://" />
                    </conditions>
                    <action type="Rewrite" url="{C:1}://127.0.0.1:$NodePort/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_PROTO" value="{C:1}" />
                        <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
                        <set name="HTTP_HOST" value="{HTTP_HOST}" />
                    </serverVariables>
                </rule>
                
                <!-- Socket.IO reverse proxy -->
                <rule name="SocketIOProxy" stopProcessing="true">
                    <match url="^socket\.io/(.*)" />
                    <conditions>
                        <add input="{CACHE_URL}" pattern="^(https?)://" />
                    </conditions>
                    <action type="Rewrite" url="{C:1}://127.0.0.1:$SocketPort/socket.io/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_PROTO" value="{C:1}" />
                        <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
                        <set name="HTTP_HOST" value="{HTTP_HOST}" />
                    </serverVariables>
                </rule>
            </rules>
        </rewrite>
        
        <!-- WebSocket support -->
        <webSocket enabled="true" />
        
        <!-- Security headers -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="DENY" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>
        
        <!-- Default document -->
        <defaultDocument>
            <files>
                <clear />
                <add value="default.html" />
            </files>
        </defaultDocument>
    </system.webServer>
</configuration>
"@

# Create IIS website directory
$websitePath = "C:\inetpub\wwwroot\orvale"
if (!(Test-Path $websitePath)) {
    New-Item -ItemType Directory -Path $websitePath -Force
}

# Write web.config
$webConfigPath = Join-Path $websitePath "web.config"
$webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8

# Create default.html for health checks
$defaultHtmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Orvale Management System</title>
    <script>
        // Redirect to HTTPS if not already
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            location.replace('https:' + window.location.href.substring(window.location.protocol.length));
        } else {
            // Redirect to main application
            location.replace('/');
        }
    </script>
</head>
<body>
    <h1>Redirecting to Orvale Management System...</h1>
</body>
</html>
"@

$defaultHtmlPath = Join-Path $websitePath "default.html"
$defaultHtmlContent | Out-File -FilePath $defaultHtmlPath -Encoding UTF8

# Remove default website if it exists
if (Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue) {
    Remove-Website -Name "Default Web Site"
}

# Create new website
New-Website -Name "OrvaleSSL" -Port 80 -PhysicalPath $websitePath

Write-Host "IIS website created. Next steps:" -ForegroundColor Green
Write-Host "1. Install SSL certificate for domain: $DomainName" -ForegroundColor Yellow
Write-Host "2. Add HTTPS binding to the website" -ForegroundColor Yellow
Write-Host "3. Update Orvale app to run on port $NodePort" -ForegroundColor Yellow
Write-Host ""
Write-Host "SSL Certificate Options:" -ForegroundColor Cyan
Write-Host "- Let's Encrypt (free): Use win-acme or Certify SSL Manager" -ForegroundColor White
Write-Host "- Commercial SSL: Purchase from CA and import to IIS" -ForegroundColor White
Write-Host "- Self-signed (development): Use IIS Manager" -ForegroundColor White

if ($CertificateThumbprint) {
    Write-Host "Adding HTTPS binding with provided certificate..." -ForegroundColor Yellow
    New-WebBinding -Name "OrvaleSSL" -Protocol https -Port 443
    $cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $CertificateThumbprint }
    if ($cert) {
        $binding = Get-WebBinding -Name "OrvaleSSL" -Protocol https
        $binding.AddSslCertificate($CertificateThumbprint, "my")
        Write-Host "SSL certificate bound successfully!" -ForegroundColor Green
    }
}