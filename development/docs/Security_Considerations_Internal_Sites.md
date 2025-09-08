# Security Considerations for Internal Sites
## Orvale Management System Security Guide

### 🚨 **Executive Summary**

While the Orvale Management System operates on an internal network, **security remains critical**. Internal systems are often the primary targets after initial network compromise and handle sensitive organizational data requiring robust protection.

---

## 📊 **Why Internal Security Matters**

### **Threat Landscape Statistics:**
- **80%** of data breaches involve internal actors (malicious or compromised)
- **Average 287 days** to detect internal breaches vs 207 days for external
- **$4.45M** average cost of internal data breaches (IBM Security Report 2023)
- **Internal systems** often contain the most valuable organizational data

### **Attack Vectors for Internal Systems:**
1. **Insider Threats**: Malicious employees, contractors, or compromised accounts
2. **Lateral Movement**: Attackers moving from initial compromise to internal systems
3. **Privilege Escalation**: Exploiting internal systems to gain administrative access
4. **Data Exfiltration**: Internal systems often have direct access to databases and file systems

---

## 🔐 **Security Architecture Overview**

### **Current Security Posture - Orvale Management System:**

#### ✅ **Implemented Security Measures:**
- **Role-Based Access Control (RBAC)**: 86 granular permissions across 5 user roles
- **JWT Authentication**: Token-based authentication with expiration
- **Session Management**: Configurable timeout and lockout policies
- **SQL Injection Protection**: Parameterized queries throughout application
- **Password Policies**: Minimum length, complexity requirements
- **Audit Logging**: Comprehensive ticket and system activity tracking

#### 🔧 **Areas for Enhancement:**
- **Row-Level Security (RLS)**: Data access control at database record level
- **API Security**: Rate limiting, request validation, CORS restrictions
- **Multi-Factor Authentication**: Enhanced security for administrative accounts
- **Data Encryption**: At-rest encryption for sensitive database fields
- **Network Security**: HTTPS enforcement, CSP headers, secure cookies

---

## 🛡️ **Row-Level Security (RLS)**

### **What is Row-Level Security?**
RLS ensures users can only access database records they're authorized to see, enforced at the database level rather than just application logic.

### **Current Data Access Pattern:**
```sql
-- Application-level filtering (current approach)
SELECT * FROM user_tickets 
WHERE employee_number = ? 
OR assigned_team = ?;
```

### **Enhanced RLS Pattern:**
```javascript
// Service-level access control
class SecurityService {
  static async enforceRowAccess(userId, resourceType, resourceId) {
    const user = await getUser(userId);
    const resource = await getResource(resourceType, resourceId);
    
    const accessRules = {
      'ticket': [
        () => resource.employee_number === user.username, // Own ticket
        () => resource.assigned_team === user.team_id,    // Team ticket
        () => user.permissions.includes('ticket.view_all') // Admin access
      ],
      'user_data': [
        () => resource.username === user.username,        // Own data
        () => user.permissions.includes('admin.manage_users') // Admin
      ]
    };
    
    const hasAccess = accessRules[resourceType]?.some(rule => rule());
    if (!hasAccess) {
      throw new SecurityError(`Access denied to ${resourceType}:${resourceId}`);
    }
  }
}
```

### **Database View Implementation:**
```sql
-- Create secure views for different access levels
CREATE VIEW user_accessible_tickets AS
SELECT 
  ut.*,
  CASE 
    WHEN ut.employee_number = @current_user THEN 'owner'
    WHEN ut.assigned_team = @user_team THEN 'team_member'
    ELSE 'restricted'
  END as access_level
FROM user_tickets ut;
```

---

## 🌐 **API Security Framework**

### **1. Authentication & Authorization**
```javascript
// Enhanced JWT middleware with role validation
const authenticateAndAuthorize = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      // Verify JWT token
      const token = extractTokenFromHeader(req);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Load user with permissions
      const user = await getUserWithPermissions(decoded.username);
      if (!user || !user.active) {
        return res.status(401).json({ error: 'Invalid or inactive user' });
      }
      
      // Check required permissions
      const hasPermission = requiredPermissions.every(
        perm => user.permissions.includes(perm)
      );
      
      if (!hasPermission && requiredPermissions.length > 0) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: requiredPermissions 
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
};
```

### **2. Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

// Different limits for different endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Strict limit for auth endpoints
  skipSuccessfulRequests: true
});

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

### **3. Input Validation & Sanitization**
```javascript
const validator = require('validator');

const validateInput = {
  employeeNumber: (input) => {
    if (!validator.isAlphanumeric(input, 'en-US')) {
      throw new ValidationError('Invalid employee number format');
    }
    return validator.escape(input);
  },
  
  ticketId: (input) => {
    if (!validator.isNumeric(input.toString())) {
      throw new ValidationError('Invalid ticket ID format');  
    }
    return parseInt(input);
  },
  
  email: (input) => {
    if (!validator.isEmail(input)) {
      throw new ValidationError('Invalid email format');
    }
    return validator.normalizeEmail(input);
  }
};
```

### **4. CORS Configuration**
```javascript
const cors = require('cors');

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://internal.company.com',
    /\.company\.com$/  // Allow all company subdomains
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## 🔒 **Database Security**

### **1. Database User Separation**
```sql
-- Application user with limited permissions
CREATE USER 'orvale_app'@'localhost' IDENTIFIED BY 'complex_password_here';

-- Grant minimal required permissions
GRANT SELECT, INSERT, UPDATE ON user_tickets TO 'orvale_app'@'localhost';
GRANT SELECT ON users TO 'orvale_app'@'localhost';
GRANT SELECT ON roles TO 'orvale_app'@'localhost';

-- Admin operations require separate user
CREATE USER 'orvale_admin'@'localhost' IDENTIFIED BY 'admin_password_here';
GRANT ALL PRIVILEGES ON orvale_management.* TO 'orvale_admin'@'localhost';
```

### **2. Data Encryption**
```javascript
const crypto = require('crypto');

class DataEncryption {
  static encrypt(data) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  static decrypt(encryptedData) {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Usage for sensitive fields
const user = {
  username: 'john.doe',
  email: DataEncryption.encrypt('john.doe@company.com'),
  phone: DataEncryption.encrypt('555-1234')
};
```

---

## 🔍 **Audit and Monitoring**

### **1. Security Event Logging**
```javascript
const securityLogger = require('pino')({
  name: 'security',
  level: 'info'
});

class SecurityAudit {
  static logAuthAttempt(username, success, ip, userAgent) {
    securityLogger.info({
      event: 'auth_attempt',
      username,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
  
  static logPermissionDenied(username, resource, action, ip) {
    securityLogger.warn({
      event: 'permission_denied',
      username,
      resource,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  }
  
  static logDataAccess(username, table, recordId, operation) {
    securityLogger.info({
      event: 'data_access',
      username,
      table,
      recordId,
      operation,
      timestamp: new Date().toISOString()
    });
  }
}
```

### **2. Anomaly Detection**
```javascript
class SecurityAnalytics {
  static async detectAnomalousActivity(username) {
    const recentActivity = await getRecentUserActivity(username, 24); // 24 hours
    
    const anomalies = {
      unusualHours: this.checkOffHoursAccess(recentActivity),
      suspiciousVolume: this.checkRequestVolume(recentActivity),
      geographicAnomaly: this.checkLocationPattern(recentActivity),
      privilegeEscalation: this.checkPermissionChanges(recentActivity)
    };
    
    if (Object.values(anomalies).some(Boolean)) {
      await this.flagSecurityIncident(username, anomalies);
    }
    
    return anomalies;
  }
}
```

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Foundation (Week 1-2)**
- [ ] Implement row-level security service
- [ ] Add API rate limiting
- [ ] Enhance input validation
- [ ] Configure CORS properly
- [ ] Add security headers middleware

### **Phase 2: Authentication Enhancement (Week 3-4)** 
- [ ] Implement MFA for admin accounts
- [ ] Add session management improvements
- [ ] Create security audit logging
- [ ] Implement anomaly detection

### **Phase 3: Data Protection (Week 5-6)**
- [ ] Add field-level encryption for PII
- [ ] Implement database user separation
- [ ] Create secure backup procedures  
- [ ] Add data retention policies

### **Phase 4: Monitoring & Response (Week 7-8)**
- [ ] Set up security dashboards
- [ ] Create incident response procedures
- [ ] Implement automated threat detection
- [ ] Conduct security assessment

---

## 📋 **Security Checklist**

### **Application Security:**
- [ ] JWT tokens properly secured and expired
- [ ] All user inputs validated and sanitized
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention with proper output encoding
- [ ] CSRF protection for state-changing operations
- [ ] Secure HTTP headers (CSP, HSTS, X-Frame-Options)

### **Database Security:**
- [ ] Database users with minimal required permissions
- [ ] Sensitive data encrypted at rest
- [ ] Database connections encrypted in transit
- [ ] Regular security updates applied
- [ ] Database backup encryption
- [ ] Connection string security

### **Infrastructure Security:**
- [ ] HTTPS enforced for all communications
- [ ] Network segmentation properly configured
- [ ] Firewall rules restricting unnecessary access
- [ ] Regular security patches applied
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

### **Compliance & Governance:**
- [ ] Access reviews conducted quarterly
- [ ] Security policies documented and communicated
- [ ] Employee security training completed
- [ ] Vendor security assessments performed
- [ ] Data classification and handling procedures
- [ ] Privacy impact assessments completed

---

## 🔧 **Configuration Examples**

### **Environment Variables (.env.local):**
```bash
# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_64_chars
JWT_EXPIRATION=1h
ENCRYPTION_KEY=your_256_bit_encryption_key_in_hex

# Database Security
DB_SSL_ENABLED=true
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=30000

# API Security  
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://internal.company.com

# Session Security
SESSION_TIMEOUT=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=30

# Logging
LOG_LEVEL=info
AUDIT_LOG_ENABLED=true
SECURITY_LOG_ENABLED=true
```

### **Security Headers Middleware:**
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  next();
});
```

---

## 📞 **Incident Response**

### **Security Incident Classification:**
- **Critical**: Unauthorized admin access, data breach, system compromise
- **High**: Privilege escalation, multiple failed auth attempts, suspicious data access
- **Medium**: Policy violations, minor security misconfigurations
- **Low**: Informational security events, routine policy enforcement

### **Response Procedures:**
1. **Immediate**: Isolate affected systems, preserve evidence
2. **Assessment**: Determine scope and impact of incident
3. **Containment**: Stop ongoing attack, prevent further damage
4. **Recovery**: Restore systems and validate security
5. **Lessons Learned**: Update procedures and controls

---

## 📚 **Additional Resources**

- [OWASP Top 10 Web Application Security Risks](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [SANS Security Policies](https://www.sans.org/information-security-policy/)

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** March 2025  
**Owner:** Development Team  
**Approved By:** Security Team