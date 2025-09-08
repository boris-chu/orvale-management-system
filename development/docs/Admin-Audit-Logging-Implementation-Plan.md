# Admin Audit Logging & Activity Tracking Implementation Plan

## 🎯 Overview
This document outlines the implementation plan for converting the placeholder "Recent Admin Activity" section and "View Audit Log" button in the Admin Dashboard into fully functional audit logging and activity tracking features.

## 📋 Current State
- **Recent Admin Activity**: Shows placeholder text with static message
- **View Audit Log Button**: Non-functional button with no onClick handler
- **No Backend Support**: No API endpoints, database schema, or logging infrastructure

## 🏗️ Implementation Plan

### Phase 1: Database Schema & Backend Infrastructure

#### 1.1 Database Schema
Create `admin_audit_log` table:
```sql
CREATE TABLE admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  description TEXT NOT NULL,
  metadata TEXT, -- JSON string for additional details
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_audit_timestamp ON admin_audit_log (timestamp DESC);
CREATE INDEX idx_audit_user ON admin_audit_log (user_id);
CREATE INDEX idx_audit_action ON admin_audit_log (action_type);
```

#### 1.2 Action Types & Categories
```typescript
enum AuditActionType {
  // User Management
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_ROLE_CHANGED = 'user.role_changed',
  
  // Team Management
  TEAM_CREATED = 'team.created',
  TEAM_UPDATED = 'team.updated',
  TEAM_DELETED = 'team.deleted',
  TEAM_MEMBER_ADDED = 'team.member_added',
  TEAM_MEMBER_REMOVED = 'team.member_removed',
  
  // Organization Structure
  SECTION_CREATED = 'section.created',
  SECTION_UPDATED = 'section.updated',
  SECTION_DELETED = 'section.deleted',
  
  // Category Management
  CATEGORY_CREATED = 'category.created',
  CATEGORY_UPDATED = 'category.updated',
  CATEGORY_DELETED = 'category.deleted',
  
  // System Settings
  SETTINGS_UPDATED = 'settings.updated',
  MAINTENANCE_MODE_TOGGLED = 'maintenance.toggled',
  BACKUP_CREATED = 'backup.created',
  BACKUP_RESTORED = 'backup.restored',
  
  // Role & Permissions
  ROLE_CREATED = 'role.created',
  ROLE_UPDATED = 'role.updated',
  ROLE_DELETED = 'role.deleted',
  PERMISSIONS_UPDATED = 'permissions.updated',
  
  // Authentication
  ADMIN_LOGIN = 'auth.admin_login',
  ADMIN_LOGOUT = 'auth.admin_logout',
  PASSWORD_RESET = 'auth.password_reset',
  
  // Portal Management
  PORTAL_SETTINGS_UPDATED = 'portal.settings_updated',
  TEMPLATE_CREATED = 'portal.template_created',
  TEMPLATE_UPDATED = 'portal.template_updated'
}

enum ResourceType {
  USER = 'user',
  TEAM = 'team',
  SECTION = 'section',
  CATEGORY = 'category',
  ROLE = 'role',
  SETTINGS = 'settings',
  PORTAL = 'portal',
  SYSTEM = 'system'
}
```

### Phase 2: API Endpoints

#### 2.1 Audit Logging Service
Create `/lib/audit-logger.ts`:
```typescript
interface AuditLogEntry {
  userId: number;
  username: string;
  actionType: AuditActionType;
  resourceType: ResourceType;
  resourceId?: string;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void>
  static async getRecentActivity(limit?: number): Promise<AuditLogEntry[]>
  static async getUserActivity(userId: number, limit?: number): Promise<AuditLogEntry[]>
  static async getActivityByDateRange(startDate: Date, endDate: Date): Promise<AuditLogEntry[]>
  static async searchActivity(filters: AuditSearchFilters): Promise<AuditLogEntry[]>
}
```

#### 2.2 API Routes
```
/api/admin/audit-log
├── GET    - Retrieve audit log entries (with pagination, filtering)
├── POST   - Create audit log entry (internal use)

/api/admin/recent-activity
├── GET    - Get recent admin activity for dashboard

/api/admin/audit-log/export
├── GET    - Export audit log as CSV/PDF

/api/admin/audit-log/stats
├── GET    - Get audit log statistics for analytics
```

#### 2.3 API Route Implementation
```typescript
// /api/admin/audit-log/route.ts
export async function GET(request: NextRequest) {
  // Handle pagination, filtering, searching
  // Return structured audit log data
}

// /api/admin/recent-activity/route.ts
export async function GET(request: NextRequest) {
  // Return last 10-15 admin activities for dashboard
  // Include user info, action descriptions, timestamps
}
```

### Phase 3: Frontend Components

#### 3.1 Recent Admin Activity Component
Update Admin Dashboard with functional activity feed:
```typescript
// Enhanced Recent Admin Activity section
const [recentActivity, setRecentActivity] = useState([]);
const [activityLoading, setActivityLoading] = useState(true);

const loadRecentActivity = async () => {
  try {
    const response = await fetch('/api/admin/recent-activity');
    const activities = await response.json();
    setRecentActivity(activities);
  } catch (error) {
    console.error('Failed to load recent activity:', error);
  } finally {
    setActivityLoading(false);
  }
};
```

#### 3.2 Audit Log Page
Create `/app/developer/audit-log/page.tsx`:
```typescript
Features:
- Paginated audit log table with sorting
- Advanced filtering (date range, user, action type)
- Search functionality
- Export capabilities (CSV, PDF)
- User detail modal on click
- Action detail expansion
- Real-time updates (optional WebSocket)
```

#### 3.3 Enhanced Dashboard Activity Section
```typescript
// Replace placeholder with real data
<CardContent>
  {activityLoading ? (
    <div className="text-center py-4">
      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
      <p>Loading recent activity...</p>
    </div>
  ) : recentActivity.length > 0 ? (
    <div className="space-y-3">
      {recentActivity.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  ) : (
    <div className="text-center py-8 text-gray-500">
      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No recent admin activity.</p>
    </div>
  )}
</CardContent>
```

### Phase 4: Integration Points

#### 4.1 Audit Logging Integration
Add audit logging to all admin actions:

```typescript
// Example: User Management
const handleCreateUser = async (userData) => {
  try {
    const newUser = await createUser(userData);
    
    // Log the audit event
    await AuditLogger.log({
      userId: currentUser.id,
      username: currentUser.username,
      actionType: AuditActionType.USER_CREATED,
      resourceType: ResourceType.USER,
      resourceId: newUser.id.toString(),
      description: `Created user account for ${newUser.display_name} (${newUser.username})`,
      metadata: {
        userRole: newUser.role_id,
        email: newUser.email
      },
      ipAddress: getClientIP(),
      userAgent: getClientUserAgent()
    });
    
    showNotification('User created successfully', 'success');
  } catch (error) {
    // Handle error
  }
};
```

#### 4.2 Middleware Integration
Create audit logging middleware:
```typescript
// /middleware/audit-middleware.ts
export function withAuditLogging(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    
    // Execute the handler
    const result = await handler(req, res);
    
    // Log based on the response and request
    if (isAuditableAction(req)) {
      await logAuditEvent(req, res, Date.now() - startTime);
    }
    
    return result;
  };
}
```

### Phase 5: UI Components & Design

#### 5.1 Activity Item Component
```typescript
const ActivityItem = ({ activity }) => (
  <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
    <div className="flex-shrink-0">
      <UserAvatar user={{ username: activity.username }} size="sm" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">
        {activity.username}
      </p>
      <p className="text-sm text-gray-600">
        {activity.description}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {formatDistanceToNow(new Date(activity.timestamp))} ago
      </p>
    </div>
    <div className="flex-shrink-0">
      <Badge variant={getActionBadgeVariant(activity.actionType)}>
        {formatActionType(activity.actionType)}
      </Badge>
    </div>
  </div>
);
```

#### 5.2 Audit Log Table Component
```typescript
const AuditLogTable = ({ entries, loading }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
          <th>Resource</th>
          <th>Description</th>
          <th>IP Address</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <AuditLogRow key={entry.id} entry={entry} />
        ))}
      </tbody>
    </table>
  </div>
);
```

### Phase 6: Advanced Features

#### 6.1 Real-time Activity Updates
- WebSocket integration for live activity feed
- Toast notifications for critical admin actions
- Real-time dashboard updates

#### 6.2 Audit Log Analytics
- Admin activity trends and patterns
- User activity heatmaps
- Most common admin actions
- Security event highlighting

#### 6.3 Export & Reporting
- CSV export with custom date ranges
- PDF reports for compliance
- Scheduled audit reports
- Integration with external logging systems

#### 6.4 Security Features
- Tamper-evident logging
- Log integrity verification
- Retention policy enforcement
- Compliance reporting (SOX, HIPAA, etc.)

## 🚀 Implementation Timeline

### Week 1: Foundation
- [ ] Create database schema and migrations
- [ ] Implement basic AuditLogger service
- [ ] Create API endpoints for recent activity

### Week 2: Dashboard Integration
- [ ] Replace placeholder with functional Recent Activity
- [ ] Implement "View Audit Log" button functionality
- [ ] Create basic Audit Log page

### Week 3: Admin Action Integration
- [ ] Add audit logging to User Management
- [ ] Add audit logging to Team Management  
- [ ] Add audit logging to System Settings

### Week 4: Enhancement & Polish
- [ ] Add advanced filtering and search
- [ ] Implement export functionality
- [ ] Add real-time updates
- [ ] Performance optimization

## 📚 Technical Considerations

### Security
- All audit logs should be write-only for non-admin users
- Implement log rotation and archival
- Encrypt sensitive metadata
- Rate limiting on audit log viewing

### Performance
- Database indexing for timestamp and user queries
- Pagination for large datasets  
- Caching for recent activity
- Background processing for heavy operations

### Compliance
- Ensure audit logs meet regulatory requirements
- Implement retention policies
- Support for external audit log forwarding
- Data anonymization options

## 🔧 Configuration Options

```typescript
// /lib/audit-config.ts
export const auditConfig = {
  retention: {
    days: 90, // Keep logs for 90 days
    archiveAfter: 30 // Archive after 30 days
  },
  realTime: {
    enabled: true,
    updateInterval: 30000 // 30 seconds
  },
  export: {
    maxRecords: 10000,
    allowedFormats: ['csv', 'pdf']
  },
  privacy: {
    anonymizeAfter: 365, // Days
    excludeFields: ['user_agent', 'ip_address'] // For certain users
  }
};
```

## 🎯 Success Criteria

1. **Functional Audit Logging**: All admin actions are properly logged with detailed information
2. **Real Dashboard Activity**: Recent Admin Activity shows actual user actions instead of placeholder
3. **Comprehensive Audit Log**: Full audit log page with filtering, search, and export
4. **Performance**: Page loads and interactions remain fast even with large audit datasets
5. **Security**: Audit logs are secure, tamper-evident, and comply with best practices
6. **User Experience**: Intuitive interface for viewing and analyzing admin activity

## 📝 Future Enhancements

- Integration with external SIEM systems
- Machine learning for anomaly detection
- Advanced audit analytics and reporting
- Mobile app support for audit log viewing
- Multi-tenant audit log separation
- Blockchain-based log integrity verification

---

**Note**: This implementation plan provides a comprehensive roadmap for converting the placeholder audit logging functionality into a full-featured admin activity tracking system. The modular approach allows for incremental implementation and testing at each phase.