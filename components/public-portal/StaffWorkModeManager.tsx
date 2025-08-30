'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, TextField, Button,
  Chip, Avatar, Alert, CircularProgress, Divider, Tabs, Tab, Paper
} from '@mui/material';
import {
  Circle, Person, AccessTime, Chat, Assignment,
  Notifications, Settings, Save, Refresh, AutoAwesome, Groups
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
  const [activeTab, setActiveTab] = useState(0);
  const [workModeSettings, setWorkModeSettings] = useState<WorkModeSettings>({
    current_mode: 'away',
    auto_assign_enabled: true,
    max_concurrent_chats: 1,
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
          max_concurrent_chats: data.max_concurrent_chats || 1,
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
      <CardContent sx={{ p: 1 }}>

        {/* Tabs */}
        <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontSize: '0.75rem',
                padding: '8px 12px'
              }
            }}
          >
            <Tab 
              icon={<Person sx={{ fontSize: 16 }} />} 
              label="Work Mode"
              iconPosition="start" 
            />
            <Tab 
              icon={<AutoAwesome sx={{ fontSize: 16 }} />} 
              label="Chat Settings"
              iconPosition="start" 
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        {activeTab === 0 && (
          <Box>
            {/* Work Mode Selection */}
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

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {currentMode.description}
            </Typography>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={workModeSettings.auto_assign_enabled}
                  onChange={(e) => setWorkModeSettings(prev => ({ ...prev, auto_assign_enabled: e.target.checked }))}
                  disabled={workModeSettings.current_mode === 'offline'}
                />
              }
              label="Auto-assign new chats"
              sx={{ mb: 2, display: 'block' }}
            />

            <TextField
              type="number"
              fullWidth
              label={`Max Concurrent Chats (Current: ${activeChatCount})`}
              value={workModeSettings.max_concurrent_chats}
              onChange={(e) => setWorkModeSettings(prev => ({ 
                ...prev, 
                max_concurrent_chats: Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
              }))}
              size="small"
              inputProps={{ min: 1, max: 10 }}
              sx={{ mb: 2 }}
            />

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
              sx={{ mb: 2, display: 'block' }}
            />
          </Box>
        )}

        {/* Action Buttons & Status */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : ''}
          </Typography>
          
          <Button
            variant="contained"
            size="small"
            onClick={saveWorkModeSettings}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : <Save />}
            sx={{ fontSize: '0.75rem' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};