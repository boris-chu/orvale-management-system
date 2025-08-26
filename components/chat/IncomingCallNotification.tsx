/**
 * IncomingCallNotification - Incoming call alert overlay
 * 
 * Features:
 * - Floating notification for incoming calls
 * - Accept/reject call buttons
 * - Caller information display
 * - Auto-dismiss after timeout
 * - Ringtone integration
 * - Mobile-responsive design
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Paper,
  Avatar,
  Typography,
  IconButton,
  Box,
  Chip,
  Fade
} from '@mui/material';
import {
  Phone,
  PhoneDisabled,
  VideoCall,
  VideocamOff
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallNotificationProps {
  open: boolean;
  caller: {
    username: string;
    display_name: string;
    profile_picture?: string;
  };
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
  onTimeout?: () => void;
  timeoutSeconds?: number;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  open,
  caller,
  callType,
  onAccept,
  onReject,
  onTimeout,
  timeoutSeconds = 30
}) => {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);

  // Countdown timer
  useEffect(() => {
    if (!open) {
      setTimeLeft(timeoutSeconds);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeout?.();
          return timeoutSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, timeoutSeconds, onTimeout]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
          />
          
          {/* Notification card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              width: '90vw',
              maxWidth: '400px'
            }}
          >
            <Paper
              elevation={24}
              sx={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                borderRadius: '24px',
                p: 4,
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Pulsing animation for avatar */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [1, 0.8, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ marginBottom: 16 }}
              >
                <Avatar
                  src={caller.profile_picture}
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    fontSize: '2.5rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  }}
                >
                  {caller.display_name.charAt(0).toUpperCase()}
                </Avatar>
              </motion.div>

              {/* Caller info */}
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 600, 
                  mb: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                {caller.display_name}
              </Typography>

              {/* Call type and status */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                <Chip
                  icon={callType === 'video' ? <VideoCall /> : <Phone />}
                  label={`Incoming ${callType} call`}
                  size="small"
                  sx={{
                    backgroundColor: callType === 'video' ? '#7c3aed' : '#059669',
                    color: 'white',
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
                
                <Chip
                  label={`${timeLeft}s`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.75rem'
                  }}
                />
              </Box>

              {/* Action buttons */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 3,
                mt: 3
              }}>
                {/* Reject button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconButton
                    onClick={onReject}
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: '#ef4444',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#dc2626',
                        transform: 'scale(1.05)'
                      },
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <PhoneDisabled sx={{ fontSize: 28 }} />
                  </IconButton>
                </motion.div>

                {/* Accept button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconButton
                    onClick={onAccept}
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: '#10b981',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#059669',
                        transform: 'scale(1.05)'
                      },
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {callType === 'video' ? (
                      <VideoCall sx={{ fontSize: 28 }} />
                    ) : (
                      <Phone sx={{ fontSize: 28 }} />
                    )}
                  </IconButton>
                </motion.div>
              </Box>

              {/* Swipe hint for mobile */}
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  mt: 2,
                  display: 'block',
                  fontSize: '0.75rem'
                }}
              >
                Tap to answer or decline
              </Typography>
            </Paper>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallNotification;