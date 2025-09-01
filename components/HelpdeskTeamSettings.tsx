'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Alert,
  AlertTitle
} from '@mui/material';
import { 
  Settings, 
  Save,
  RefreshCw,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamPreference {
  team_id: string;
  team_name: string;
  team_label: string;
  is_visible: boolean;
  tab_order: number;
}

interface HelpdeskTeamSettingsProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function HelpdeskTeamSettings({ open, onClose, onSaved }: HelpdeskTeamSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<TeamPreference[]>([]);
  const [, setAvailableTeams] = useState<any[]>([]);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [draggedItem, setDraggedItem] = useState<TeamPreference | null>(null);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      // Load team preferences through API Gateway
      const preferencesResponse = await fetch('/api/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          service: 'helpdesk',
          action: 'get_team_preferences',
          data: {}
        })
      });

      // Load available teams
      const teamsResponse = await fetch('/api/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          service: 'helpdesk',
          action: 'get_teams',
          data: {}
        })
      });

      if (preferencesResponse.ok && teamsResponse.ok) {
        const prefResult = await preferencesResponse.json();
        const teamResult = await teamsResponse.json();
        
        const prefData = prefResult.data?.data || prefResult.data;
        const teamData = teamResult.data?.data || teamResult.data;
        
        setPreferences(prefData.preferences || []);
        setAvailableTeams(teamData.teams || []);
        
        // If user has no preferences yet, create default ones
        if ((prefData.preferences || []).length === 0 && (teamData.teams || []).length > 0) {
          const defaultPrefs = teamData.teams.map((team: any, index: number) => ({
            team_id: team.id,
            team_name: team.name,
            team_label: team.label || team.description,
            is_visible: true, // Show all teams by default
            tab_order: index + 1
          }));
          setPreferences(defaultPrefs);
        }
      } else {
        showNotification('Failed to load team preferences', 'error');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      showNotification('Error loading team preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          service: 'helpdesk',
          action: 'update_team_preferences',
          data: {
            teamPreferences: preferences.map(pref => ({
              team_id: pref.team_id,
              is_visible: pref.is_visible,
              tab_order: pref.tab_order
            }))
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showNotification('Team preferences saved successfully', 'success');
          onSaved(); // Notify parent to refresh
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          showNotification(result.error || 'Failed to save preferences', 'error');
        }
      } else {
        showNotification('Failed to save preferences', 'error');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showNotification('Error saving team preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleTeamVisibility = (teamId: string) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.team_id === teamId 
          ? { ...pref, is_visible: !pref.is_visible }
          : pref
      )
    );
  };

  const moveTeam = (fromIndex: number, toIndex: number) => {
    const newPreferences = [...preferences];
    const [movedItem] = newPreferences.splice(fromIndex, 1);
    newPreferences.splice(toIndex, 0, movedItem);
    
    // Update tab orders
    const updatedPreferences = newPreferences.map((pref, index) => ({
      ...pref,
      tab_order: index + 1
    }));
    
    setPreferences(updatedPreferences);
  };

  const handleDragStart = (e: React.DragEvent, preference: TeamPreference) => {
    setDraggedItem(preference);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPreference: TeamPreference) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const fromIndex = preferences.findIndex(p => p.team_id === draggedItem.team_id);
    const toIndex = preferences.findIndex(p => p.team_id === targetPreference.team_id);
    
    if (fromIndex !== toIndex) {
      moveTeam(fromIndex, toIndex);
    }
    
    setDraggedItem(null);
  };

  const visibleTeamsCount = preferences.filter(p => p.is_visible).length;
  const totalTeamsCount = preferences.length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings className="h-5 w-5" />
          <Typography variant="h6">Helpdesk Team Settings</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert severity={notification.type}>
                {notification.message}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <Typography>Loading team preferences...</Typography>
          </Box>
        ) : (
          <Box>
            {/* Overview */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Team Visibility Configuration</AlertTitle>
              Configure which teams appear as tabs in your helpdesk queue. You can show/hide teams and reorder tabs by dragging.
            </Alert>

            {/* Summary */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>{visibleTeamsCount}</strong> of <strong>{totalTeamsCount}</strong> teams visible
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {preferences.filter(p => p.is_visible).map(pref => (
                  <Chip 
                    key={pref.team_id}
                    label={pref.team_label}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Team List */}
            <Typography variant="h6" sx={{ mb: 2 }}>Team Configuration</Typography>
            
            {preferences.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography color="textSecondary">No teams available</Typography>
              </Box>
            ) : (
              <Box>
                {preferences.map((preference, index) => (
                  <motion.div
                    key={preference.team_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box
                      draggable
                      onDragStart={(e) => handleDragStart(e, preference)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, preference)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        mb: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        backgroundColor: preference.is_visible ? '#ffffff' : '#f9f9f9',
                        cursor: 'move',
                        '&:hover': {
                          backgroundColor: preference.is_visible ? '#f5f5f5' : '#f0f0f0',
                          borderColor: '#d0d0d0'
                        },
                        opacity: preference.is_visible ? 1 : 0.7
                      }}
                    >
                      {/* Drag Handle */}
                      <IconButton size="small" sx={{ mr: 1, cursor: 'grab' }}>
                        <GripVertical />
                      </IconButton>

                      {/* Tab Order */}
                      <Box
                        sx={{
                          minWidth: 32,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: preference.is_visible ? '#1976d2' : '#9e9e9e',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          mr: 2
                        }}
                      >
                        {preference.tab_order}
                      </Box>

                      {/* Team Info */}
                      <Box flex={1}>
                        <Typography variant="body1" fontWeight="medium">
                          {preference.team_label}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {preference.team_name}
                        </Typography>
                      </Box>

                      {/* Visibility Toggle */}
                      <Box display="flex" alignItems="center" gap={1}>
                        {preference.is_visible ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preference.is_visible}
                              onChange={() => toggleTeamVisibility(preference.team_id)}
                              color="primary"
                            />
                          }
                          label={preference.is_visible ? "Visible" : "Hidden"}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            )}

            {/* Instructions */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>💡 Tips:</strong>
                <br />• Drag teams up/down to reorder tabs
                <br />• Use the toggle to show/hide teams from your queue
                <br />• The ESCALATED tab always appears first and cannot be hidden
                <br />• Changes take effect after saving
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          variant="outlined" 
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button 
          variant="contained"
          onClick={savePreferences}
          disabled={saving || loading}
          startIcon={saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}