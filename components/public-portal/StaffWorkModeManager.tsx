'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, TextField, Button,
  Chip, Avatar, Alert, CircularProgress, Divider
} from '@mui/material';
import {
  Circle, Person, AccessTime, Chat, Assignment,
  Notifications, Settings, Save, Refresh
} from '@mui/icons-material';

interface WorkModeSettings {
  current_mode: 'ready' | 'work_mode' | 'ticketing_mode' | 'away' | 'break' | 'offline';
  auto_assign_enabled: boolean;
  max_concurrent_chats: number;
  accept_vip_chats: boolean;
  accept_escalated_chats: boolean;
  preferred_departments: string[];
  status_message?: string;
}

interface StaffWorkModeManagerProps {
  staffInfo: {
    id: string;
    name: string;
    username: string;
  };
  onWorkModeChange?: (newMode: string) => void;
}

export const StaffWorkModeManager = ({ staffInfo, onWorkModeChange }: StaffWorkModeManagerProps) => {
  const [workModeSettings, setWorkModeSettings] = useState<WorkModeSettings>({
    current_mode: 'away',
    auto_assign_enabled: true,
    max_concurrent_chats: 3,
    accept_vip_chats: true,
    accept_escalated_chats: true,
    preferred_departments: [],
    status_message: ''
  });

  const [activeChatCount, setActiveChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Work mode definitions
  const workModes = {
    ready: {
      label: 'Ready',
      description: 'Available for immediate chat assignment',
      color: '#4caf50',
      icon: '🟢',
      autoAccept: true
    },
    work_mode: {
      label: 'Work Mode',
      description: 'Available but focused on other tasks',
      color: '#ff9800',
      icon: '🟡',
      autoAccept: false
    },
    ticketing_mode: {
      label: 'Ticketing Mode',
      description: 'Primarily handling tickets, limited chat availability',
      color: '#2196f3',
      icon: '🔵',
      autoAccept: false
    },
    away: {
      label: 'Away',
      description: 'Temporarily unavailable',
      color: '#ff9800',
      icon: '🟠',
      autoAccept: false
    },
    break: {
      label: 'Break',
      description: 'On break - not available for new chats',
      color: '#9c27b0',
      icon: '⏸️',
      autoAccept: false
    },
    offline: {
      label: 'Offline',
      description: 'Not available for any assignments',
      color: '#757575',
      icon: '⚫',
      autoAccept: false
    }
  };

  const departments = [
    'General Support',
    'Technical Support',
    'IT Support',
    'Network Support',
    'Hardware Support',
    'Software Support'
  ];

  useEffect(() => {
    loadWorkModeSettings();
    loadActiveChatCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadActiveChatCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadWorkModeSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/staff/work-modes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkModeSettings({
          current_mode: data.current_mode || 'away',
          auto_assign_enabled: Boolean(data.auto_assign_enabled),
          max_concurrent_chats: data.max_concurrent_chats || 3,
          accept_vip_chats: Boolean(data.accept_vip_chats),
          accept_escalated_chats: Boolean(data.accept_escalated_chats),
          preferred_departments: Array.isArray(data.preferred_departments) 
            ? data.preferred_departments 
            : (data.preferred_departments ? JSON.parse(data.preferred_departments) : []),
          status_message: data.status_message || ''
        });
        setLastUpdated(new Date(data.updated_at || Date.now()));
      }
    } catch (error) {
      console.error('Error loading work mode settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveChatCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/public-portal/staff/active-chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveChatCount(data.activeChats || 0);
      }
    } catch (error) {
      console.error('Error loading active chat count:', error);
    }
  };

  const saveWorkModeSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/staff/work-modes', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_mode: workModeSettings.current_mode,
          auto_assign_enabled: workModeSettings.auto_assign_enabled,
          max_concurrent_chats: workModeSettings.max_concurrent_chats,
          accept_vip_chats: workModeSettings.accept_vip_chats,
          accept_escalated_chats: workModeSettings.accept_escalated_chats,
          preferred_departments: JSON.stringify(workModeSettings.preferred_departments),
          status_message: workModeSettings.status_message
        })
      });

      if (response.ok) {
        setLastUpdated(new Date());
        onWorkModeChange?.(workModeSettings.current_mode);
        console.log('Work mode settings saved successfully');
      } else {
        console.error('Failed to save work mode settings');
      }
    } catch (error) {
      console.error('Error saving work mode settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (newMode: string) => {
    const mode = newMode as WorkModeSettings['current_mode'];
    const modeConfig = workModes[mode];
    
    setWorkModeSettings(prev => ({
      ...prev,
      current_mode: mode,
      auto_assign_enabled: modeConfig.autoAccept || prev.auto_assign_enabled
    }));
  };

  const getCurrentModeInfo = () => workModes[workModeSettings.current_mode];

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" p={3}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>Loading work mode settings...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const currentMode = getCurrentModeInfo();

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person />
            Work Mode Settings
          </Typography>
          
          {/* Current Status Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Avatar sx={{ backgroundColor: currentMode.color, width: 40, height: 40 }}>
              <Typography variant="h6">{currentMode.icon}</Typography>
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {currentMode.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentMode.description}
              </Typography>
              {workModeSettings.status_message && (
                <Typography variant="caption" color="text.secondary">
                  "{workModeSettings.status_message}"
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                icon={<Chat />}
                label={`${activeChatCount}/${workModeSettings.max_concurrent_chats} chats`}
                color={activeChatCount >= workModeSettings.max_concurrent_chats ? 'error' : 'primary'}
                size="small"
              />
            </Box>
          </Box>

          {/* Availability Alert */}
          {activeChatCount >= workModeSettings.max_concurrent_chats && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You have reached your maximum concurrent chat limit. New chats will not be auto-assigned until you complete current ones.
            </Alert>
          )}
        </Box>

        {/* Work Mode Selection */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Work Mode</InputLabel>
            <Select
              value={workModeSettings.current_mode}
              label="Work Mode"
              onChange={(e) => handleModeChange(e.target.value)}
            >
              {Object.entries(workModes).map(([key, mode]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{mode.icon}</span>
                    <span>{mode.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Status Message (Optional)"
            value={workModeSettings.status_message}
            onChange={(e) => setWorkModeSettings(prev => ({ ...prev, status_message: e.target.value }))}
            placeholder="Let your team know what you're working on..."
            sx={{ mb: 2 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Chat Settings */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Chat Assignment Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={workModeSettings.auto_assign_enabled}
                onChange={(e) => setWorkModeSettings(prev => ({ ...prev, auto_assign_enabled: e.target.checked }))}
                disabled={workModeSettings.current_mode === 'offline' || workModeSettings.current_mode === 'break'}
              />
            }
            label="Auto-assign new chats"
            sx={{ mb: 1, display: 'block' }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              type="number"
              label="Max Concurrent Chats"
              value={workModeSettings.max_concurrent_chats}
              onChange={(e) => setWorkModeSettings(prev => ({ 
                ...prev, 
                max_concurrent_chats: Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
              }))}
              size="small"
              inputProps={{ min: 1, max: 10 }}
              sx={{ flex: 1 }}
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={workModeSettings.accept_vip_chats}
                onChange={(e) => setWorkModeSettings(prev => ({ ...prev, accept_vip_chats: e.target.checked }))}
              />
            }
            label="Accept VIP chats"
            sx={{ mb: 1, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={workModeSettings.accept_escalated_chats}
                onChange={(e) => setWorkModeSettings(prev => ({ ...prev, accept_escalated_chats: e.target.checked }))}
              />
            }
            label="Accept escalated chats"
            sx={{ mb: 1, display: 'block' }}
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={loadWorkModeSettings}
              startIcon={<Refresh />}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={saveWorkModeSettings}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};