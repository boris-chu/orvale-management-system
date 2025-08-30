'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Slider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Eye,
  EyeOff,
  Palette,
  Calendar,
  Trophy,
  BarChart3,
  Users,
  Star,
  Clock,
  Target,
  Save,
  RotateCcw,
  Download
} from 'lucide-react';

interface DashboardConfig {
  layout: {
    showStatsCards: boolean;
    showProgressBar: boolean;
    showRecentAchievements: boolean;
    showActivityHeatmap: boolean;
    showLeaderboard: boolean;
    showUpcomingMilestones: boolean;
    showAchievementGallery: boolean;
    showPersonalStats: boolean;
  };
  display: {
    achievementsPerPage: number;
    animationsEnabled: boolean;
    showXPValues: boolean;
    showRarityColors: boolean;
    compactMode: boolean;
    darkModeDefault: boolean;
  };
  privacy: {
    showPublicProfile: boolean;
    shareProgressWithTeam: boolean;
    showInLeaderboards: boolean;
    allowBadgeSharing: boolean;
  };
  notifications: {
    enableAchievementNotifications: boolean;
    enableMilestoneAlerts: boolean;
    enableWeeklyDigest: boolean;
    enableTeamComparisons: boolean;
  };
  customization: {
    allowThemeSelection: boolean;
    allowLayoutCustomization: boolean;
    maxCustomAchievements: number;
    enablePersonalGoals: boolean;
  };
}

const defaultConfig: DashboardConfig = {
  layout: {
    showStatsCards: true,
    showProgressBar: true,
    showRecentAchievements: true,
    showActivityHeatmap: true,
    showLeaderboard: true,
    showUpcomingMilestones: true,
    showAchievementGallery: true,
    showPersonalStats: true
  },
  display: {
    achievementsPerPage: 12,
    animationsEnabled: true,
    showXPValues: true,
    showRarityColors: true,
    compactMode: false,
    darkModeDefault: false
  },
  privacy: {
    showPublicProfile: true,
    shareProgressWithTeam: true,
    showInLeaderboards: true,
    allowBadgeSharing: true
  },
  notifications: {
    enableAchievementNotifications: true,
    enableMilestoneAlerts: true,
    enableWeeklyDigest: false,
    enableTeamComparisons: true
  },
  customization: {
    allowThemeSelection: true,
    allowLayoutCustomization: false,
    maxCustomAchievements: 5,
    enablePersonalGoals: true
  }
};

export default function DashboardSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<DashboardConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/achievements/dashboard-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof DashboardConfig],
        [field]: value
      }
    }));
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/admin/achievements/dashboard-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Dashboard settings saved successfully'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save dashboard settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
  };

  const exportConfiguration = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Typography>Loading dashboard settings...</Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <Typography variant="h5" className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          User Dashboard Settings
        </Typography>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <Alert severity="info">
        These settings control what users see in their personal achievement dashboards. Changes affect all users immediately.
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Layout Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Layout Components
          </Typography>
          
          <div className="space-y-3">
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showStatsCards}
                  onChange={(e) => handleConfigChange('layout', 'showStatsCards', e.target.checked)}
                />
              }
              label="Stats Cards (Total XP, Achievements, etc.)"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showProgressBar}
                  onChange={(e) => handleConfigChange('layout', 'showProgressBar', e.target.checked)}
                />
              }
              label="Overall Progress Bar"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showRecentAchievements}
                  onChange={(e) => handleConfigChange('layout', 'showRecentAchievements', e.target.checked)}
                />
              }
              label="Recent Achievements Section"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showActivityHeatmap}
                  onChange={(e) => handleConfigChange('layout', 'showActivityHeatmap', e.target.checked)}
                />
              }
              label="Activity Heatmap Calendar"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showLeaderboard}
                  onChange={(e) => handleConfigChange('layout', 'showLeaderboard', e.target.checked)}
                />
              }
              label="Team Leaderboard"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showUpcomingMilestones}
                  onChange={(e) => handleConfigChange('layout', 'showUpcomingMilestones', e.target.checked)}
                />
              }
              label="Upcoming Milestones"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showAchievementGallery}
                  onChange={(e) => handleConfigChange('layout', 'showAchievementGallery', e.target.checked)}
                />
              }
              label="Achievement Gallery"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.layout.showPersonalStats}
                  onChange={(e) => handleConfigChange('layout', 'showPersonalStats', e.target.checked)}
                />
              }
              label="Personal Statistics Section"
            />
          </div>
        </Paper>

        {/* Display Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Display Options
          </Typography>
          
          <div className="space-y-4">
            <div>
              <Typography variant="body2" className="mb-2">
                Achievements per page: {config.display.achievementsPerPage}
              </Typography>
              <Slider
                value={config.display.achievementsPerPage}
                onChange={(e, value) => handleConfigChange('display', 'achievementsPerPage', value)}
                min={6}
                max={24}
                step={6}
                marks={[
                  { value: 6, label: '6' },
                  { value: 12, label: '12' },
                  { value: 18, label: '18' },
                  { value: 24, label: '24' }
                ]}
                valueLabelDisplay="auto"
              />
            </div>

            <div className="space-y-3">
              <FormControlLabel
                control={
                  <Switch
                    checked={config.display.animationsEnabled}
                    onChange={(e) => handleConfigChange('display', 'animationsEnabled', e.target.checked)}
                  />
                }
                label="Enable animations and transitions"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.display.showXPValues}
                    onChange={(e) => handleConfigChange('display', 'showXPValues', e.target.checked)}
                  />
                }
                label="Show XP values on achievements"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.display.showRarityColors}
                    onChange={(e) => handleConfigChange('display', 'showRarityColors', e.target.checked)}
                  />
                }
                label="Show rarity color coding"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.display.compactMode}
                    onChange={(e) => handleConfigChange('display', 'compactMode', e.target.checked)}
                  />
                }
                label="Compact display mode"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.display.darkModeDefault}
                    onChange={(e) => handleConfigChange('display', 'darkModeDefault', e.target.checked)}
                  />
                }
                label="Dark mode by default"
              />
            </div>
          </div>
        </Paper>

        {/* Privacy Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Privacy & Sharing
          </Typography>
          
          <div className="space-y-3">
            <FormControlLabel
              control={
                <Switch
                  checked={config.privacy.showPublicProfile}
                  onChange={(e) => handleConfigChange('privacy', 'showPublicProfile', e.target.checked)}
                />
              }
              label="Enable public achievement profiles"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.privacy.shareProgressWithTeam}
                  onChange={(e) => handleConfigChange('privacy', 'shareProgressWithTeam', e.target.checked)}
                />
              }
              label="Share progress with team by default"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.privacy.showInLeaderboards}
                  onChange={(e) => handleConfigChange('privacy', 'showInLeaderboards', e.target.checked)}
                />
              }
              label="Include users in leaderboards by default"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.privacy.allowBadgeSharing}
                  onChange={(e) => handleConfigChange('privacy', 'allowBadgeSharing', e.target.checked)}
                />
              }
              label="Allow sharing achievement badges"
            />
          </div>
        </Paper>

        {/* Notification Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Default Notifications
          </Typography>
          
          <div className="space-y-3">
            <FormControlLabel
              control={
                <Switch
                  checked={config.notifications.enableAchievementNotifications}
                  onChange={(e) => handleConfigChange('notifications', 'enableAchievementNotifications', e.target.checked)}
                />
              }
              label="Achievement unlock notifications"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.notifications.enableMilestoneAlerts}
                  onChange={(e) => handleConfigChange('notifications', 'enableMilestoneAlerts', e.target.checked)}
                />
              }
              label="Milestone achievement alerts"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.notifications.enableWeeklyDigest}
                  onChange={(e) => handleConfigChange('notifications', 'enableWeeklyDigest', e.target.checked)}
                />
              }
              label="Weekly progress digest emails"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.notifications.enableTeamComparisons}
                  onChange={(e) => handleConfigChange('notifications', 'enableTeamComparisons', e.target.checked)}
                />
              }
              label="Team comparison notifications"
            />
          </div>
        </Paper>

        {/* Customization Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            User Customization
          </Typography>
          
          <div className="space-y-4">
            <FormControlLabel
              control={
                <Switch
                  checked={config.customization.allowThemeSelection}
                  onChange={(e) => handleConfigChange('customization', 'allowThemeSelection', e.target.checked)}
                />
              }
              label="Allow users to select dashboard themes"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.customization.allowLayoutCustomization}
                  onChange={(e) => handleConfigChange('customization', 'allowLayoutCustomization', e.target.checked)}
                />
              }
              label="Allow users to customize layout"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.customization.enablePersonalGoals}
                  onChange={(e) => handleConfigChange('customization', 'enablePersonalGoals', e.target.checked)}
                />
              }
              label="Enable personal goal setting"
            />

            <div>
              <Typography variant="body2" className="mb-2">
                Max custom achievements per user: {config.customization.maxCustomAchievements}
              </Typography>
              <Slider
                value={config.customization.maxCustomAchievements}
                onChange={(e, value) => handleConfigChange('customization', 'maxCustomAchievements', value)}
                min={0}
                max={20}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' }
                ]}
                valueLabelDisplay="auto"
              />
            </div>
          </div>
        </Paper>

        {/* Configuration Summary */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Active Components</Typography>
          
          <div className="space-y-2">
            {Object.entries(config.layout).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Typography variant="body2" className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Typography>
                <Chip 
                  label={enabled ? 'Enabled' : 'Disabled'} 
                  size="small"
                  color={enabled ? 'success' : 'default'}
                  icon={enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                />
              </div>
            ))}
          </div>
        </Paper>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
        </div>
        
        <Button onClick={saveConfiguration} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Dashboard Preview</DialogTitle>
        <DialogContent>
          <div className="bg-gray-50 rounded-lg p-6">
            <Typography variant="h6" className="mb-4">User Dashboard Components</Typography>
            
            {/* Preview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(config.layout).map(([component, enabled]) => (
                <Card 
                  key={component}
                  className={`p-3 ${enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-100 opacity-60'}`}
                >
                  <div className="flex items-center gap-2">
                    {component === 'showStatsCards' && <BarChart3 className="h-4 w-4" />}
                    {component === 'showProgressBar' && <Target className="h-4 w-4" />}
                    {component === 'showRecentAchievements' && <Trophy className="h-4 w-4" />}
                    {component === 'showActivityHeatmap' && <Calendar className="h-4 w-4" />}
                    {component === 'showLeaderboard' && <Users className="h-4 w-4" />}
                    {component === 'showUpcomingMilestones' && <Clock className="h-4 w-4" />}
                    {component === 'showAchievementGallery' && <Star className="h-4 w-4" />}
                    {component === 'showPersonalStats' && <BarChart3 className="h-4 w-4" />}
                    
                    <Typography variant="body2" className="capitalize text-xs">
                      {component.replace(/([A-Z])/g, ' $1').replace('show', '').trim()}
                    </Typography>
                  </div>
                  
                  <Chip 
                    label={enabled ? 'On' : 'Off'} 
                    size="small"
                    color={enabled ? 'success' : 'default'}
                    className="mt-2"
                  />
                </Card>
              ))}
            </div>

            {/* Settings Summary */}
            <Divider className="my-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Typography variant="subtitle2">Display</Typography>
                <Typography variant="body2">
                  {config.display.achievementsPerPage} achievements per page
                </Typography>
                <Typography variant="body2">
                  Animations: {config.display.animationsEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </div>
              <div>
                <Typography variant="subtitle2">Customization</Typography>
                <Typography variant="body2">
                  Theme selection: {config.customization.allowThemeSelection ? 'Allowed' : 'Disabled'}
                </Typography>
                <Typography variant="body2">
                  Max custom achievements: {config.customization.maxCustomAchievements}
                </Typography>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}