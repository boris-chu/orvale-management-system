/**
 * User Theme Selection Modal
 * Allows users to select their preferred chat themes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Palette, 
  Smartphone, 
  Code, 
  Github, 
  MessageSquare, 
  Check,
  RefreshCw,
  Accessibility
} from 'lucide-react';
import { useThemeSystem, PRESET_THEMES } from '@/hooks/useThemeSystem';
import { motion, AnimatePresence } from 'framer-motion';

interface UserThemeModalProps {
  open: boolean;
  onClose: () => void;
}

interface ThemePreview {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  description: string;
  colors: {
    primary: string;
    sidebar: string;
    surface: string;
  };
}

const THEME_PREVIEWS: ThemePreview[] = [
  {
    name: 'light',
    displayName: 'Light',
    icon: <Palette className="w-5 h-5" />,
    description: 'Clean and bright interface',
    colors: {
      primary: '#1976d2',
      sidebar: '#ffffff',
      surface: '#fafafa'
    }
  },
  {
    name: 'iphone',
    displayName: 'iPhone',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'iOS-inspired design with rounded corners',
    colors: {
      primary: '#007aff',
      sidebar: '#ffffff',
      surface: '#f2f2f7'
    }
  },
  {
    name: 'darcula',
    displayName: 'Darcula',
    icon: <Code className="w-5 h-5" />,
    description: 'Dark theme for developers',
    colors: {
      primary: '#569cd6',
      sidebar: '#252526',
      surface: '#2d2d30'
    }
  },
  {
    name: 'github',
    displayName: 'GitHub',
    icon: <Github className="w-5 h-5" />,
    description: 'Clean developer-focused design',
    colors: {
      primary: '#0969da',
      sidebar: '#ffffff',
      surface: '#f6f8fa'
    }
  },
  {
    name: 'slack',
    displayName: 'Slack',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Professional communication style',
    colors: {
      primary: '#4a154b',
      sidebar: '#3f0e40',
      surface: '#f8f8f8'
    }
  }
];

export default function UserThemeModal({ open, onClose }: UserThemeModalProps) {
  const {
    userPreferences,
    adminSettings,
    updateUserTheme,
    userLoading,
    getAvailableThemes,
    canUserCustomize
  } = useThemeSystem();

  const [selectedInternalTheme, setSelectedInternalTheme] = useState('inherit');
  const [selectedPublicQueueTheme, setSelectedPublicQueueTheme] = useState('inherit');
  const [tempFontSizeMultiplier, setTempFontSizeMultiplier] = useState(1.0);
  const [tempReduceAnimations, setTempReduceAnimations] = useState(false);
  const [tempHighContrast, setTempHighContrast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form state from user preferences
  useEffect(() => {
    if (userPreferences) {
      setSelectedInternalTheme(userPreferences.internal_chat_theme);
      setSelectedPublicQueueTheme(userPreferences.public_queue_theme);
      setTempFontSizeMultiplier(userPreferences.font_size_multiplier);
      setTempReduceAnimations(userPreferences.reduce_animations);
      setTempHighContrast(userPreferences.high_contrast_mode);
    }
  }, [userPreferences]);

  // Handle theme selection
  const handleThemeSelect = (interfaceType: 'internal' | 'public_queue', themeName: string) => {
    if (interfaceType === 'internal') {
      setSelectedInternalTheme(themeName);
    } else {
      setSelectedPublicQueueTheme(themeName);
    }
    setError(null);
  };

  // Handle save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Update themes if changed
      if (selectedInternalTheme !== userPreferences?.internal_chat_theme) {
        await updateUserTheme('internal_chat', selectedInternalTheme);
      }
      
      if (selectedPublicQueueTheme !== userPreferences?.public_queue_theme) {
        await updateUserTheme('public_queue', selectedPublicQueueTheme);
      }

      // Update accessibility settings (would need separate API endpoint)
      // For now, just show success
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
      
    } catch (err) {
      setError('Failed to save theme preferences. Please try again.');
      console.error('Theme save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle reset to defaults
  const handleReset = () => {
    setSelectedInternalTheme('inherit');
    setSelectedPublicQueueTheme('inherit');
    setTempFontSizeMultiplier(1.0);
    setTempReduceAnimations(false);
    setTempHighContrast(false);
    setError(null);
  };

  // Get theme preview
  const getThemePreview = (themeName: string) => {
    return THEME_PREVIEWS.find(t => t.name === themeName) || THEME_PREVIEWS[0];
  };

  // Check if user can customize
  const customizationAllowed = canUserCustomize();
  const availableThemes = getAvailableThemes();

  // Filter available theme previews
  const availableThemePreviews = THEME_PREVIEWS.filter(theme => 
    availableThemes.includes(theme.name)
  );

  if (userLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Palette className="w-6 h-6 text-blue-600" />
          Chat Theme Preferences
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          {!customizationAllowed ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Theme customization is currently disabled by your administrator. 
                You're using the system default theme.
              </Typography>
            </Alert>
          ) : adminSettings?.force_theme_compliance ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Your administrator has enforced system-wide theme compliance. 
                Theme changes may be overridden.
              </Typography>
            </Alert>
          ) : null}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body2">Theme preferences saved successfully!</Typography>
              </Alert>
            </motion.div>
          )}
        </Box>

        {customizationAllowed && (
          <>
            {/* Internal Chat Theme Selection */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageSquare className="w-5 h-5" />
              Internal Chat Theme
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {/* Inherit Option */}
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedInternalTheme === 'inherit' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    '&:hover': { borderColor: '#1976d2' }
                  }}
                  onClick={() => handleThemeSelect('internal', 'inherit')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <RefreshCw className="w-5 h-5" />
                      {selectedInternalTheme === 'inherit' && (
                        <Check className="w-4 h-4 ml-1 text-blue-600" />
                      )}
                    </Box>
                    <Typography variant="subtitle2">System Default</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Use admin default ({adminSettings?.internal_chat_theme || 'light'})
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Theme Options */}
              {availableThemePreviews.map(theme => (
                <Grid item xs={12} sm={6} md={4} key={theme.name}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedInternalTheme === theme.name ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      '&:hover': { borderColor: '#1976d2' }
                    }}
                    onClick={() => handleThemeSelect('internal', theme.name)}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {theme.icon}
                        {selectedInternalTheme === theme.name && (
                          <Check className="w-4 h-4 ml-1 text-blue-600" />
                        )}
                      </Box>
                      <Typography variant="subtitle2">{theme.displayName}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {theme.description}
                      </Typography>
                      
                      {/* Color Preview */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: 1, 
                            bgcolor: theme.colors.primary 
                          }} 
                        />
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: 1, 
                            bgcolor: theme.colors.sidebar,
                            border: '1px solid #e0e0e0'
                          }} 
                        />
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: 1, 
                            bgcolor: theme.colors.surface,
                            border: '1px solid #e0e0e0'
                          }} 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Accessibility Settings */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Accessibility className="w-5 h-5" />
              Accessibility Settings
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={tempReduceAnimations} 
                    onChange={(e) => setTempReduceAnimations(e.target.checked)} 
                  />
                }
                label="Reduce animations"
              />
              <Typography variant="caption" display="block" color="textSecondary">
                Disable motion effects for better accessibility
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={tempHighContrast} 
                    onChange={(e) => setTempHighContrast(e.target.checked)} 
                  />
                }
                label="High contrast mode"
              />
              <Typography variant="caption" display="block" color="textSecondary">
                Increase contrast for better visibility
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Font Size: {Math.round(tempFontSizeMultiplier * 100)}%
              </Typography>
              <Slider
                value={tempFontSizeMultiplier}
                onChange={(_, value) => setTempFontSizeMultiplier(value as number)}
                min={0.8}
                max={1.5}
                step={0.1}
                marks={[
                  { value: 0.8, label: '80%' },
                  { value: 1.0, label: '100%' },
                  { value: 1.2, label: '120%' },
                  { value: 1.5, label: '150%' }
                ]}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                Adjust text size for comfortable reading
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleReset} color="secondary" disabled={saving}>
          Reset to Defaults
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        {customizationAllowed && (
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}