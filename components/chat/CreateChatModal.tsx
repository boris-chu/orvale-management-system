/**
 * CreateChatModal - Modal for creating new group chats and direct messages
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Checkbox,
  Box,
  Alert
} from '@mui/material';
import { Search, Users, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id: string;
  is_online?: boolean;
}

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
  currentUser?: User;
}

export default function CreateChatModal({ open, onClose, currentUser }: CreateChatModalProps) {
  const [chatType, setChatType] = useState<'dm' | 'group'>('group');
  const [chatName, setChatName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available users
  useEffect(() => {
    if (!open) return;

    const loadUsers = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token) return;

        const response = await fetch('/api/users/assignable', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // Extract users array from the response object
          const users = data.users || data; // Handle both object and array responses
          // Filter out current user
          const filteredUsers = users.filter((user: User) => user.username !== currentUser?.username);
          setAvailableUsers(filteredUsers);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Failed to load users');
      }
    };

    loadUsers();
  }, [open, currentUser]);

  // Filter users based on search
  const filteredUsers = availableUsers.filter(user => 
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle user selection
  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.username === user.username);
      if (isSelected) {
        return prev.filter(u => u.username !== user.username);
      } else {
        return [...prev, user];
      }
    });
  };

  // Remove selected user
  const removeSelectedUser = (username: string) => {
    setSelectedUsers(prev => prev.filter(u => u.username !== username));
  };

  // Handle chat creation
  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one person');
      return;
    }

    if (chatType === 'group' && !chatName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      if (!token) throw new Error('No authentication token');

      // For DM, create a direct message
      if (chatType === 'dm' && selectedUsers.length === 1) {
        // TODO: Implement DM creation API
        console.log('Creating DM with:', selectedUsers[0]);
        alert('Direct message creation will be implemented soon!');
        onClose();
        return;
      }

      // For group chat, create a group
      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: chatName,
          description: description || null,
          type: 'group',
          is_private: true,
          members: selectedUsers.map(user => user.username)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group');
      }

      const result = await response.json();
      console.log('Group created:', result);

      // Reset form and close
      setChatName('');
      setDescription('');
      setSelectedUsers([]);
      setSearchQuery('');
      onClose();

      // TODO: Refresh chat list or navigate to new chat
      window.location.reload(); // Temporary solution

    } catch (err) {
      console.error('Failed to create chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    setChatName('');
    setDescription('');
    setSelectedUsers([]);
    setSearchQuery('');
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'var(--chat-background, #ffffff)',
          color: 'var(--chat-text-primary, #212121)',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle 
        style={{ 
          backgroundColor: 'var(--chat-surface, #fafafa)',
          borderBottom: '1px solid var(--chat-border, #e0e0e0)',
          color: 'var(--chat-text-primary, #212121)'
        }}
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: 'var(--chat-primary, #1976d2)' }} />
          Create New Chat
        </div>
      </DialogTitle>

      <DialogContent style={{ backgroundColor: 'var(--chat-background, #ffffff)', paddingTop: '16px' }}>
        <div className="space-y-6">
          {/* Chat Type Selection */}
          <FormControl fullWidth size="small">
            <InputLabel style={{ color: 'var(--chat-text-secondary, #757575)' }}>
              Chat Type
            </InputLabel>
            <Select
              value={chatType}
              onChange={(e) => setChatType(e.target.value as 'dm' | 'group')}
              label="Chat Type"
              style={{ 
                backgroundColor: 'var(--chat-surface, #fafafa)',
                color: 'var(--chat-text-primary, #212121)'
              }}
            >
              <MenuItem value="dm">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Direct Message
                </div>
              </MenuItem>
              <MenuItem value="group">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Group Chat
                </div>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Group Name (only for groups) */}
          {chatType === 'group' && (
            <TextField
              label="Group Name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              fullWidth
              size="small"
              required
              placeholder="Enter group name..."
              InputProps={{
                style: { 
                  backgroundColor: 'var(--chat-surface, #fafafa)',
                  color: 'var(--chat-text-primary, #212121)'
                }
              }}
              InputLabelProps={{
                style: { color: 'var(--chat-text-secondary, #757575)' }
              }}
            />
          )}

          {/* Description (only for groups) */}
          {chatType === 'group' && (
            <TextField
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="What's this group about?"
              InputProps={{
                style: { 
                  backgroundColor: 'var(--chat-surface, #fafafa)',
                  color: 'var(--chat-text-primary, #212121)'
                }
              }}
              InputLabelProps={{
                style: { color: 'var(--chat-text-secondary, #757575)' }
              }}
            />
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <Typography variant="subtitle2" className="mb-2" style={{ color: 'var(--chat-text-primary, #212121)', fontSize: '0.875rem' }}>
                Selected People ({selectedUsers.length})
                {chatType === 'dm' && selectedUsers.length > 1 && (
                  <Typography variant="caption" color="error" className="ml-2">
                    Direct messages can only have one person
                  </Typography>
                )}
              </Typography>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <Chip
                    key={user.username}
                    label={user.display_name}
                    onDelete={() => removeSelectedUser(user.username)}
                    deleteIcon={<X className="w-3 h-3" />}
                    size="small"
                    avatar={
                      <Avatar 
                        sx={{ width: 20, height: 20 }}
                        src={user.profile_picture}
                      >
                        {user.display_name.charAt(0)}
                      </Avatar>
                    }
                    style={{ 
                      backgroundColor: 'var(--chat-secondary, #f5f5f5)',
                      color: 'var(--chat-text-primary, #212121)',
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* User Search */}
          <div>
            <Typography variant="subtitle2" className="mb-2" style={{ color: 'var(--chat-text-primary, #212121)', fontSize: '0.875rem' }}>
              Add People
            </Typography>
            <TextField
              label="Search People"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              size="small"
              placeholder="Search by name or username..."
              InputProps={{
                startAdornment: <Search className="w-4 h-4 mr-2" style={{ color: 'var(--chat-text-secondary, #757575)' }} />,
                style: { 
                  backgroundColor: 'var(--chat-surface, #fafafa)',
                  color: 'var(--chat-text-primary, #212121)'
                }
              }}
              InputLabelProps={{
                style: { color: 'var(--chat-text-secondary, #757575)', fontSize: '0.875rem' }
              }}
            />
          </div>

          {/* User List */}
          <Box 
            style={{ 
              maxHeight: '200px', 
              overflow: 'auto',
              backgroundColor: 'var(--chat-surface, #fafafa)',
              borderRadius: '8px',
              border: '1px solid var(--chat-border, #e0e0e0)'
            }}
          >
            <List dense>
              {filteredUsers.map(user => {
                const isSelected = selectedUsers.find(u => u.username === user.username);
                const isDisabled = chatType === 'dm' && selectedUsers.length >= 1 && !isSelected;

                return (
                  <ListItem
                    key={user.username}
                    disablePadding
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                  >
                    <ListItemButton 
                      onClick={() => !isDisabled && toggleUserSelection(user)}
                      disabled={isDisabled}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={user.profile_picture}
                          sx={{ width: 28, height: 28 }}
                        >
                          {user.display_name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.display_name}
                        secondary={`@${user.username} • ${user.role_id}`}
                        primaryTypographyProps={{
                          style: { color: 'var(--chat-text-primary, #212121)', fontSize: '0.875rem' }
                        }}
                        secondaryTypographyProps={{
                          style: { color: 'var(--chat-text-secondary, #757575)', fontSize: '0.75rem' }
                        }}
                      />
                      <Checkbox
                        checked={!!isSelected}
                        disabled={isDisabled}
                        style={{ color: 'var(--chat-primary, #1976d2)' }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              
              {filteredUsers.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No users found"
                    primaryTypographyProps={{
                      style: { 
                        color: 'var(--chat-text-secondary, #757575)',
                        textAlign: 'center' 
                      }
                    }}
                  />
                </ListItem>
              )}
            </List>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert 
              severity="error" 
              style={{ 
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                color: 'var(--chat-text-primary, #212121)',
                border: '1px solid rgba(244, 67, 54, 0.2)'
              }}
            >
              {error}
            </Alert>
          )}
        </div>
      </DialogContent>

      <DialogActions 
        style={{ 
          backgroundColor: 'var(--chat-surface, #fafafa)',
          borderTop: '1px solid var(--chat-border, #e0e0e0)',
          padding: '12px 24px'
        }}
      >
        <Button 
          onClick={handleClose}
          style={{ color: 'var(--chat-text-secondary, #757575)' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateChat}
          disabled={isLoading || selectedUsers.length === 0 || (chatType === 'group' && !chatName.trim())}
          variant="contained"
          style={{ 
            backgroundColor: 'var(--chat-primary, #1976d2)',
            color: 'white'
          }}
        >
          {isLoading ? 'Creating...' : `Create ${chatType === 'dm' ? 'Direct Message' : 'Group'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}