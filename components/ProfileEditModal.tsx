"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  AlertTriangle
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
  };
  onProfileUpdate: (updatedUser: any) => void;
}

export function ProfileEditModal({ open, onOpenChange, user, onProfileUpdate }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    display_name: user.display_name,
    email: user.email
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id.toString());

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const updatedUser = { ...user, profile_picture: result.profilePictureUrl };
        onProfileUpdate(updatedUser);
        showNotification('Profile picture updated successfully', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to upload image', 'error');
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/profile-picture?userId=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedUser = { ...user, profile_picture: undefined };
        onProfileUpdate(updatedUser);
        showNotification('Profile picture removed', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to remove image', 'error');
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: formData.display_name,
          email: formData.email
        })
      });

      if (response.ok) {
        const updatedUser = { ...user, ...formData };
        onProfileUpdate(updatedUser);
        showNotification('Profile updated successfully', 'success');
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = formData.display_name !== user.display_name || formData.email !== user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Edit Profile</span>
          </DialogTitle>
        </DialogHeader>

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
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}