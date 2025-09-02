'use client';

import { useState } from 'react';
import {
  Dialog,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
  Chip,
  Paper,
  Avatar,
  Grow,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Login as LoginIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Shield as ShieldIcon,
  Group as GroupIcon,
  Bolt as BoltIcon
} from '@mui/icons-material';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { getLoginRedirectUrl } from '@/lib/login-redirect';
import apiClient from '@/lib/api-client';
import React from 'react';

interface MaterialUILoginModalAnimatedProps {
  open: boolean;
  onClose: () => void;
  mode?: 'regular' | 'admin' | 'staff';
  title?: string;
  description?: string;
  animationStyle?: 'bounce' | 'slide' | 'zoom' | 'flip';
}

export default function MaterialUILoginModalAnimated({
  open,
  onClose,
  mode = 'regular',
  title,
  description,
  animationStyle = 'bounce'
}: MaterialUILoginModalAnimatedProps) {
  // Component loaded successfully
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const controls = useAnimation();

  const modalConfig = {
    regular: {
      title: title || 'Staff Login',
      description: description || 'Access the ticket management system',
      icon: <LoginIcon />,
      color: 'primary',
      badge: 'Staff Access',
      avatarBg: '#2196f3'
    },
    admin: {
      title: title || 'Admin Login',
      description: description || 'Administrative access during maintenance',
      icon: <ShieldIcon />,
      color: 'error',
      badge: 'Admin Access',
      avatarBg: '#f44336'
    },
    staff: {
      title: title || 'IT Staff Access',
      description: description || 'Internal staff portal access',
      icon: <GroupIcon />,
      color: 'secondary',
      badge: 'IT Staff',
      avatarBg: '#9c27b0'
    }
  };

  const config = modalConfig[mode];

  // Animation variants based on style
  const animationVariants = {
    bounce: {
      initial: { scale: 0, rotate: -180, opacity: 0 },
      animate: { 
        scale: 1, 
        rotate: 0, 
        opacity: 1,
        transition: {
          type: "spring",
          damping: 15,
          stiffness: 200
        }
      },
      exit: { scale: 0, rotate: 180, opacity: 0 }
    },
    slide: {
      initial: { y: 300, opacity: 0 },
      animate: { 
        y: 0, 
        opacity: 1,
        transition: {
          type: "spring",
          damping: 25,
          stiffness: 300
        }
      },
      exit: { y: 300, opacity: 0 }
    },
    zoom: {
      initial: { scale: 0.5, opacity: 0 },
      animate: { 
        scale: 1, 
        opacity: 1,
        transition: {
          duration: 0.3,
          ease: [0.0, 0.0, 0.2, 1]
        }
      },
      exit: { scale: 0.5, opacity: 0 }
    },
    flip: {
      initial: { rotateY: 90, opacity: 0 },
      animate: { 
        rotateY: 0, 
        opacity: 1,
        transition: {
          duration: 0.6,
          ease: "easeOut"
        }
      },
      exit: { rotateY: -90, opacity: 0 }
    }
  };

  const selectedAnimation = animationVariants[animationStyle];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Trigger shake animation on avatar when logging in
    controls.start({
      rotate: [0, -5, 5, -5, 5, 0],
      transition: { duration: 0.5 }
    });

    try {
      // Login attempt with API Gateway
      const result = await apiClient.login({ username, password });

      if (result.success && result.data?.token) {
        // apiClient.login already stores the token
        // Store user data for immediate access
        localStorage.setItem('currentUser', JSON.stringify(result.data.user));
        
        // Force localStorage to flush (production timing fix)
        localStorage.getItem('authToken'); // Read to ensure write is complete
        
        console.log('🔐 Login success - token stored, user:', result.data.user.display_name);
        
        // Determine redirect URL based on user preferences
        const redirectUrl = getLoginRedirectUrl(result.data.user);
        console.log('🔀 Redirecting to:', redirectUrl);
        
        // Success animation
        controls.start({
          scale: [1, 1.2, 0],
          opacity: [1, 1, 0],
          transition: { duration: 0.3 } // Reduced animation time
        });

        // Reduced delay for production build compatibility
        setTimeout(() => {
          onClose();
          // Ensure token is still there before redirect
          const tokenCheck = localStorage.getItem('authToken');
          console.log('🔀 Pre-redirect token check:', !!tokenCheck);
          window.location.href = redirectUrl;
        }, 300);
      } else {
        setError(result.message || 'Invalid username or password');
        // Error shake animation
        controls.start({
          x: [0, -10, 10, -10, 10, 0],
          transition: { duration: 0.4 }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setUsername('');
      setPassword('');
      setError('');
      setShowPassword(false);
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            component: motion.div,
            style: { perspective: '1000px' },
            ...selectedAnimation,
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }
          }}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)'
            }
          }}
        >
          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            {/* Animated background gradient */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '200px',
                background: `linear-gradient(135deg, ${config.avatarBg}20 0%, ${config.avatarBg}10 100%)`,
                zIndex: 0
              }}
              animate={{
                background: [
                  `linear-gradient(135deg, ${config.avatarBg}20 0%, ${config.avatarBg}10 100%)`,
                  `linear-gradient(225deg, ${config.avatarBg}10 0%, ${config.avatarBg}20 100%)`,
                  `linear-gradient(135deg, ${config.avatarBg}20 0%, ${config.avatarBg}10 100%)`
                ]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />


            {/* Header with animated avatar */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              pt: 6,
              pb: 3,
              position: 'relative',
              zIndex: 1
            }}>
              <motion.div animate={controls}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: config.avatarBg,
                    mb: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    border: '4px solid rgba(255,255,255,0.9)'
                  }}
                >
                  {config.icon}
                </Avatar>
              </motion.div>

              <Typography variant="h4" fontWeight="700" gutterBottom>
                {config.title}
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {config.description}
              </Typography>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Chip
                  icon={<BoltIcon />}
                  label={config.badge}
                  color={config.color as any}
                  sx={{ fontWeight: 600 }}
                />
              </motion.div>
            </Box>

            {/* Form content */}
            <Box sx={{ px: 4, pb: 3 }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Grow in={open} timeout={600}>
                  <TextField
                    fullWidth
                    label="Username"
                    variant="outlined"
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="username"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: config.avatarBg,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: config.avatarBg,
                        }
                      }
                    }}
                  />
                </Grow>

                <Grow in={open} timeout={800}>
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={loading}
                          >
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={showPassword ? 'visible' : 'hidden'}
                                initial={{ opacity: 0, rotate: -180 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 180 }}
                                transition={{ duration: 0.3 }}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </motion.div>
                            </AnimatePresence>
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: config.avatarBg,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: config.avatarBg,
                        }
                      }
                    }}
                  />
                </Grow>

                <Collapse in={!!error}>
                  <Alert 
                    severity="error" 
                    sx={{ mt: 2 }}
                    action={
                      <IconButton
                        color="inherit"
                        size="small"
                        onClick={() => setError('')}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    }
                  >
                    {error}
                  </Alert>
                </Collapse>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <motion.div style={{ flex: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleClose}
                      disabled={loading}
                      variant="outlined"
                      fullWidth
                      size="large"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  
                  <motion.div style={{ flex: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      disabled={loading || !username.trim() || !password.trim()}
                      variant="contained"
                      color={config.color as any}
                      fullWidth
                      size="large"
                      startIcon={
                        loading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <LoginIcon />
                        )
                      }
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </motion.div>
                </Box>

                {/* Test accounts */}
                <Grow in={open} timeout={1000}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      mt: 3, 
                      p: 2, 
                      bgcolor: 'grey.50',
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight="600">
                      Development Test Accounts:
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                      admin/admin123 • boris.chu/boris123 • john.doe/john123
                    </Typography>
                  </Paper>
                </Grow>
              </Box>
            </Box>
          </Box>
        </Dialog>
      )}
    </AnimatePresence>
  );
}