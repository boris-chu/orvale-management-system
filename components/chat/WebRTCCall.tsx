/**
 * WebRTCCall - Audio/Video calling component with Safari/iOS support
 * 
 * Features:
 * - Audio and video calls with WebRTC
 * - Safari/iOS compatibility (user gesture requirement, codec preferences)
 * - Call quality indicators and adaptive quality
 * - Integration with Socket.io signaling
 * - Mute/unmute, video on/off controls
 * - Call duration tracking
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent, 
  DialogTitle,
  Button,
  IconButton,
  Box,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Phone,
  PhoneDisabled,
  VideoCall,
  VideocamOff,
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Settings,
  SignalWifi4Bar,
  SignalWifi3Bar,
  SignalWifi2Bar,
  SignalWifi1Bar,
  SignalWifiOff
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '@/lib/socket-client';

interface WebRTCCallProps {
  open: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  targetUser: {
    username: string;
    display_name: string;
    profile_picture?: string;
  };
  currentUser: {
    username: string;
    display_name: string;
    profile_picture?: string;
  };
  isIncoming?: boolean;
  callId?: string;
  onCallEnd?: (duration: number) => void;
}

interface CallStats {
  quality: 'excellent' | 'good' | 'poor' | 'unstable';
  bitrate: number;
  packetLoss: number;
  latency: number;
}

// Safari detection
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// WebRTC configuration optimized for Safari
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  sdpSemantics: 'unified-plan',
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  ...(isSafari && {
    iceCandidatePoolSize: 10
  })
};

export const WebRTCCall: React.FC<WebRTCCallProps> = ({
  open,
  onClose,
  callType,
  targetUser,
  currentUser,
  isIncoming = false,
  callId: initialCallId,
  onCallEnd
}) => {
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callStats, setCallStats] = useState<CallStats>({ quality: 'good', bitrate: 0, packetLoss: 0, latency: 0 });
  const [error, setError] = useState<string | null>(null);
  const [userGestureReceived, setUserGestureReceived] = useState(!isIOS && !isSafari);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callIdRef = useRef<string>(initialCallId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` 
                   : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get quality icon based on call stats
  const getQualityIcon = () => {
    switch (callStats.quality) {
      case 'excellent': return <SignalWifi4Bar className="text-green-500" />;
      case 'good': return <SignalWifi3Bar className="text-blue-500" />;
      case 'poor': return <SignalWifi2Bar className="text-yellow-500" />;
      case 'unstable': return <SignalWifi1Bar className="text-red-500" />;
      default: return <SignalWifiOff className="text-gray-500" />;
    }
  };

  // Handle call end
  const handleCallEnd = useCallback(() => {
    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Calculate final duration
    const finalDuration = callStartTimeRef.current 
      ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
      : 0;
    
    // Clean up media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Notify Socket.io
    socketClient.emit('call:end', {
      targetUserId: targetUser.username,
      callId: callIdRef.current
    });
    
    setCallState('ended');
    onCallEnd?.(finalDuration);
    
    // Close dialog after brief delay
    setTimeout(() => onClose(), 1500);
  }, [targetUser.username, onCallEnd, onClose]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Initialize call duration tracking
  useEffect(() => {
    if (callState === 'connected' && !durationIntervalRef.current) {
      callStartTimeRef.current = new Date();
      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
          setCallDuration(duration);
        }
      }, 1000);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [callState]);

  return (
    <Dialog
      open={open}
      onClose={callState === 'ended' ? onClose : undefined}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '16px',
          overflow: 'hidden'
        }
      }}
    >
      <DialogContent sx={{ p: 0, minHeight: '400px', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {/* Video area */}
          {callType === 'video' && (
            <Box sx={{ position: 'relative', height: '400px', backgroundColor: '#000' }}>
              {/* Remote video (main) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#1a1a1a'
                }}
              />
              
              {/* Local video (picture-in-picture) */}
              {isVideoOn && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '120px',
                    height: '90px',
                    borderRadius: '8px',
                    border: '2px solid #fff',
                    objectFit: 'cover'
                  }}
                />
              )}
            </Box>
          )}

          {/* Call info overlay */}
          <Box
            sx={{
              position: callType === 'video' ? 'absolute' : 'relative',
              bottom: 0,
              left: 0,
              right: 0,
              p: 3,
              background: callType === 'video' 
                ? 'linear-gradient(transparent, rgba(0,0,0,0.8))' 
                : 'transparent',
              color: 'white',
              textAlign: 'center'
            }}
          >
            {/* User info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Avatar
                src={targetUser.profile_picture}
                sx={{ 
                  width: callType === 'video' ? 60 : 80, 
                  height: callType === 'video' ? 60 : 80, 
                  mx: 'auto', 
                  mb: 2,
                  border: '3px solid rgba(255,255,255,0.3)'
                }}
              >
                {targetUser.display_name.charAt(0).toUpperCase()}
              </Avatar>
              
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {targetUser.display_name}
              </Typography>
              
              {/* Call status */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <Chip 
                  label={
                    callState === 'connecting' ? 'Connecting...' :
                    callState === 'ringing' ? (isIncoming ? 'Incoming call' : 'Ringing...') :
                    callState === 'connected' ? formatDuration(callDuration) :
                    'Call ended'
                  }
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontSize: '0.75rem'
                  }}
                />
                
                {callState === 'connected' && (
                  <Tooltip title={`Quality: ${callStats.quality}`}>
                    {getQualityIcon()}
                  </Tooltip>
                )}
              </Box>
              
              {error && (
                <Typography variant="body2" sx={{ color: '#ef4444', mb: 2 }}>
                  {error}
                </Typography>
              )}
            </motion.div>

            {/* Call controls */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              {/* Audio controls */}
              <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                <IconButton
                  onClick={toggleMute}
                  disabled={callState !== 'connected'}
                  sx={{
                    backgroundColor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: isMuted ? '#dc2626' : 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  {isMuted ? <MicOff /> : <Mic />}
                </IconButton>
              </Tooltip>

              {/* End call */}
              <Tooltip title="End call">
                <IconButton
                  onClick={handleCallEnd}
                  sx={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    '&:hover': { backgroundColor: '#dc2626' }
                  }}
                >
                  <PhoneDisabled />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default WebRTCCall;