# Enhanced Public Portal Live Chat - Implementation Specifications

## 🎨 **Enhanced Staff Public Queue Interface with Material-UI Color Wheel**

### **Route & Access**
- **URL**: `/chat/public-queue`
- **Access**: Staff button in main chat header with live session count badge
- **Permission**: `public_portal.handle_chats`

### **Material-UI Color Wheel Integration**

#### **Color Customization Panel**
```javascript
import { ColorPicker } from '@mui/x-date-pickers-pro';
import { Card, CardContent, Grid, Typography, Button } from '@mui/material';
import { Palette, Save, RefreshCw } from 'lucide-react';

const PublicQueueThemeCustomizer = () => {
  const [colors, setColors] = useState({
    primary_color: '#e57373',
    secondary_color: '#ffcdd2', 
    accent_color: '#d32f2f',
    sidebar_color: '#fce4ec',
    header_color: '#f48fb1',
    text_primary_color: '#212121',
    text_secondary_color: '#757575',
    border_color: '#f8bbd9',
    success_color: '#4caf50',
    warning_color: '#ff9800',
    error_color: '#f44336',
    // Priority and Status Badge Colors
    priority_high_color: '#f44336',
    priority_urgent_color: '#e91e63', 
    priority_normal_color: '#2196f3',
    abandoned_badge_color: '#ff5722',
    dropped_badge_color: '#ff9800'
  });

  const colorDescriptions = {
    primary_color: 'Main interface color (headers, buttons)',
    secondary_color: 'Background color for cards and surfaces',
    accent_color: 'Action buttons and highlights',
    sidebar_color: 'Queue sidebar background',
    header_color: 'Top header background',
    priority_high_color: 'High priority chat badges',
    priority_urgent_color: 'Urgent priority chat badges',
    abandoned_badge_color: 'Abandoned session indicators',
    dropped_badge_color: 'Staff disconnect indicators'
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Public Queue Theme Customization
        </Typography>
        
        <Grid container spacing={3}>
          {Object.entries(colors).map(([colorKey, colorValue]) => (
            <Grid item xs={12} sm={6} md={4} key={colorKey}>
              <div className="space-y-2">
                <Typography variant="body2" fontWeight="medium">
                  {colorKey.replace(/_/g, ' ').toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {colorDescriptions[colorKey] || 'Custom color setting'}
                </Typography>
                
                <div className="flex items-center gap-3">
                  <ColorPicker
                    value={colorValue}
                    onChange={(newColor) => setColors(prev => ({
                      ...prev,
                      [colorKey]: newColor
                    }))}
                    format="hex"
                    showPreview
                  />
                  <div 
                    className="w-8 h-8 rounded border-2 border-gray-300"
                    style={{ backgroundColor: colorValue }}
                  />
                  <Typography variant="body2" fontFamily="monospace">
                    {colorValue}
                  </Typography>
                </div>
              </div>
            </Grid>
          ))}
        </Grid>
        
        <div className="flex justify-between mt-6">
          <Button 
            variant="outlined" 
            startIcon={<RefreshCw className="w-4 h-4" />}
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Save className="w-4 h-4" />}
            onClick={saveThemeSettings}
          >
            Save Theme Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

#### **Live Preview Panel**
```javascript
const ThemePreviewPanel = ({ colors }) => {
  return (
    <Card style={{ backgroundColor: colors.secondary_color }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Live Theme Preview
        </Typography>
        
        {/* Mock Queue Sidebar */}
        <div 
          className="w-full h-64 rounded p-4"
          style={{ backgroundColor: colors.sidebar_color }}
        >
          <div 
            className="p-2 rounded mb-2"
            style={{ backgroundColor: colors.primary_color, color: 'white' }}
          >
            Public Support Queue
          </div>
          
          {/* Mock Chat Sessions */}
          {[
            { name: 'John Doe', status: 'urgent', badge: 'Urgent' },
            { name: 'Jane Smith', status: 'abandoned', badge: 'Abandoned' },
            { name: 'Bob Johnson', status: 'dropped', badge: 'Dropped' }
          ].map((session, index) => (
            <div key={index} className="flex justify-between items-center p-2 rounded mb-1"
                 style={{ backgroundColor: colors.secondary_color }}>
              <span style={{ color: colors.text_primary_color }}>{session.name}</span>
              <span 
                className="px-2 py-1 text-xs rounded"
                style={{ 
                  backgroundColor: session.status === 'urgent' ? colors.priority_urgent_color :
                                   session.status === 'abandoned' ? colors.abandoned_badge_color :
                                   colors.dropped_badge_color,
                  color: 'white'
                }}
              >
                {session.badge}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

## 🔄 **Enhanced Session Recovery System with Staff Disconnect Handling**

### **Staff Disconnect Detection**
```javascript
// Socket.io disconnect handling on server
io.on('connection', (socket) => {
  socket.on('disconnect', (reason) => {
    handleStaffDisconnect(socket.userId, reason);
  });
});

const handleStaffDisconnect = async (staffUsername, reason) => {
  try {
    // Find active public chat sessions assigned to this staff member
    const activeSessions = await db.all(`
      SELECT session_id, visitor_name, priority_level 
      FROM public_chat_sessions_enhanced 
      WHERE assigned_to = ? AND status = 'active'
    `, [staffUsername]);

    for (const session of activeSessions) {
      // Log the disconnect event
      await db.run(`
        INSERT INTO public_chat_session_events (
          session_id, event_type, event_data, staff_username
        ) VALUES (?, ?, ?, ?)
      `, [
        session.session_id,
        'staff_disconnect',
        JSON.stringify({ reason, disconnect_time: new Date().toISOString() }),
        staffUsername
      ]);

      // Update session status and boost priority
      const newPriority = boostPriority(session.priority_level);
      
      await db.run(`
        UPDATE public_chat_sessions_enhanced 
        SET 
          status = 'staff_disconnected',
          previously_assigned_to = assigned_to,
          assigned_to = NULL,
          priority_level = ?,
          priority_reason = 'staff_disconnect',
          priority_boosted_at = CURRENT_TIMESTAMP,
          staff_disconnect_count = staff_disconnect_count + 1
        WHERE session_id = ?
      `, [newPriority, session.session_id]);

      // Notify guest about staff disconnect
      io.to(`guest_${session.session_id}`).emit('staff_disconnected', {
        message: 'Your support agent has been disconnected. We are connecting you with another agent.',
        showBadge: true,
        badgeText: 'Reconnecting...',
        priority: newPriority
      });

      // Auto-requeue for next available staff
      await autoAssignToReadyStaff(session.session_id);
    }

    // Update staff work mode to offline
    await db.run(`
      UPDATE staff_work_modes 
      SET current_mode = 'offline', updated_at = CURRENT_TIMESTAMP 
      WHERE username = ?
    `, [staffUsername]);

  } catch (error) {
    console.error('Error handling staff disconnect:', error);
  }
};

const boostPriority = (currentPriority) => {
  switch (currentPriority) {
    case 'normal': return 'high';
    case 'high': return 'urgent';
    case 'urgent': return 'urgent'; // Max priority
    case 'vip': return 'vip'; // VIP stays VIP
    default: return 'high';
  }
};
```

### **Automatic Assignment to Ready Staff**
```javascript
const autoAssignToReadyStaff = async (sessionId) => {
  try {
    // Get available staff in 'ready' mode with capacity
    const availableStaff = await db.all(`
      SELECT swm.username, swm.max_concurrent_chats,
             COUNT(pcs.assigned_to) as current_chats
      FROM staff_work_modes swm
      LEFT JOIN public_chat_sessions_enhanced pcs 
        ON swm.username = pcs.assigned_to 
        AND pcs.status = 'active'
      WHERE swm.current_mode = 'ready' 
        AND swm.auto_assign_enabled = 1
      GROUP BY swm.username
      HAVING current_chats < swm.max_concurrent_chats
      ORDER BY current_chats ASC, RANDOM()
    `);

    if (availableStaff.length > 0) {
      const assignedStaff = availableStaff[0];
      
      // Assign session to available staff
      await db.run(`
        UPDATE public_chat_sessions_enhanced 
        SET 
          assigned_to = ?,
          assigned_at = CURRENT_TIMESTAMP,
          status = 'active',
          auto_assigned = 1,
          assignment_attempts = assignment_attempts + 1
        WHERE session_id = ?
      `, [assignedStaff.username, sessionId]);

      // Log assignment event
      await db.run(`
        INSERT INTO public_chat_session_events (
          session_id, event_type, event_data, staff_username
        ) VALUES (?, ?, ?, ?)
      `, [
        sessionId,
        'auto_assignment',
        JSON.stringify({ 
          reason: 'staff_disconnect_recovery',
          assignment_time: new Date().toISOString() 
        }),
        assignedStaff.username
      ]);

      // Notify both staff and guest
      io.to(`staff_${assignedStaff.username}`).emit('new_chat_assigned', {
        sessionId,
        reason: 'staff_disconnect_recovery',
        priority: true
      });

      const session = await db.get('SELECT * FROM public_chat_sessions_enhanced WHERE session_id = ?', [sessionId]);
      io.to(`guest_${sessionId}`).emit('staff_connected', {
        message: 'You have been connected to a support agent.',
        staffName: 'Support Agent',
        showBadge: true,
        badgeText: 'Connected'
      });

      return true;
    } else {
      // No staff available, keep in priority queue
      await db.run(`
        UPDATE public_chat_sessions_enhanced 
        SET status = 'priority_requeued'
        WHERE session_id = ?
      `, [sessionId]);
      
      return false;
    }
  } catch (error) {
    console.error('Error auto-assigning to ready staff:', error);
    return false;
  }
};
```

## 👥 **Staff Work Mode System**

### **Work Mode Interface Component**
```javascript
import { ToggleButton, ToggleButtonGroup, Badge, Chip } from '@mui/material';
import { CheckCircle, Work, Assignment, Offline } from '@mui/icons-material';

const StaffWorkModeSelector = ({ currentMode, onModeChange, activeChatCount = 0 }) => {
  const modes = [
    {
      value: 'ready',
      label: 'Ready',
      icon: <CheckCircle className="w-4 h-4" />,
      color: '#4caf50',
      description: 'Available to receive new chat assignments'
    },
    {
      value: 'work_mode',
      label: 'Work Mode',
      icon: <Work className="w-4 h-4" />,
      color: '#ff9800',
      description: 'Handling active chat sessions'
    },
    {
      value: 'ticketing_mode', 
      label: 'Ticketing',
      icon: <Assignment className="w-4 h-4" />,
      color: '#2196f3',
      description: 'Working on tickets, not available for new chats'
    },
    {
      value: 'offline',
      label: 'Offline',
      icon: <Offline className="w-4 h-4" />,
      color: '#9e9e9e',
      description: 'Not available for any assignments'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Typography variant="h6">Work Mode Status</Typography>
        {activeChatCount > 0 && (
          <Badge badgeContent={activeChatCount} color="primary">
            <Chip label="Active Chats" size="small" />
          </Badge>
        )}
      </div>
      
      <ToggleButtonGroup
        value={currentMode}
        exclusive
        onChange={(e, newMode) => newMode && onModeChange(newMode)}
        aria-label="staff work mode"
        orientation="vertical"
        fullWidth
      >
        {modes.map(mode => (
          <ToggleButton 
            key={mode.value} 
            value={mode.value}
            className="justify-start p-4"
            style={{
              backgroundColor: currentMode === mode.value ? mode.color + '20' : 'transparent',
              borderColor: mode.color
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <div style={{ color: mode.color }}>
                {mode.icon}
              </div>
              <div className="text-left">
                <div className="font-medium">{mode.label}</div>
                <div className="text-xs text-gray-500">{mode.description}</div>
              </div>
              {currentMode === mode.value && (
                <CheckCircle className="w-5 h-5 ml-auto" style={{ color: mode.color }} />
              )}
            </div>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
};
```

### **Enhanced Session Status Badges**
```javascript
const SessionStatusBadge = ({ session, colors }) => {
  const getBadgeConfig = () => {
    switch (session.status) {
      case 'staff_disconnected':
        return {
          color: colors.dropped_badge_color,
          text: 'Dropped Connection',
          icon: '🔄'
        };
      case 'abandoned':
        return {
          color: colors.abandoned_badge_color,
          text: 'Abandoned',
          icon: '❌'
        };
      case 'priority_requeued':
        return {
          color: colors.priority_urgent_color,
          text: 'Priority Requeued',
          icon: '⚡'
        };
      case 'waiting':
        if (session.priority_level === 'urgent') {
          return {
            color: colors.priority_urgent_color,
            text: 'Urgent',
            icon: '🔥'
          };
        }
        return {
          color: colors.priority_normal_color,
          text: 'Waiting',
          icon: '⏳'
        };
      default:
        return {
          color: colors.success_color,
          text: 'Active',
          icon: '✅'
        };
    }
  };

  const config = getBadgeConfig();
  
  return (
    <Chip
      size="small"
      label={`${config.icon} ${config.text}`}
      style={{
        backgroundColor: config.color,
        color: 'white',
        fontWeight: 'medium'
      }}
    />
  );
};
```

## 🚨 **Key Implementation Features Summary**

### **Enhanced Color Customization**
- ✅ **Material-UI Color Wheel Picker** for all interface colors
- ✅ **Live Preview Panel** showing real-time theme changes
- ✅ **Specialized Badge Colors** for abandoned/dropped sessions
- ✅ **Priority Level Color Coding** (normal, high, urgent, VIP)

### **Advanced Session Recovery**
- ✅ **Staff Disconnect Detection** with automatic requeuing
- ✅ **Priority Boost System** (normal → high → urgent)
- ✅ **Abandoned/Dropped Connection Badges** with visual indicators
- ✅ **Automatic Assignment** to ready staff members
- ✅ **Session Event Logging** for full audit trail

### **Staff Work Mode Management**
- ✅ **Four Work Modes**: Ready, Work Mode, Ticketing Mode, Offline  
- ✅ **Auto-Assignment Control** based on staff availability
- ✅ **Concurrent Chat Limits** per staff member
- ✅ **Visual Mode Indicators** with color-coded status
- ✅ **Admin Override Capabilities** for work mode management

This enhanced system provides enterprise-grade public portal live chat functionality with professional customer service features, comprehensive staff management, and robust session recovery capabilities.