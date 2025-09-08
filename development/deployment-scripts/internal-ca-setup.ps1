# Internal Certificate Authority Setup for Orvale Management System
# Creates a company CA and server certificates for internal use

param(
    [string]$CompanyName = "Your Company",
    [string]$ServerName = "orvale-server",
    [string]$DomainName = "orvale.internal",
    [array]$AlternativeNames = @("localhost", "orvale", "orvale.local"),
    [int]$ValidityYears = 5
)

Write-Host "Setting up Internal Certificate Authority for $CompanyName..." -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
{
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Create CA directory structure
$caDir = "C:\CompanyCA"
$sslDir = Join-Path (Get-Location) "ssl"

foreach ($dir in @($caDir, "$caDir\certs", "$caDir\private", "$caDir\csr", $sslDir)) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "Created directory: $dir" -ForegroundColor Yellow
    }
}

# Generate CA Root Certificate
Write-Host "Creating Company Root Certificate Authority..." -ForegroundColor Yellow

$caValidDays = $ValidityYears * 365
$serverValidDays = ($ValidityYears - 1) * 365  # Server cert expires 1 year before CA

try {
    # Create Root CA Certificate
    $rootCACert = New-SelfSignedCertificate -Type Custom -KeySpec Signature `
        -Subject "CN=$CompanyName Root CA, O=$CompanyName" `
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 4096 `
        -CertStoreLocation "Cert:\LocalMachine\My" `
        -KeyUsageProperty Sign -KeyUsage CertSign `
        -NotAfter (Get-Date).AddDays($caValidDays)

    Write-Host "✅ Root CA Certificate created" -ForegroundColor Green
    Write-Host "   Thumbprint: $($rootCACert.Thumbprint)" -ForegroundColor Cyan

    # Export Root CA to files
    $rootCACertPath = Join-Path $caDir "CompanyRootCA.crt"
    Export-Certificate -Cert $rootCACert -FilePath $rootCACertPath -Type CERT
    
    # Export Root CA private key (for certificate signing)
    $rootCAPassword = ConvertTo-SecureString -String "CompanyCA2024!" -Force -AsPlainText
    $rootCAPfxPath = Join-Path $caDir "private\CompanyRootCA.pfx"
    Export-PfxCertificate -Cert $rootCACert -FilePath $rootCAPfxPath -Password $rootCAPassword

    Write-Host "✅ Root CA exported to: $rootCACertPath" -ForegroundColor Green

    # Create Server Certificate signed by our CA
    Write-Host "Creating Server Certificate for $DomainName..." -ForegroundColor Yellow

    # Build Subject Alternative Names
    $sanBuilder = [System.Text.StringBuilder]::new()
    $sanBuilder.Append("DNS:$DomainName") | Out-Null
    foreach ($altName in $AlternativeNames) {
        $sanBuilder.Append(",DNS:$altName") | Out-Null
    }
    $sanExtension = $sanBuilder.ToString()

    $serverCert = New-SelfSignedCertificate -Type Custom -DnsName $DomainName -KeySpec Signature `
        -Subject "CN=$DomainName, O=$CompanyName" `
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 2048 `
        -CertStoreLocation "Cert:\LocalMachine\My" `
        -Signer $rootCACert `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1", "2.5.29.17={text}$sanExtension") `
        -NotAfter (Get-Date).AddDays($serverValidDays)

    Write-Host "✅ Server Certificate created" -ForegroundColor Green
    Write-Host "   Thumbprint: $($serverCert.Thumbprint)" -ForegroundColor Cyan

    # Export Server Certificate and Key
    $serverCertPath = Join-Path $sslDir "certificate.crt"
    $serverKeyPath = Join-Path $sslDir "private.key"
    $serverPfxPath = Join-Path $sslDir "server.pfx"
    $caBundlePath = Join-Path $sslDir "ca-bundle.crt"

    # Export server certificate
    Export-Certificate -Cert $serverCert -FilePath $serverCertPath -Type CERT
    
    # Copy CA cert as bundle
    Copy-Item $rootCACertPath $caBundlePath

    # Export PFX with private key
    $serverPassword = ConvertTo-SecureString -String "orvale2024" -Force -AsPlainText
    Export-PfxCertificate -Cert $serverCert -FilePath $serverPfxPath -Password $serverPassword

    # Convert to PEM format if OpenSSL is available
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        Write-Host "Converting certificates to PEM format..." -ForegroundColor Yellow
        
        # Extract private key
        & openssl pkcs12 -in $serverPfxPath -nocerts -out $serverKeyPath -nodes -passin pass:orvale2024
        
        Write-Host "✅ PEM format certificates created" -ForegroundColor Green
    } else {
        Write-Host "⚠️ OpenSSL not found - PFX format only" -ForegroundColor Yellow
        Write-Host "To convert to PEM: Install OpenSSL or use online converter" -ForegroundColor Yellow
    }

    # Install Root CA in Trusted Root Certification Authorities
    Write-Host "Installing Root CA in Windows Certificate Store..." -ForegroundColor Yellow
    $rootStore = Get-Item "Cert:\LocalMachine\Root"
    $rootStore.Open("ReadWrite")
    $rootStore.Add($rootCACert)
    $rootStore.Close()

    Write-Host "✅ Root CA installed in Trusted Root store" -ForegroundColor Green

    # Create certificate deployment script for client machines
    $clientDeployScript = @"
@echo off
echo Installing $CompanyName Root CA Certificate...
echo.

REM Install Root CA certificate
certlm.msc /s
echo Please manually install: $rootCACertPath
echo Location: Trusted Root Certification Authorities

echo.
echo OR use PowerShell command:
echo Import-Certificate -FilePath "$rootCACertPath" -CertStoreLocation "Cert:\LocalMachine\Root"
echo.
pause
"@

    $clientScriptPath = Join-Path $caDir "install-root-ca-clients.bat"
    $clientDeployScript | Out-File -FilePath $clientScriptPath -Encoding ASCII

    Write-Host ""
    Write-Host "🎉 Internal Certificate Authority Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Summary:" -ForegroundColor Cyan
    Write-Host "  Company CA:     $CompanyName Root CA" -ForegroundColor White
    Write-Host "  Server Domain:  $DomainName" -ForegroundColor White
    Write-Host "  Alt Names:      $($AlternativeNames -join ', ')" -ForegroundColor White
    Write-Host "  Validity:       $ValidityYears years" -ForegroundColor White
    Write-Host ""
    Write-Host "📂 Certificate Files:" -ForegroundColor Cyan
    Write-Host "  Root CA:        $rootCACertPath" -ForegroundColor White
    Write-Host "  Server Cert:    $serverCertPath" -ForegroundColor White
    Write-Host "  Private Key:    $serverKeyPath" -ForegroundColor White
    Write-Host "  CA Bundle:      $caBundlePath" -ForegroundColor White
    Write-Host "  Server PFX:     $serverPfxPath (password: orvale2024)" -ForegroundColor White
    Write-Host ""
    Write-Host "🖥️ Client Deployment:" -ForegroundColor Cyan
    Write-Host "  Script:         $clientScriptPath" -ForegroundColor White
    Write-Host "  Manual Install: Import $rootCACertPath to Trusted Root CAs on all client machines" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Deploy Root CA to all client machines (no browser warnings)" -ForegroundColor White
    Write-Host "  2. Update DNS or hosts files: $DomainName → server IP" -ForegroundColor White
    Write-Host "  3. Start Orvale with HTTPS: pm2 start ecosystem.config.js" -ForegroundColor White
    Write-Host "  4. Access via: https://$DomainName" -ForegroundColor White

} catch {
    Write-Host "❌ Error creating certificates: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create renewal script for future use
$renewalScript = @"
# Certificate Renewal Script
# Run this script 1 year before expiration

param([string]`$DomainName = "$DomainName")

Write-Host "Renewing server certificate for `$DomainName..."

# Find existing CA and server certificates
`$rootCA = Get-ChildItem -Path "Cert:\LocalMachine\My" | Where-Object { `$_.Subject -like "*$CompanyName Root CA*" }
`$oldServerCert = Get-ChildItem -Path "Cert:\LocalMachine\My" | Where-Object { `$_.Subject -like "*`$DomainName*" -and `$_.Issuer -like "*$CompanyName Root CA*" }

if (`$rootCA -and `$oldServerCert) {
    # Create new server certificate
    `$newServerCert = New-SelfSignedCertificate -Type Custom -DnsName `$DomainName -KeySpec Signature ``
        -Subject "CN=`$DomainName, O=$CompanyName" ``
        -KeyExportPolicy Exportable -HashAlgorithm sha256 -KeyLength 2048 ``
        -CertStoreLocation "Cert:\LocalMachine\My" ``
        -Signer `$rootCA ``
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1", "2.5.29.17={text}DNS:`$DomainName$(if ($AlternativeNames) { ',' + ($AlternativeNames | ForEach-Object { "DNS:`$_" }) -join ',' })") ``
        -NotAfter (Get-Date).AddDays($serverValidDays)
    
    Write-Host "New server certificate created: `$(`$newServerCert.Thumbprint)"
    Write-Host "Don't forget to export and replace certificate files!"
} else {
    Write-Host "Root CA or existing server certificate not found!"
}
"@

$renewalScriptPath = Join-Path $caDir "renew-server-certificate.ps1"
$renewalScript | Out-File -FilePath $renewalScriptPath -Encoding UTF8

Write-Host ""
Write-Host "💡 Certificate Management:" -ForegroundColor Yellow
Write-Host "  Renewal Script: $renewalScriptPath" -ForegroundColor White
Write-Host "  Renew Before:   $($(Get-Date).AddDays($serverValidDays - 90).ToString('yyyy-MM-dd'))" -ForegroundColor White