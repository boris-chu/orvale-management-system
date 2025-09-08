# Public Portal Typing Detection & Read Receipts - Admin Interface

## 🎯 **Admin Settings Panel Design**

### **Location**: Admin → Chat Management → Public Portal Settings → Communication Features Tab

```javascript
import { 
  Card, CardContent, CardHeader, 
  Switch, Select, MenuItem, TextField, 
  FormControl, FormControlLabel, InputLabel,
  Typography, Divider, Box, Chip
} from '@mui/material';
import { Keyboard, VisibilityOff, Check, AccessTime } from '@mui/icons-material';

const PublicPortalCommunicationSettings = () => {
  const [settings, setSettings] = useState({
    // Typing Detection Settings
    typing_indicators_enabled: true,
    typing_timeout_seconds: 3,
    show_staff_typing_to_guests: true,
    show_guest_typing_to_staff: true,
    typing_indicator_text: 'is typing...',
    typing_indicator_style: 'dots',
    
    // Read Receipts Settings
    read_receipts_enabled: true,
    show_delivery_status: true,
    show_guest_read_status_to_staff: true,
    show_staff_read_status_to_guests: false,
    read_receipt_style: 'checkmarks',
    delivery_status_icons: {
      sent: '✓',
      delivered: '✓✓', 
      read: '✓✓'
    }
  });

  return (
    <div className="space-y-6">
      {/* Typing Detection Section */}
      <Card>
        <CardHeader>
          <Typography variant="h6" className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Typing Detection & Indicators
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure how typing indicators work between guests and staff
          </Typography>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master Toggle */}
          <FormControlLabel
            control={
              <Switch 
                checked={settings.typing_indicators_enabled}
                onChange={(e) => updateSetting('typing_indicators_enabled', e.target.checked)}
              />
            }
            label="Enable Typing Indicators"
          />
          
          {settings.typing_indicators_enabled && (
            <Box className="ml-8 space-y-4">
              {/* Typing Timeout */}
              <FormControl size="small" className="min-w-48">
                <InputLabel>Typing Timeout</InputLabel>
                <Select
                  value={settings.typing_timeout_seconds}
                  label="Typing Timeout"
                  onChange={(e) => updateSetting('typing_timeout_seconds', e.target.value)}
                >
                  <MenuItem value={1}>1 second</MenuItem>
                  <MenuItem value={2}>2 seconds</MenuItem>
                  <MenuItem value={3}>3 seconds</MenuItem>
                  <MenuItem value={5}>5 seconds</MenuItem>
                  <MenuItem value={10}>10 seconds</MenuItem>
                </Select>
              </FormControl>
              
              {/* Visibility Controls */}
              <div className="space-y-2">
                <Typography variant="subtitle2">Visibility Settings</Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.show_staff_typing_to_guests}
                      onChange={(e) => updateSetting('show_staff_typing_to_guests', e.target.checked)}
                    />
                  }
                  label="Show staff typing to guests"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.show_guest_typing_to_staff}
                      onChange={(e) => updateSetting('show_guest_typing_to_staff', e.target.checked)}
                    />
                  }
                  label="Show guest typing to staff"
                />
              </div>
              
              {/* Indicator Style */}
              <FormControl size="small" className="min-w-48">
                <InputLabel>Indicator Style</InputLabel>
                <Select
                  value={settings.typing_indicator_style}
                  label="Indicator Style"
                  onChange={(e) => updateSetting('typing_indicator_style', e.target.value)}
                >
                  <MenuItem value="dots">Animated dots (...)</MenuItem>
                  <MenuItem value="text">Text only</MenuItem>
                  <MenuItem value="pulse">Pulsing indicator</MenuItem>
                </Select>
              </FormControl>
              
              {/* Custom Text */}
              <TextField
                size="small"
                label="Typing Indicator Text"
                value={settings.typing_indicator_text}
                onChange={(e) => updateSetting('typing_indicator_text', e.target.value)}
                placeholder="is typing..."
                className="min-w-64"
              />
              
              {/* Live Preview */}
              <Box className="bg-gray-50 p-3 rounded">
                <Typography variant="caption" color="text.secondary">Preview:</Typography>
                <div className="flex items-center gap-2 mt-1">
                  <Chip size="small" label="Support Agent" />
                  <span className="text-sm text-gray-600">
                    {settings.typing_indicator_text}
                    {settings.typing_indicator_style === 'dots' && (
                      <span className="animate-pulse">...</span>
                    )}
                  </span>
                </div>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Read Receipts Section */}
      <Card>
        <CardHeader>
          <Typography variant="h6" className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            Read Receipts & Delivery Status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control message delivery confirmations and read receipts
          </Typography>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master Toggle */}
          <FormControlLabel
            control={
              <Switch 
                checked={settings.read_receipts_enabled}
                onChange={(e) => updateSetting('read_receipts_enabled', e.target.checked)}
              />
            }
            label="Enable Read Receipts & Delivery Status"
          />
          
          {settings.read_receipts_enabled && (
            <Box className="ml-8 space-y-4">
              {/* Delivery Status */}
              <FormControlLabel
                control={
                  <Switch 
                    checked={settings.show_delivery_status}
                    onChange={(e) => updateSetting('show_delivery_status', e.target.checked)}
                  />
                }
                label="Show delivery status (sent, delivered)"
              />
              
              {/* Visibility Controls */}
              <div className="space-y-2">
                <Typography variant="subtitle2">Read Status Visibility</Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.show_guest_read_status_to_staff}
                      onChange={(e) => updateSetting('show_guest_read_status_to_staff', e.target.checked)}
                    />
                  }
                  label="Show guest read status to staff"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.show_staff_read_status_to_guests}
                      onChange={(e) => updateSetting('show_staff_read_status_to_guests', e.target.checked)}
                    />
                  }
                  label="Show staff read status to guests"
                />
                
                {/* Privacy Warning */}
                {settings.show_staff_read_status_to_guests && (
                  <Box className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                    <Typography variant="caption" className="flex items-center gap-1">
                      <VisibilityOff className="w-4 h-4" />
                      Privacy Note: Guests will see when staff read their messages
                    </Typography>
                  </Box>
                )}
              </div>
              
              {/* Receipt Style */}
              <FormControl size="small" className="min-w-48">
                <InputLabel>Receipt Display Style</InputLabel>
                <Select
                  value={settings.read_receipt_style}
                  label="Receipt Display Style"
                  onChange={(e) => updateSetting('read_receipt_style', e.target.value)}
                >
                  <MenuItem value="checkmarks">Checkmarks only</MenuItem>
                  <MenuItem value="timestamps">Timestamps only</MenuItem>
                  <MenuItem value="both">Checkmarks + timestamps</MenuItem>
                </Select>
              </FormControl>
              
              {/* Custom Icons */}
              <div className="space-y-2">
                <Typography variant="subtitle2">Status Icons</Typography>
                <div className="grid grid-cols-3 gap-4">
                  <TextField
                    size="small"
                    label="Sent"
                    value={settings.delivery_status_icons.sent}
                    onChange={(e) => updateDeliveryIcon('sent', e.target.value)}
                    placeholder="✓"
                  />
                  <TextField
                    size="small"
                    label="Delivered"
                    value={settings.delivery_status_icons.delivered}
                    onChange={(e) => updateDeliveryIcon('delivered', e.target.value)}
                    placeholder="✓✓"
                  />
                  <TextField
                    size="small"
                    label="Read"
                    value={settings.delivery_status_icons.read}
                    onChange={(e) => updateDeliveryIcon('read', e.target.value)}
                    placeholder="✓✓"
                  />
                </div>
              </div>
              
              {/* Live Preview */}
              <Box className="bg-gray-50 p-3 rounded">
                <Typography variant="caption" color="text.secondary">Message Preview:</Typography>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-blue-500 text-white p-2 rounded-lg max-w-xs">
                      <div>Hello, how can I help you?</div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-75">
                          {settings.read_receipt_style === 'timestamps' || settings.read_receipt_style === 'both' 
                            ? '2:30 PM' 
                            : ''
                          }
                        </span>
                        <span className="text-xs">
                          {settings.read_receipt_style === 'checkmarks' || settings.read_receipt_style === 'both'
                            ? settings.delivery_status_icons.read
                            : ''
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          variant="contained" 
          onClick={saveSettings}
          className="px-6"
        >
          Save Communication Settings
        </Button>
      </div>
    </div>
  );
};

const updateSetting = (key, value) => {
  setSettings(prev => ({ ...prev, [key]: value }));
};

const updateDeliveryIcon = (status, icon) => {
  setSettings(prev => ({
    ...prev,
    delivery_status_icons: {
      ...prev.delivery_status_icons,
      [status]: icon
    }
  }));
};

const saveSettings = async () => {
  try {
    const response = await fetch('/api/admin/public-portal/communication-settings', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(settings)
    });
    
    if (response.ok) {
      showNotification('Communication settings saved successfully', 'success');
    }
  } catch (error) {
    showNotification('Failed to save settings', 'error');
  }
};
```

## 🔄 **Socket.io Events for Typing & Read Receipts**

### **Typing Detection Events**
```javascript
// Client sends typing start
socket.emit('public_chat_typing_start', {
  sessionId: 'session_123',
  userType: 'guest' | 'staff',
  userId: staffUsername || 'guest'
});

// Client sends typing stop  
socket.emit('public_chat_typing_stop', {
  sessionId: 'session_123',
  userType: 'guest' | 'staff',
  userId: staffUsername || 'guest'
});

// Server broadcasts typing status
socket.to(`public_session_${sessionId}`).emit('public_chat_typing_update', {
  sessionId: 'session_123',
  isTyping: true,
  userType: 'staff',
  displayText: 'Support Agent is typing...',
  expiresAt: '2025-08-25T15:30:00Z'
});
```

### **Read Receipts Events**
```javascript
// Client confirms message received
socket.emit('public_chat_message_delivered', {
  sessionId: 'session_123',
  messageId: 456,
  userType: 'guest' | 'staff',
  timestamp: '2025-08-25T15:30:00Z'
});

// Client confirms message read
socket.emit('public_chat_message_read', {
  sessionId: 'session_123', 
  messageId: 456,
  userType: 'guest' | 'staff',
  timestamp: '2025-08-25T15:30:00Z'
});

// Server updates message status
socket.to(`public_session_${sessionId}`).emit('public_chat_receipt_update', {
  messageId: 456,
  status: 'read',
  timestamp: '2025-08-25T15:30:00Z',
  readBy: 'guest'
});
```

## 📊 **Key Features Summary**

### **Typing Detection Admin Controls:**
- ✅ **Global Enable/Disable** - Turn typing indicators on/off system-wide
- ✅ **Timeout Settings** - Control how long typing indicators show (1-10 seconds)
- ✅ **Visibility Controls** - Show/hide typing between staff and guests
- ✅ **Style Options** - Animated dots, text only, or pulsing indicator
- ✅ **Custom Text** - Personalize typing indicator message
- ✅ **Live Preview** - See changes in real-time

### **Read Receipts Admin Controls:**
- ✅ **Global Enable/Disable** - Control read receipt system
- ✅ **Delivery Status** - Show sent/delivered/read confirmations
- ✅ **Privacy Controls** - Hide staff read status from guests for privacy
- ✅ **Display Styles** - Checkmarks, timestamps, or both
- ✅ **Custom Icons** - Personalize status indicators (✓, ✓✓, etc.)
- ✅ **Live Preview** - Visual message preview with settings applied

Both features are fully integrated with the public portal admin management system and provide enterprise-level control over customer communication features.