# 🚀 1-Step Production Deployment - IP Address Only

## 📋 **Automatic SSL Deployment Process**

### **Prerequisites (One-time setup):**
- Windows Server with Administrator access
- Node.js 18+ installed 
- Git installed
- PM2 installed globally: `npm install -g pm2 pm2-windows-service`

---

## **Step 1: Deploy Everything** 
```powershell
# Clone repository
git clone https://github.com/boris-chu/orvale-management-system.git
cd orvale-management-system

# Run deployment script (as Administrator)
# Replace with YOUR server's IP address
.\deploy-production-ip.ps1 -ServerIP "192.168.1.100" -CompanyName "Your Company"
```

---

## **✅ That's It! Automatic SSL Setup:**

When users visit your server for the first time, they'll see a friendly setup page instead of scary SSL warnings:

1. **User visits:** http://192.168.1.100 (or gets redirected from HTTPS)
2. **Server detects:** New client IP address 
3. **Auto-installer page:** Shows with one-click certificate installation
4. **User clicks:** "Download Auto-Installer" or "Try Automatic Installation"
5. **Certificate installs:** Automatically in the background
6. **User redirected:** To secure https://192.168.1.100 without warnings

## **Access Your System:**
- **Main App:** https://192.168.1.100
- **Admin Portal:** https://192.168.1.100/admin
- **Health Check:** https://192.168.1.100/api/health

*(Replace with your actual server IP)*

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

## **📁 What Gets Deployed:**
```
C:\Orvale\
├── .next\              # Built Next.js app
├── ssl\                # SSL certificates  
│   ├── ca-bundle.crt   # Root CA (install on clients)
│   ├── server.pfx      # Server certificate
│   └── install-ca-certificate.bat  # Client installer
├── logs\               # Application logs
├── orvale_tickets.db   # SQLite database
├── manage.ps1          # Management script
└── ...                 # Other app files
```

---

## **🛡️ What the Deployment Script Does:**

1. ✅ **Builds** the Next.js application
2. ✅ **Copies** everything to `C:\Orvale\`  
3. ✅ **Creates** SSL certificates for your IP address
4. ✅ **Installs** Windows Service for auto-start
5. ✅ **Configures** Windows Firewall (ports 80, 443, 3001)
6. ✅ **Starts** the application with HTTPS

**Everything automated - just run one command!**

---

## **🆘 Troubleshooting:**

### **Browser shows security warning:**
- Root CA certificate not installed on client machine
- Run `C:\Orvale\ssl\install-ca-certificate.bat` as Administrator

### **Can't access the IP address:**
1. Check Windows Firewall allows ports 443, 80, 3001
2. Check service status: `.\manage.ps1 status`
3. Verify correct IP: `ipconfig`

### **Service won't start:**
1. Check logs: `.\manage.ps1 logs`
2. Manual start: `cd C:\Orvale && pm2 start ecosystem.config.js`

---

## **💡 Tips:**

### **For Multiple Servers:**
Deploy the same Root CA (`ca-bundle.crt`) to all clients once, then they can access any of your internal servers without warnings.

### **Database Backup:**
```powershell
copy C:\Orvale\orvale_tickets.db C:\Orvale\backups\backup-$(Get-Date -Format 'yyyy-MM-dd').db
```

### **Remote Management:**
Once deployed, you can manage from any PowerShell with access to C:\Orvale:
```powershell
Invoke-Command -ComputerName SERVER-IP -ScriptBlock { 
    cd C:\Orvale; .\manage.ps1 status 
}
```

---

**🎉 Your Orvale Management System is ready in just 2 steps!**