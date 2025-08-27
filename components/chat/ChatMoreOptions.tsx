/**
 * ChatMoreOptions - Dropdown menu for chat actions (three dots menu)
 */

'use client';

import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import { 
  Search,
  Bell,
  BellOff,
  Pin,
  PinOff,
  UserPlus,
  Settings,
  Download,
  Flag,
  Shield,
  LogOut,
  Trash2,
  Archive,
  MoreVertical
} from 'lucide-react';

interface ChatItem {
  id: string;
  type: 'dm' | 'channel' | 'group';
  name: string;
  displayName: string;
  isPinned?: boolean;
  isMuted?: boolean;
  user_role?: 'owner' | 'admin' | 'moderator' | 'member';
}

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id?: string;
}

interface ChatMoreOptionsProps {
  chat: ChatItem;
  currentUser?: User;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSearchInChat?: () => void;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onAddMembers?: () => void;
  onChatSettings?: () => void;
  onExportChat?: () => void;
  onReportChat?: () => void;
  onBlockUser?: () => void;
  onLeaveChat?: () => void;
  onDeleteChat?: () => void;
  onArchiveChat?: () => void;
}

export default function ChatMoreOptions({
  chat,
  currentUser,
  anchorEl,
  open,
  onClose,
  onSearchInChat,
  onToggleMute,
  onTogglePin,
  onAddMembers,
  onChatSettings,
  onExportChat,
  onReportChat,
  onBlockUser,
  onLeaveChat,
  onDeleteChat,
  onArchiveChat
}: ChatMoreOptionsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
    destructive?: boolean;
  }>({ open: false, title: '', message: '', action: () => {} });

  const canManage = chat.user_role === 'owner' || chat.user_role === 'admin' || chat.user_role === 'moderator';
  const isOwner = chat.user_role === 'owner';
  const isDM = chat.type === 'dm';

  const handleAction = (action: () => void, requiresConfirm?: boolean, confirmConfig?: {
    title: string;
    message: string;
    destructive?: boolean;
  }) => {
    onClose();
    
    if (requiresConfirm && confirmConfig) {
      setConfirmDialog({
        open: true,
        title: confirmConfig.title,
        message: confirmConfig.message,
        action,
        destructive: confirmConfig.destructive
      });
    } else {
      action();
    }
  };

  const handleConfirmAction = () => {
    confirmDialog.action();
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  // Debug logging for anchor positioning
  React.useEffect(() => {
    if (open && anchorEl) {
      console.log('ChatMoreOptions: Menu opened with anchor element:', anchorEl);
      console.log('ChatMoreOptions: Anchor element position:', {
        top: anchorEl.offsetTop,
        left: anchorEl.offsetLeft,
        width: anchorEl.offsetWidth,
        height: anchorEl.offsetHeight
      });
    }
  }, [open, anchorEl]);

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            minWidth: '200px',
            backgroundColor: 'var(--chat-surface, #ffffff)',
            color: 'var(--chat-text-primary, #212121)',
            border: '1px solid var(--chat-border, #e0e0e0)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            '& .MuiMenuItem-root': {
              color: 'var(--chat-text-primary, #212121)',
              '&:hover': {
                backgroundColor: 'var(--chat-secondary, #f5f5f5)'
              }
            },
            '& .MuiDivider-root': {
              backgroundColor: 'var(--chat-border, #e0e0e0)'
            }
          }
        }}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'right' 
        }}
        transformOrigin={{ 
          vertical: 'top', 
          horizontal: 'right' 
        }}
        MenuListProps={{
          sx: {
            py: 1
          }
        }}
        disableAutoFocusItem
        disableRestoreFocus
      >
        {/* Search in Chat */}
        <MenuItem onClick={() => handleAction(onSearchInChat || (() => {}))}>
          <ListItemIcon>
            <Search className="w-4 h-4" />
          </ListItemIcon>
          <ListItemText>Search in Chat</ListItemText>
        </MenuItem>

        <Divider />

        {/* Notification Settings */}
        <MenuItem onClick={() => handleAction(onToggleMute || (() => {}))}>
          <ListItemIcon>
            {chat.isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </ListItemIcon>
          <ListItemText>
            {chat.isMuted ? 'Unmute' : 'Mute'} Notifications
          </ListItemText>
        </MenuItem>

        {/* Pin/Unpin Chat */}
        <MenuItem onClick={() => handleAction(onTogglePin || (() => {}))}>
          <ListItemIcon>
            {chat.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </ListItemIcon>
          <ListItemText>
            {chat.isPinned ? 'Unpin' : 'Pin'} Chat
          </ListItemText>
        </MenuItem>

        {/* Add Members (Groups/Channels only) */}
        {!isDM && canManage && (
          <MenuItem onClick={() => handleAction(onAddMembers || (() => {}))}>
            <ListItemIcon>
              <UserPlus className="w-4 h-4" />
            </ListItemIcon>
            <ListItemText>Add Members</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {/* Chat Settings (Groups/Channels only, for admins) */}
        {!isDM && canManage && (
          <MenuItem onClick={() => handleAction(onChatSettings || (() => {}))}>
            <ListItemIcon>
              <Settings className="w-4 h-4" />
            </ListItemIcon>
            <ListItemText>Chat Settings</ListItemText>
          </MenuItem>
        )}

        {/* Export Chat History */}
        <MenuItem onClick={() => handleAction(onExportChat || (() => {}))}>
          <ListItemIcon>
            <Download className="w-4 h-4" />
          </ListItemIcon>
          <ListItemText>Export Chat</ListItemText>
        </MenuItem>

        {/* Archive Chat */}
        <MenuItem onClick={() => handleAction(onArchiveChat || (() => {}))}>
          <ListItemIcon>
            <Archive className="w-4 h-4" />
          </ListItemIcon>
          <ListItemText>Archive Chat</ListItemText>
        </MenuItem>

        <Divider />

        {/* Report Chat/User */}
        <MenuItem onClick={() => handleAction(onReportChat || (() => {}))}>
          <ListItemIcon>
            <Flag className="w-4 h-4" />
          </ListItemIcon>
          <ListItemText>
            Report {isDM ? 'User' : 'Chat'}
          </ListItemText>
        </MenuItem>

        {/* Block User (DMs only) */}
        {isDM && (
          <MenuItem 
            onClick={() => handleAction(
              onBlockUser || (() => {}), 
              true,
              {
                title: 'Block User',
                message: `Are you sure you want to block ${chat.displayName}? They won't be able to send you messages.`,
                destructive: true
              }
            )}
          >
            <ListItemIcon>
              <Shield className="w-4 h-4" />
            </ListItemIcon>
            <ListItemText>Block User</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {/* Leave Chat (Groups/Channels only) */}
        {!isDM && (
          <MenuItem 
            onClick={() => handleAction(
              onLeaveChat || (() => {}),
              true,
              {
                title: `Leave ${chat.type === 'group' ? 'Group' : 'Channel'}`,
                message: `Are you sure you want to leave "${chat.displayName}"? You'll no longer receive messages from this ${chat.type}.`,
                destructive: true
              }
            )}
            style={{ color: '#d32f2f' }}
          >
            <ListItemIcon>
              <LogOut className="w-4 h-4" style={{ color: '#d32f2f' }} />
            </ListItemIcon>
            <ListItemText>
              Leave {chat.type === 'group' ? 'Group' : 'Channel'}
            </ListItemText>
          </MenuItem>
        )}

        {/* Delete Chat (Owner only) */}
        {isOwner && (
          <MenuItem 
            onClick={() => handleAction(
              onDeleteChat || (() => {}),
              true,
              {
                title: `Delete ${chat.type === 'group' ? 'Group' : 'Channel'}`,
                message: `Are you sure you want to permanently delete "${chat.displayName}"? This action cannot be undone and all messages will be lost.`,
                destructive: true
              }
            )}
            style={{ color: '#d32f2f' }}
          >
            <ListItemIcon>
              <Trash2 className="w-4 h-4" style={{ color: '#d32f2f' }} />
            </ListItemIcon>
            <ListItemText>
              Delete {chat.type === 'group' ? 'Group' : 'Channel'}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--chat-background, #ffffff)',
            color: 'var(--chat-text-primary, #212121)'
          }
        }}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={confirmDialog.destructive ? 'error' : 'primary'}
            variant="contained"
          >
            {confirmDialog.destructive ? 'Delete' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}