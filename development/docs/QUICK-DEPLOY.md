# 🚀 Quick Production Deployment - Internal Windows Server

## 📋 **3-Step Deployment Process**

### **Prerequisites (One-time setup):**
- Windows Server with Administrator access
- Node.js 18+ installed 
- Git installed
- PM2 installed globally: `npm install -g pm2 pm2-windows-service`

---

## **Step 1: Clone and Deploy** 
```powershell
# Clone repository
git clone https://github.com/boris-chu/orvale-management-system.git
cd orvale-management-system

# Run deployment script (as Administrator)
.\deploy-production.ps1 -DomainName "orvale.internal" -CompanyName "Your Company"
```

## **Step 2: Configure DNS**
Add to your DNS server or client machine hosts files:
```
[SERVER_IP]    orvale.internal
```
**Example:** `192.168.1.100    orvale.internal`

## **Step 3: Deploy Root CA to Clients**
On each client machine that will access the system:
```powershell
# Copy C:\Orvale\ssl\ca-bundle.crt to client machine
# Then run as Administrator:
Import-Certificate -FilePath "ca-bundle.crt" -CertStoreLocation "Cert:\LocalMachine\Root"
```

---

## **✅ That's It! Access Your System:**
- **Main App:** https://orvale.internal
- **Admin Portal:** https://orvale.internal/admin
- **Health Check:** https://orvale.internal/api/health

---

## **🔧 Quick Management Commands:**
```powershell
# Go to production directory
cd C:\Orvale

# Check status
.\manage.ps1 status

# Restart service
.\manage.ps1 restart

# View logs
.\manage.ps1 logs

# Update from Git
.\manage.ps1 update
```

---

## **📁 Production Structure:**
```
C:\Orvale\
├── .next\              # Built Next.js app
├── ssl\                # SSL certificates  
├── logs\               # Application logs
├── orvale_tickets.db   # SQLite database
├── ecosystem.config.js # PM2 configuration
├── https-server.js     # HTTPS server
├── manage.ps1          # Management script
└── ...                 # Other app files
```

---

## **🛡️ What the Deployment Script Does:**

1. ✅ **Builds** the Next.js application
2. ✅ **Copies** everything to `C:\Orvale\`  
3. ✅ **Creates** Internal CA and SSL certificates
4. ✅ **Installs** Windows Service for auto-start
5. ✅ **Configures** Windows Firewall
6. ✅ **Starts** the application with HTTPS

---

## **🔄 Updates & Maintenance:**

### **To Update Application:**
```powershell
cd C:\Orvale
.\manage.ps1 update
```

### **To Backup Database:**
```powershell
copy C:\Orvale\orvale_tickets.db C:\Orvale\backups\backup-$(Get-Date -Format 'yyyy-MM-dd').db
```

### **Service Management:**
```powershell
# Windows Service commands
Get-Service OrvaleManagementSystem
Start-Service OrvaleManagementSystem  
Stop-Service OrvaleManagementSystem
Restart-Service OrvaleManagementSystem
```

---

## **🆘 Troubleshooting:**

### **Can't access https://orvale.internal:**
1. Check DNS/hosts file entry
2. Verify Windows Firewall allows ports 80, 443, 3001
3. Check service status: `.\manage.ps1 status`

### **Browser shows security warning:**
1. Root CA certificate not installed on client machine
2. Copy `C:\Orvale\ssl\ca-bundle.crt` to client
3. Import to "Trusted Root Certification Authorities"

### **Service won't start:**
1. Check logs: `.\manage.ps1 logs`
2. Manual start: `cd C:\Orvale && pm2 start ecosystem.config.js`
3. Check port conflicts: `netstat -an | findstr ":443"`

---

**🎉 Your Orvale Management System is now running in production with full SSL security!**