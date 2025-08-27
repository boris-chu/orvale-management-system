/**
 * ChatInfoPanel - Detailed information panel for chat channels/groups
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Chip,
  Box,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  X,
  Users,
  Settings,
  Bell,
  BellOff,
  Pin,
  PinOff,
  UserPlus,
  Edit,
  FileText,
  Calendar,
  ChevronDown,
  LogOut,
  UserMinus
} from 'lucide-react';
import { motion } from 'framer-motion';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id?: string;
  presence?: {
    status: string;
    last_active?: string;
    status_message?: string;
  };
}

interface ChatItem {
  id: string;
  type: 'dm' | 'channel' | 'group';
  name: string;
  displayName: string;
  description?: string;
  participants?: User[];
  created_at?: string;
  created_by?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  user_role?: 'owner' | 'admin' | 'moderator' | 'member';
}

interface ChatInfoPanelProps {
  chat: ChatItem;
  currentUser?: User;
  onClose: () => void;
  onUpdateChat?: (updates: Partial<ChatItem>) => void;
  onLeaveChat?: () => void;
  onAddMembers?: () => void;
}

export default function ChatInfoPanel({
  chat,
  currentUser,
  onClose,
  onUpdateChat,
  onLeaveChat,
  onAddMembers
}: ChatInfoPanelProps) {
  const [members, setMembers] = useState<User[]>([]);
  
  // Load members for the channel
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token) return;

        const response = await fetch(`/api/chat/channels/${chat.id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error('Failed to load members:', error);
        // Fallback to participants if available
        setMembers(chat.participants || []);
      }
    };

    loadMembers();
  }, [chat.id, chat.participants]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState(chat.displayName);
  const [editDescription, setEditDescription] = useState(chat.description || '');
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);

  const canEdit = chat.user_role === 'owner' || chat.user_role === 'admin' || chat.user_role === 'moderator';
  const isOwner = chat.user_role === 'owner';

  // Load shared files
  useEffect(() => {
    // TODO: Load shared files from API
    setSharedFiles([
      { id: 1, name: 'project-spec.pdf', type: 'pdf', size: '2.4 MB', shared_at: '2025-08-26' },
      { id: 2, name: 'screenshot.png', type: 'image', size: '1.2 MB', shared_at: '2025-08-25' },
    ]);
  }, [chat.id]);

  const getPresenceColor = (status?: string) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'idle': return '#FFA726';
      case 'away': return '#FF9800';
      case 'busy': return '#F44336';
      case 'in_call': return '#2196F3';
      case 'in_meeting': return '#9C27B0';
      case 'presenting': return '#3F51B5';
      default: return '#9E9E9E';
    }
  };

  const handleToggleMute = () => {
    onUpdateChat?.({ isMuted: !chat.isMuted });
  };

  const handleTogglePin = () => {
    onUpdateChat?.({ isPinned: !chat.isPinned });
  };

  const handleSaveEdit = () => {
    onUpdateChat?.({
      displayName: editName,
      description: editDescription
    });
    setShowEditDialog(false);
  };

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden" style={{
        backgroundColor: 'var(--chat-background, #ffffff)',
        color: 'var(--chat-text-primary, #212121)'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{
          borderColor: 'var(--chat-border, #e0e0e0)'
        }}>
          <Typography variant="h6" className="font-semibold">
            Chat Info
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Chat Header Section */}
          <div className="p-4 text-center border-b" style={{
            borderColor: 'var(--chat-border, #e0e0e0)'
          }}>
            <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              {chat.type === 'group' || chat.type === 'channel' ? (
                chat.displayName.charAt(0).toUpperCase()
              ) : (
                <Users className="w-8 h-8" />
              )}
            </div>
            
            <Typography variant="h6" className="font-semibold mb-1">
              {chat.displayName}
            </Typography>
            
            {chat.description && (
              <Typography variant="body2" color="text.secondary" className="mb-2">
                {chat.description}
              </Typography>
            )}
            
            <Typography variant="caption" color="text.secondary">
              {chat.type === 'group' ? 'Group' : chat.type === 'channel' ? 'Channel' : 'Direct Message'} •{' '}
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Typography>
            
            {canEdit && (
              <div className="mt-3">
                <Button
                  size="small"
                  startIcon={<Edit className="w-4 h-4" />}
                  onClick={() => setShowEditDialog(true)}
                >
                  Edit Info
                </Button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b" style={{
            borderColor: 'var(--chat-border, #e0e0e0)'
          }}>
            <div className="grid grid-cols-2 gap-3">
              <FormControlLabel
                control={
                  <Switch
                    checked={!chat.isMuted}
                    onChange={handleToggleMute}
                    size="small"
                  />
                }
                label={
                  <div className="flex items-center gap-2">
                    {chat.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    <span className="text-sm">Notifications</span>
                  </div>
                }
                className="m-0"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={!!chat.isPinned}
                    onChange={handleTogglePin}
                    size="small"
                  />
                }
                label={
                  <div className="flex items-center gap-2">
                    {chat.isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                    <span className="text-sm">Pinned</span>
                  </div>
                }
                className="m-0"
              />
            </div>
          </div>

          {/* Accordion Sections */}
          <div>
            {/* Members Section */}
            <Accordion 
              defaultExpanded
              sx={{
                backgroundColor: 'var(--chat-surface, #ffffff)',
                color: 'var(--chat-text-primary, #212121)',
                '& .MuiAccordionSummary-root': {
                  backgroundColor: 'var(--chat-surface, #ffffff)',
                  borderBottom: '1px solid var(--chat-border, #e0e0e0)'
                },
                '& .MuiAccordionDetails-root': {
                  backgroundColor: 'var(--chat-surface, #ffffff)'
                }
              }}
            >
              <AccordionSummary expandIcon={<ChevronDown />}>
                <Box className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <Typography>Members ({members.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {members.map((member) => (
                    <ListItem key={member.username} className="px-0">
                      <ListItemAvatar>
                        <Box position="relative">
                          <Avatar
                            src={member.profile_picture}
                            sx={{ width: 32, height: 32 }}
                          >
                            {member.display_name.charAt(0)}
                          </Avatar>
                          {/* Presence indicator */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: getPresenceColor(member.presence?.status),
                              border: '2px solid var(--chat-background, #ffffff)'
                            }}
                          />
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <div className="flex items-center gap-2">
                            {member.display_name}
                            {chat.user_role && member.username === chat.created_by && (
                              <Chip label="Owner" size="small" color="primary" />
                            )}
                            {member.username === currentUser?.username && (
                              <Chip label="You" size="small" variant="outlined" />
                            )}
                          </div>
                        }
                        secondary={`@${member.username} • ${member.presence?.status || 'offline'}`}
                      />
                    </ListItem>
                  ))}
                </List>
                
                {canEdit && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<UserPlus className="w-4 h-4" />}
                    onClick={onAddMembers}
                    className="mt-2"
                  >
                    Add Members
                  </Button>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Shared Files Section */}
            <Accordion
              sx={{
                backgroundColor: 'var(--chat-surface, #ffffff)',
                color: 'var(--chat-text-primary, #212121)',
                '& .MuiAccordionSummary-root': {
                  backgroundColor: 'var(--chat-surface, #ffffff)',
                  borderBottom: '1px solid var(--chat-border, #e0e0e0)'
                },
                '& .MuiAccordionDetails-root': {
                  backgroundColor: 'var(--chat-surface, #ffffff)'
                }
              }}
            >
              <AccordionSummary expandIcon={<ChevronDown />}>
                <Box className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <Typography>Shared Files ({sharedFiles.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {sharedFiles.length > 0 ? (
                  <List dense>
                    {sharedFiles.map((file) => (
                      <ListItem key={file.id} className="px-0">
                        <ListItemText
                          primary={file.name}
                          secondary={`${file.size} • ${file.shared_at}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No files shared yet
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Chat Details Section */}
            <Accordion
              sx={{
                backgroundColor: 'var(--chat-surface, #ffffff)',
                color: 'var(--chat-text-primary, #212121)',
                '& .MuiAccordionSummary-root': {
                  backgroundColor: 'var(--chat-surface, #ffffff)',
                  borderBottom: '1px solid var(--chat-border, #e0e0e0)'
                },
                '& .MuiAccordionDetails-root': {
                  backgroundColor: 'var(--chat-surface, #ffffff)'
                }
              }}
            >
              <AccordionSummary expandIcon={<ChevronDown />}>
                <Box className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <Typography>Details</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <div className="space-y-2">
                  <div>
                    <Typography variant="caption" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'Unknown'}
                    </Typography>
                  </div>
                  {chat.created_by && (
                    <div>
                      <Typography variant="caption" color="text.secondary">
                        Created by
                      </Typography>
                      <Typography variant="body2">
                        {chat.created_by}
                      </Typography>
                    </div>
                  )}
                </div>
              </AccordionDetails>
            </Accordion>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="border-t p-4 flex-shrink-0" style={{
          borderColor: 'var(--chat-border, #e0e0e0)'
        }}>
          {chat.type !== 'dm' && (
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<LogOut className="w-4 h-4" />}
              onClick={onLeaveChat}
            >
              Leave {chat.type === 'group' ? 'Group' : 'Channel'}
            </Button>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog 
        open={showEditDialog} 
        onClose={() => setShowEditDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'var(--chat-background, #ffffff)',
            color: 'var(--chat-text-primary, #212121)'
          }
        }}
      >
        <DialogTitle>Edit {chat.type === 'group' ? 'Group' : 'Channel'} Info</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              label={`${chat.type === 'group' ? 'Group' : 'Channel'} Name`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="What's this chat about?"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}