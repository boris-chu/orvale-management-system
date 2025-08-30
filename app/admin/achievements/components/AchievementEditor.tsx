'use client';

import React, { useState, useEffect } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Paper,
  Box,
  Typography,
  Divider,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Chip
} from '@mui/material';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Save,
  X,
  Search,
  Upload,
  Sparkles,
  Calendar,
  Code,
  Eye,
  Trophy,
  Zap,
  Target,
  Users,
  Timer,
  Package,
  Star
} from 'lucide-react';
import * as Icons from 'lucide-react';
// Note: DateTimePicker components would need @mui/x-date-pickers package
// For now, using regular TextField for dates
import AchievementToast from '@/components/AchievementToast';

interface AchievementEditorProps {
  achievement?: any;
  isCreating: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-300',
  uncommon: 'bg-green-100 text-green-800 border-green-300',
  rare: 'bg-blue-100 text-blue-800 border-blue-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

const criteriaTypeDescriptions = {
  ticket_count: 'Unlock when user creates X tickets',
  streak_days: 'Unlock when user maintains X day streak',
  template_usage: 'Unlock when user uses templates X times',
  category_diversity: 'Unlock when user works across X categories',
  time_saved: 'Unlock when user saves X minutes',
  team_collaboration: 'Unlock when user collaborates X times',
  special_event: 'Special conditions defined in criteria data',
  custom: 'Custom logic defined in criteria data'
};

export default function AchievementEditor({ 
  achievement, 
  isCreating, 
  onSave, 
  onCancel 
}: AchievementEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [selectedIconTab, setSelectedIconTab] = useState(0);
  const [previewAchievement, setPreviewAchievement] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'productivity',
    rarity: 'common',
    icon: '🎯',
    icon_type: 'emoji',
    xp_reward: 50,
    criteria_type: 'ticket_count',
    criteria_value: 1,
    criteria_data: '{}',
    toast_config: '{}',
    active_from: null as Date | null,
    active_until: null as Date | null,
    custom_css: '',
    active: true
  });

  // Available icons
  const emojiIcons = [
    '🎯', '🔥', '🏃‍♂️', '💯', '⚡', '🚀', '📈', '🧩', '📋', '💎',
    '✅', '🥇', '🤝', '👥', '❤️', '🙌', '⭐', '✨', '🏆', '👑',
    '💠', '🌈', '🎨', '🎪', '🎭', '🎮', '🎲', '🎰', '🎸', '🎹',
    '🏅', '🥈', '🥉', '🏵️', '🎖️', '🏆', '📍', '🚩', '🏁', '🎌'
  ];

  const lucideIconNames = [
    'Trophy', 'Award', 'Target', 'Zap', 'Users', 'Star', 'Heart',
    'ThumbsUp', 'Crown', 'Medal', 'Flag', 'Rocket', 'Fire', 'Sparkles'
  ];

  useEffect(() => {
    if (achievement) {
      setFormData({
        ...achievement,
        active_from: achievement.active_from ? new Date(achievement.active_from) : null,
        active_until: achievement.active_until ? new Date(achievement.active_until) : null,
        criteria_data: achievement.criteria_data || '{}',
        toast_config: achievement.toast_config || '{}',
        custom_css: achievement.custom_css || ''
      });
    } else if (isCreating) {
      // Generate unique ID for new achievement
      setFormData(prev => ({
        ...prev,
        id: `achievement_${Date.now()}`
      }));
    }
  }, [achievement, isCreating]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIconSelect = (icon: string, type: string) => {
    setFormData(prev => ({
      ...prev,
      icon: icon,
      icon_type: type
    }));
    setIconPickerOpen(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Achievement name is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Achievement description is required',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.xp_reward < 0) {
      toast({
        title: 'Validation Error',
        description: 'XP reward must be positive',
        variant: 'destructive'
      });
      return false;
    }

    try {
      JSON.parse(formData.criteria_data);
      JSON.parse(formData.toast_config);
    } catch (e) {
      toast({
        title: 'Validation Error',
        description: 'Invalid JSON in criteria data or toast config',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const url = isCreating 
        ? '/api/admin/achievements'
        : `/api/admin/achievements/${achievement.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          active_from: formData.active_from?.toISOString() || null,
          active_until: formData.active_until?.toISOString() || null
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Achievement ${isCreating ? 'created' : 'updated'} successfully`
        });
        onSave();
      } else {
        throw new Error('Failed to save achievement');
      }
    } catch (error) {
      console.error('Error saving achievement:', error);
      toast({
        title: 'Error',
        description: 'Failed to save achievement',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const showPreview = () => {
    setPreviewAchievement({
      ...formData,
      unlocked_at: new Date().toISOString()
    });
  };

  const renderIcon = () => {
    if (formData.icon_type === 'emoji') {
      return <span className="text-4xl">{formData.icon}</span>;
    } else if (formData.icon_type === 'lucide') {
      const IconComponent = Icons[formData.icon as keyof typeof Icons] as any;
      return IconComponent ? <IconComponent className="h-10 w-10" /> : <Trophy className="h-10 w-10" />;
    }
    return <Trophy className="h-10 w-10" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          <Paper elevation={1} className="p-6">
            <Typography variant="h6" className="mb-4">Basic Information</Typography>
            
            <div className="space-y-4">
              <TextField
                fullWidth
                label="Achievement Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={2}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="productivity">Productivity</MenuItem>
                    <MenuItem value="quality">Quality</MenuItem>
                    <MenuItem value="collaboration">Collaboration</MenuItem>
                    <MenuItem value="special">Special</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Rarity</InputLabel>
                  <Select
                    value={formData.rarity}
                    onChange={(e) => handleChange('rarity', e.target.value)}
                    label="Rarity"
                  >
                    <MenuItem value="common">Common</MenuItem>
                    <MenuItem value="uncommon">Uncommon</MenuItem>
                    <MenuItem value="rare">Rare</MenuItem>
                    <MenuItem value="epic">Epic</MenuItem>
                    <MenuItem value="legendary">Legendary</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Typography variant="body2" className="mb-2">Icon</Typography>
                  <Button
                    variant="outline"
                    onClick={() => setIconPickerOpen(true)}
                    className="w-full h-20 flex items-center justify-center gap-4"
                  >
                    {renderIcon()}
                    <span>Change Icon</span>
                  </Button>
                </div>

                <TextField
                  label="XP Reward"
                  type="number"
                  value={formData.xp_reward}
                  onChange={(e) => handleChange('xp_reward', parseInt(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+</InputAdornment>,
                  }}
                  className="w-32"
                />
              </div>
            </div>
          </Paper>

          <Paper elevation={1} className="p-6">
            <Typography variant="h6" className="mb-4">Unlock Criteria</Typography>
            
            <div className="space-y-4">
              <FormControl fullWidth>
                <InputLabel>Criteria Type</InputLabel>
                <Select
                  value={formData.criteria_type}
                  onChange={(e) => handleChange('criteria_type', e.target.value)}
                  label="Criteria Type"
                >
                  {Object.entries(criteriaTypeDescriptions).map(([key, desc]) => (
                    <MenuItem key={key} value={key}>
                      <div>
                        <div className="font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-500">{desc}</div>
                      </div>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Criteria Value"
                type="number"
                value={formData.criteria_value}
                onChange={(e) => handleChange('criteria_value', parseInt(e.target.value) || 0)}
                helperText="The target value to unlock this achievement"
              />

              <TextField
                fullWidth
                label="Advanced Criteria (JSON)"
                value={formData.criteria_data}
                onChange={(e) => handleChange('criteria_data', e.target.value)}
                multiline
                rows={3}
                helperText="Additional criteria configuration in JSON format"
              />
            </div>
          </Paper>

          <Paper elevation={1} className="p-6">
            <Typography variant="h6" className="mb-4">Active Period</Typography>
            
            <div className="grid grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Active From"
                type="datetime-local"
                value={formData.active_from ? formData.active_from.toISOString().slice(0, 16) : ''}
                onChange={(e) => handleChange('active_from', e.target.value ? new Date(e.target.value) : null)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Active Until"
                type="datetime-local"
                value={formData.active_until ? formData.active_until.toISOString().slice(0, 16) : ''}
                onChange={(e) => handleChange('active_until', e.target.value ? new Date(e.target.value) : null)}
                InputLabelProps={{ shrink: true }}
              />
            </div>
          </Paper>
        </div>

        {/* Right Column - Preview & Advanced */}
        <div className="space-y-6">
          <Paper elevation={1} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h6">Live Preview</Typography>
              <Button size="sm" onClick={showPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Refresh Preview
              </Button>
            </div>

            <Card className={`${rarityColors[formData.rarity as keyof typeof rarityColors]} border-2`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div>{renderIcon()}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{formData.name || 'Achievement Name'}</h3>
                    <p className="text-gray-700 mb-4">{formData.description || 'Achievement description'}</p>
                    
                    <div className="flex items-center justify-between">
                      <Badge className={`capitalize ${rarityColors[formData.rarity as keyof typeof rarityColors]}`}>
                        {formData.rarity}
                      </Badge>
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Star className="h-5 w-5" />
                        <span className="font-bold">+{formData.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Paper>

          <Paper elevation={1} className="p-6">
            <Typography variant="h6" className="mb-4">Toast Customization</Typography>
            
            <Alert severity="info" className="mb-4">
              Toast configuration allows you to customize the notification appearance
            </Alert>

            <TextField
              fullWidth
              label="Toast Configuration (JSON)"
              value={formData.toast_config}
              onChange={(e) => handleChange('toast_config', e.target.value)}
              multiline
              rows={4}
              placeholder={`{
  "duration": 5000,
  "animation": "slide",
  "sound": "success.mp3"
}`}
            />
          </Paper>

          <Paper elevation={1} className="p-6">
            <Typography variant="h6" className="mb-4">Custom CSS</Typography>
            
            <TextField
              fullWidth
              label="Custom Styles"
              value={formData.custom_css}
              onChange={(e) => handleChange('custom_css', e.target.value)}
              multiline
              rows={4}
              placeholder="/* Custom CSS for unique styling */"
              helperText="Add custom CSS to make this achievement unique"
            />
          </Paper>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : (isCreating ? 'Create Achievement' : 'Save Changes')}
        </Button>
      </div>

      {/* Icon Picker Dialog */}
      <Dialog 
        open={iconPickerOpen} 
        onClose={() => setIconPickerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <div className="flex items-center justify-between">
            <span>Choose Icon</span>
            <IconButton onClick={() => setIconPickerOpen(false)}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          <Tabs value={selectedIconTab} onChange={(e, v) => setSelectedIconTab(v)}>
            <Tab label="Emojis" />
            <Tab label="Lucide Icons" />
            <Tab label="Upload Custom" />
          </Tabs>

          {selectedIconTab === 0 && (
            <Grid container spacing={2} className="mt-4">
              {emojiIcons.map((emoji) => (
                <Grid item key={emoji}>
                  <Button
                    variant="outline"
                    className="w-16 h-16 text-2xl"
                    onClick={() => handleIconSelect(emoji, 'emoji')}
                  >
                    {emoji}
                  </Button>
                </Grid>
              ))}
            </Grid>
          )}

          {selectedIconTab === 1 && (
            <Grid container spacing={2} className="mt-4">
              {lucideIconNames.map((iconName) => {
                const IconComponent = Icons[iconName as keyof typeof Icons] as any;
                return (
                  <Grid item key={iconName}>
                    <Button
                      variant="outline"
                      className="w-16 h-16"
                      onClick={() => handleIconSelect(iconName, 'lucide')}
                    >
                      {IconComponent && <IconComponent className="h-6 w-6" />}
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {selectedIconTab === 2 && (
            <div className="mt-4 text-center">
              <Alert severity="info">
                Custom SVG upload coming soon!
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Achievement Toast Preview */}
      <AchievementToast
        achievement={previewAchievement}
        onClose={() => setPreviewAchievement(null)}
      />
    </div>
  );
}