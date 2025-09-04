# SSL Certificate Setup for Orvale Management System
# Creates self-signed certificates or helps with commercial certificate setup

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("self-signed", "commercial", "letsencrypt-manual")]
    [string]$CertificateType,
    
    [string]$DomainName = "localhost",
    [string]$Organization = "Orvale Management System",
    [string]$Country = "US",
    [string]$State = "State",
    [string]$City = "City",
    [int]$ValidityDays = 365
)

Write-Host "Setting up SSL Certificate for Orvale Management System..." -ForegroundColor Green
Write-Host "Certificate Type: $CertificateType" -ForegroundColor Cyan
Write-Host "Domain: $DomainName" -ForegroundColor Cyan

# Create SSL directory
$sslDir = Join-Path (Get-Location) "ssl"
if (!(Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force
    Write-Host "Created SSL directory: $sslDir" -ForegroundColor Green
}

function New-SelfSignedCertificate {
    param($Domain, $Organization, $ValidityDays)
    
    Write-Host "Creating self-signed SSL certificate..." -ForegroundColor Yellow
    
    # Create certificate using PowerShell (Windows 8.1/Server 2012 R2+)
    try {
        $cert = New-SelfSignedCertificate -DnsName $Domain -CertStoreLocation "cert:\LocalMachine\My" `
            -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA `
            -HashAlgorithm SHA256 -Provider "Microsoft RSA SChannel Cryptographic Provider" `
            -Subject "CN=$Domain, O=$Organization" -NotAfter (Get-Date).AddDays($ValidityDays)
            
        Write-Host "Certificate created with thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
        
        # Export private key
        $certPassword = ConvertTo-SecureString -String "orvale2024" -Force -AsPlainText
        $keyPath = Join-Path $sslDir "private.key"
        $certPath = Join-Path $sslDir "certificate.crt"
        $pfxPath = Join-Path $sslDir "certificate.pfx"
        
        # Export to PFX first
        Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $certPassword
        
        # Convert PFX to PEM format using OpenSSL (if available) or instructions
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            Write-Host "Converting certificate to PEM format..." -ForegroundColor Yellow
            
            # Extract private key
            & openssl pkcs12 -in $pfxPath -nocerts -out $keyPath -nodes -passin pass:orvale2024
            
            # Extract certificate
            & openssl pkcs12 -in $pfxPath -clcerts -nokeys -out $certPath -passin pass:orvale2024
            
            Write-Host "✅ Certificate files created:" -ForegroundColor Green
            Write-Host "   Private Key: $keyPath" -ForegroundColor White
            Write-Host "   Certificate: $certPath" -ForegroundColor White
            Write-Host "   PFX Archive: $pfxPath" -ForegroundColor White
            
        } else {
            Write-Host "OpenSSL not found. Certificate created in Windows Certificate Store." -ForegroundColor Yellow
            Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To export for Node.js use:" -ForegroundColor Yellow
            Write-Host "1. Run mmc.exe as Administrator" -ForegroundColor White
            Write-Host "2. Add Certificates snap-in for Local Computer" -ForegroundColor White
            Write-Host "3. Navigate to Personal > Certificates" -ForegroundColor White
            Write-Host "4. Export certificate with private key as PFX" -ForegroundColor White
            Write-Host "5. Convert PFX to PEM using online converter or OpenSSL" -ForegroundColor White
        }
        
        return $cert.Thumbprint
        
    } catch {
        Write-Host "Error creating self-signed certificate: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Show-CommercialCertificateInstructions {
    Write-Host "Commercial SSL Certificate Setup Instructions:" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Generate Certificate Signing Request (CSR):" -ForegroundColor Yellow
    Write-Host "   Use IIS Manager or OpenSSL to generate CSR" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Purchase SSL Certificate:" -ForegroundColor Yellow
    Write-Host "   - DigiCert, GlobalSign, Comodo, Let's Encrypt (free)" -ForegroundColor White
    Write-Host "   - Submit CSR to Certificate Authority" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Download Certificate Files:" -ForegroundColor Yellow
    Write-Host "   - Certificate file (.crt or .cer)" -ForegroundColor White
    Write-Host "   - Intermediate certificate (if provided)" -ForegroundColor White
    Write-Host "   - Root CA certificate (if provided)" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Install Certificates:" -ForegroundColor Yellow
    Write-Host "   - Copy certificate files to: $sslDir" -ForegroundColor White
    Write-Host "   - Rename files to: certificate.crt, private.key, ca-bundle.crt" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Update Configuration:" -ForegroundColor Yellow
    Write-Host "   - Modify ecosystem.config.js to use HTTPS server" -ForegroundColor White
    Write-Host "   - Restart Orvale Management System" -ForegroundColor White
}

function Show-LetsEncryptManualInstructions {
    Write-Host "Let's Encrypt Manual Certificate Setup:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Option A: Using Certbot (Linux subsystem):" -ForegroundColor Yellow
    Write-Host "1. Install WSL2 and Ubuntu" -ForegroundColor White
    Write-Host "2. Install Certbot: sudo apt install certbot" -ForegroundColor White
    Write-Host "3. Run: sudo certbot certonly --manual -d $DomainName" -ForegroundColor White
    Write-Host "4. Follow DNS or HTTP verification steps" -ForegroundColor White
    Write-Host "5. Copy certificates from /etc/letsencrypt/live/$DomainName/" -ForegroundColor White
    Write-Host ""
    Write-Host "Option B: Using win-acme (Recommended):" -ForegroundColor Yellow
    Write-Host "1. Run: .\ssl-letsencrypt-setup.ps1 -DomainName $DomainName" -ForegroundColor White
    Write-Host "2. Follow the automated setup process" -ForegroundColor White
    Write-Host ""
    Write-Host "Option C: Manual DNS verification:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://gethttpsforfree.com/" -ForegroundColor White
    Write-Host "2. Follow manual certificate generation steps" -ForegroundColor White
    Write-Host "3. Download and install certificates" -ForegroundColor White
}

# Main execution
switch ($CertificateType) {
    "self-signed" {
        $thumbprint = New-SelfSignedCertificate -Domain $DomainName -Organization $Organization -ValidityDays $ValidityDays
        if ($thumbprint) {
            Write-Host ""
            Write-Host "✅ Self-signed certificate setup completed!" -ForegroundColor Green
            Write-Host "⚠️  Warning: Self-signed certificates will show browser warnings" -ForegroundColor Red
            Write-Host "   Use only for development or internal testing" -ForegroundColor Red
        }
    }
    
    "commercial" {
        Show-CommercialCertificateInstructions
    }
    
    "letsencrypt-manual" {
        Show-LetsEncryptManualInstructions
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update ecosystem.config.js to use HTTPS server" -ForegroundColor White
Write-Host "2. Configure Windows Firewall for port 443" -ForegroundColor White
Write-Host "3. Restart Orvale Management System" -ForegroundColor White
Write-Host "4. Test HTTPS access: https://$DomainName" -ForegroundColor White