'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Box,
  Grid,
  Chip
} from '@mui/material';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Play,
  Download,
  Upload,
  RotateCcw,
  Palette,
  Volume2,
  VolumeX,
  Timer,
  Sparkles,
  Star
} from 'lucide-react';
import { GradientBarChart } from '@/ui library/evilcharts/bar-charts/gradient-bar-chart';
import AchievementToast from '@/components/AchievementToast';

interface ToastConfig {
  duration: number;
  position: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  animation: {
    entry: 'slide' | 'fade' | 'scale' | 'bounce';
    exit: 'slide' | 'fade' | 'scale' | 'bounce';
    duration: number;
  };
  style: {
    borderRadius: number;
    shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    blur: boolean;
    glow: boolean;
    gradient: string;
  };
  sound: {
    enabled: boolean;
    volume: number;
    file: string;
  };
}

const defaultConfig: ToastConfig = {
  duration: 5000,
  position: 'top-right',
  animation: {
    entry: 'slide',
    exit: 'slide',
    duration: 400
  },
  style: {
    borderRadius: 8,
    shadow: 'lg',
    blur: false,
    glow: false,
    gradient: 'from-blue-500 to-purple-600'
  },
  sound: {
    enabled: true,
    volume: 50,
    file: 'achievement.mp3'
  }
};

const previewAchievement = {
  id: 'preview',
  name: 'Preview Achievement',
  description: 'This is how your toast notification will appear',
  category: 'special',
  rarity: 'epic',
  icon: '🎯',
  xp_reward: 100,
  unlocked_at: new Date().toISOString()
};

export default function ToastCustomization() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ToastConfig>(defaultConfig);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleConfigChange = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const showToastPreview = () => {
    setShowPreview({
      ...previewAchievement,
      toast_config: JSON.stringify(config)
    });
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/admin/achievements/toast-config', {
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
          description: 'Toast configuration saved successfully'
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save toast configuration',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Configuration */}
      <div className="space-y-6">
        {/* Basic Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Basic Settings</Typography>
          
          <div className="space-y-4">
            <div>
              <Typography variant="body2" className="mb-2">
                Duration: {config.duration}ms
              </Typography>
              <Slider
                value={config.duration}
                onChange={(e, value) => handleConfigChange('duration', value)}
                min={1000}
                max={10000}
                step={500}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
              />
            </div>

            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                value={config.position}
                onChange={(e) => handleConfigChange('position', e.target.value)}
                label="Position"
              >
                <MenuItem value="top-right">Top Right</MenuItem>
                <MenuItem value="top-center">Top Center</MenuItem>
                <MenuItem value="top-left">Top Left</MenuItem>
                <MenuItem value="bottom-right">Bottom Right</MenuItem>
                <MenuItem value="bottom-center">Bottom Center</MenuItem>
                <MenuItem value="bottom-left">Bottom Left</MenuItem>
              </Select>
            </FormControl>
          </div>
        </Paper>

        {/* Animation Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Animation Settings</Typography>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormControl fullWidth>
                <InputLabel>Entry Animation</InputLabel>
                <Select
                  value={config.animation.entry}
                  onChange={(e) => handleConfigChange('animation.entry', e.target.value)}
                  label="Entry Animation"
                >
                  <MenuItem value="slide">Slide</MenuItem>
                  <MenuItem value="fade">Fade</MenuItem>
                  <MenuItem value="scale">Scale</MenuItem>
                  <MenuItem value="bounce">Bounce</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Exit Animation</InputLabel>
                <Select
                  value={config.animation.exit}
                  onChange={(e) => handleConfigChange('animation.exit', e.target.value)}
                  label="Exit Animation"
                >
                  <MenuItem value="slide">Slide</MenuItem>
                  <MenuItem value="fade">Fade</MenuItem>
                  <MenuItem value="scale">Scale</MenuItem>
                  <MenuItem value="bounce">Bounce</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div>
              <Typography variant="body2" className="mb-2">
                Animation Duration: {config.animation.duration}ms
              </Typography>
              <Slider
                value={config.animation.duration}
                onChange={(e, value) => handleConfigChange('animation.duration', value)}
                min={200}
                max={1000}
                step={50}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}ms`}
              />
            </div>
          </div>
        </Paper>

        {/* Style Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Visual Style</Typography>
          
          <div className="space-y-4">
            <div>
              <Typography variant="body2" className="mb-2">
                Border Radius: {config.style.borderRadius}px
              </Typography>
              <Slider
                value={config.style.borderRadius}
                onChange={(e, value) => handleConfigChange('style.borderRadius', value)}
                min={0}
                max={20}
                step={2}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}px`}
              />
            </div>

            <FormControl fullWidth>
              <InputLabel>Shadow</InputLabel>
              <Select
                value={config.style.shadow}
                onChange={(e) => handleConfigChange('style.shadow', e.target.value)}
                label="Shadow"
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="sm">Small</MenuItem>
                <MenuItem value="md">Medium</MenuItem>
                <MenuItem value="lg">Large</MenuItem>
                <MenuItem value="xl">Extra Large</MenuItem>
              </Select>
            </FormControl>

            <div className="grid grid-cols-2 gap-4">
              <FormControlLabel
                control={
                  <Switch
                    checked={config.style.blur}
                    onChange={(e) => handleConfigChange('style.blur', e.target.checked)}
                  />
                }
                label="Backdrop Blur"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={config.style.glow}
                    onChange={(e) => handleConfigChange('style.glow', e.target.checked)}
                  />
                }
                label="Glow Effect"
              />
            </div>

            <TextField
              fullWidth
              label="Background Gradient"
              value={config.style.gradient}
              onChange={(e) => handleConfigChange('style.gradient', e.target.value)}
              placeholder="from-blue-500 to-purple-600"
              helperText="Use Tailwind gradient classes"
            />
          </div>
        </Paper>

        {/* Sound Settings */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Sound Settings</Typography>
          
          <div className="space-y-4">
            <FormControlLabel
              control={
                <Switch
                  checked={config.sound.enabled}
                  onChange={(e) => handleConfigChange('sound.enabled', e.target.checked)}
                />
              }
              label="Enable Sound Effects"
            />

            {config.sound.enabled && (
              <>
                <div>
                  <Typography variant="body2" className="mb-2">
                    Volume: {config.sound.volume}%
                  </Typography>
                  <Slider
                    value={config.sound.volume}
                    onChange={(e, value) => handleConfigChange('sound.volume', value)}
                    min={0}
                    max={100}
                    step={10}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </div>

                <TextField
                  fullWidth
                  label="Sound File"
                  value={config.sound.file}
                  onChange={(e) => handleConfigChange('sound.file', e.target.value)}
                  placeholder="achievement.mp3"
                  helperText="Upload custom sound files in the next update"
                />
              </>
            )}
          </div>
        </Paper>
      </div>

      {/* Right Column - Preview & Actions */}
      <div className="space-y-6">
        {/* Live Preview */}
        <Paper elevation={1} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h6">Live Preview</Typography>
            <Button onClick={showToastPreview}>
              <Play className="h-4 w-4 mr-2" />
              Test Toast
            </Button>
          </div>

          <div className="bg-gray-100 rounded-lg p-8 relative min-h-[200px]">
            <Typography variant="body2" color="textSecondary" className="text-center">
              Click "Test Toast" to see how notifications will appear with your current settings
            </Typography>
            
            {/* Position indicator */}
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className={`absolute w-4 h-4 bg-blue-500 rounded-full ${
                  config.position.includes('top') ? 'top-4' : 'bottom-4'
                } ${
                  config.position.includes('right') ? 'right-4' : 
                  config.position.includes('left') ? 'left-4' : 'left-1/2 transform -translate-x-1/2'
                }`}
              />
            </div>
          </div>
        </Paper>

        {/* Configuration Summary */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Configuration Summary</Typography>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Duration:</span>
              <Chip label={`${config.duration}ms`} size="small" />
            </div>
            <div className="flex justify-between">
              <span>Position:</span>
              <Chip label={config.position} size="small" />
            </div>
            <div className="flex justify-between">
              <span>Entry Animation:</span>
              <Chip label={config.animation.entry} size="small" />
            </div>
            <div className="flex justify-between">
              <span>Shadow:</span>
              <Chip label={config.style.shadow} size="small" />
            </div>
            <div className="flex justify-between">
              <span>Sound:</span>
              <Chip 
                label={config.sound.enabled ? `${config.sound.volume}%` : 'Disabled'} 
                size="small" 
                color={config.sound.enabled ? 'success' : 'default'}
              />
            </div>
          </div>
        </Paper>

        {/* Preset Templates */}
        <Paper elevation={1} className="p-6">
          <Typography variant="h6" className="mb-4">Preset Templates</Typography>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setConfig({
                ...defaultConfig,
                animation: { entry: 'bounce', exit: 'scale', duration: 600 },
                style: { ...defaultConfig.style, glow: true, shadow: 'xl' }
              })}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Celebration Style
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setConfig({
                ...defaultConfig,
                animation: { entry: 'fade', exit: 'fade', duration: 300 },
                style: { ...defaultConfig.style, borderRadius: 4, shadow: 'sm' }
              })}
            >
              <Timer className="h-4 w-4 mr-2" />
              Minimal Style
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setConfig({
                ...defaultConfig,
                duration: 8000,
                animation: { entry: 'slide', exit: 'slide', duration: 800 },
                style: { ...defaultConfig.style, glow: true, blur: true }
              })}
            >
              <Star className="h-4 w-4 mr-2" />
              Epic Style
            </Button>
          </div>
        </Paper>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={resetToDefaults} variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveConfiguration} disabled={saving} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </div>

      {/* Toast Preview */}
      <AchievementToast
        achievement={showPreview}
        onClose={() => setShowPreview(null)}
        autoCloseDelay={config.duration}
      />
    </div>
  );
}