"use client"

import React, { useState } from 'react';
// Use Material-UI for Dialog to avoid focus management conflicts
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserAvatar } from './UserAvatar';
import { 
  Upload, 
  Trash2, 
  User, 
  Mail, 
  RefreshCw,
  Check,
  AlertTriangle,
  Settings,
  LayoutDashboard,
  Ticket,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number;
    username: string;
    display_name: string;
    email: string;
    profile_picture?: string;
    role_id: string;
    permissions?: string[];
    login_preferences?: string;
  };
  onProfileUpdate: (updatedUser: any) => void;
}

export function ProfileEditModal({ open, onOpenChange, user, onProfileUpdate }: ProfileEditModalProps) {
  // Helper function to parse login preferences
  const getLoginDestinationFromPrefs = React.useCallback((loginPrefs?: string) => {
    try {
      const prefs = JSON.parse(loginPrefs || '{}');
      return prefs.default_destination || 'tickets';
    } catch {
      return 'tickets';
    }
  }, []);

  const [formData, setFormData] = useState(() => ({
    display_name: user.display_name,
    email: user.email,
    login_destination: getLoginDestinationFromPrefs(user.login_preferences)
  }));

  // Update formData when user prop changes (only essential fields)
  React.useEffect(() => {
    setFormData({
      display_name: user.display_name,
      email: user.email,
      login_destination: getLoginDestinationFromPrefs(user.login_preferences)
    });
  }, [user.display_name, user.email, user.login_preferences, getLoginDestinationFromPrefs]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Check if user has permission to access specific pages
  const hasPermission = (permission: string) => {
    return user.permissions?.includes(permission) || false;
  };

  // Get available login destinations based on user permissions
  const getLoginDestinations = () => {
    const destinations = [
      {
        value: 'tickets',
        label: 'Ticket Queue',
        description: 'Go directly to the ticket management system',
        icon: Ticket
      }
    ];

    // Add Admin Dashboard if user has any admin permissions
    const adminPermissions = [
      'admin.manage_users', 'admin.view_users',
      'admin.manage_teams', 'admin.view_teams', 
      'admin.manage_organization', 'admin.view_organization',
      'admin.manage_categories', 'admin.view_categories',
      'admin.manage_support_teams', 'admin.view_support_teams',
      'admin.view_analytics', 'admin.system_settings'
    ];
    
    if (adminPermissions.some(perm => hasPermission(perm))) {
      destinations.push({
        value: 'admin',
        label: 'Admin Dashboard',
        description: 'Go to the administrative control panel',
        icon: LayoutDashboard
      });
    }

    // Add more destinations based on specific permissions
    // Example: Analytics dashboard for users with analytics permissions
    if (hasPermission('analytics.view_reports')) {
      destinations.push({
        value: 'analytics',
        label: 'Analytics Dashboard',
        description: 'View reports and performance metrics',
        icon: LayoutDashboard
      });
    }

    // Example: User management for users with user management permissions
    if (hasPermission('users.manage_team')) {
      destinations.push({
        value: 'team-management',
        label: 'Team Management',
        description: 'Manage your team members and assignments',
        icon: Users
      });
    }

    return destinations;
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File too large (max 5MB)', 'error');
      return;
    }

    setUploading(true);
    
    try {
      const result = await apiClient.uploadProfilePicture(file, user.id);

      if (result.success) {
        const data = result.data;
        const updatedUser = { ...user, profile_picture: data.profilePictureUrl };
        onProfileUpdate(updatedUser);
        showNotification('Profile picture updated successfully', 'success');
      } else {
        showNotification(result.message || 'Failed to upload image', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Error uploading image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!user.profile_picture) return;
    
    setUploading(true);
    
    try {
      const result = await apiClient.removeProfilePicture(user.id);

      if (result.success) {
        const updatedUser = { ...user, profile_picture: undefined };
        onProfileUpdate(updatedUser);
        showNotification('Profile picture removed', 'success');
      } else {
        showNotification(result.message || 'Failed to remove image', 'error');
      }
    } catch (error) {
      console.error('Remove error:', error);
      showNotification('Error removing image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    
    try {
      const requestData = {
        display_name: formData.display_name,
        email: formData.email,
        login_preferences: JSON.stringify({
          default_destination: formData.login_destination
        })
      };
      
      const result = await apiClient.updateUserProfile(user.id, requestData);

      if (result.success) {
        const updatedUser = { 
          ...user, 
          display_name: formData.display_name,
          email: formData.email,
          login_preferences: JSON.stringify({
            default_destination: formData.login_destination
          })
        };
        onProfileUpdate(updatedUser);
        showNotification('Profile updated successfully', 'success');
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        showNotification(result.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = React.useMemo(() => 
    formData.display_name !== user.display_name || 
    formData.email !== user.email ||
    formData.login_destination !== getLoginDestinationFromPrefs(user.login_preferences)
  , [formData.display_name, formData.email, formData.login_destination, user.display_name, user.email, user.login_preferences, getLoginDestinationFromPrefs]);

  return (
    <Dialog 
      open={open} 
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <User className="h-5 w-5" />
        Edit Profile
      </DialogTitle>
      <DialogContent>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className={`${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {notification.type === 'success' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {notification.message}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <UserAvatar 
              user={user} 
              size="2xl"
            />
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('profile-picture-input')?.click()}
                className="flex items-center space-x-2"
              >
                {uploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              </Button>
              
              {user.profile_picture && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={handleRemoveProfilePicture}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
            
            <input
              id="profile-picture-input"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="display_name" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Display Name</span>
              </Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Your display name"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <Label className="flex items-center space-x-2">
                <span>Username</span>
              </Label>
              <Input
                value={user.username}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <Label className="flex items-center space-x-2">
                <span>Role</span>
              </Label>
              <Input
                value={user.role_id}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Role is managed by administrators</p>
            </div>

            {/* Login Destination Preferences - Only show if user has multiple options */}
            {getLoginDestinations().length > 1 && (
              <div>
                <Label className="flex items-center space-x-2 mb-3">
                  <Settings className="h-4 w-4" />
                  <span>Login Destination</span>
                </Label>
                <p className="text-xs text-gray-500 mb-3">
                  Choose where you&apos;d like to go after logging in
                </p>
                <div className="space-y-2">
                  {getLoginDestinations().map((destination) => {
                    const IconComponent = destination.icon;
                    return (
                      <motion.div
                        key={destination.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <label
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            formData.login_destination === destination.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="login_destination"
                            value={destination.value}
                            checked={formData.login_destination === destination.value}
                            onChange={(e) => setFormData({ ...formData, login_destination: e.target.value })}
                            className="sr-only"
                          />
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.login_destination === destination.value
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{destination.label}</div>
                            <div className="text-xs text-gray-500">{destination.description}</div>
                          </div>
                          {formData.login_destination === destination.value && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </label>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button 
          variant="outline" 
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSaveProfile}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}