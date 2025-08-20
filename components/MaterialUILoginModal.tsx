'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Divider,
  Slide,
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
import { TransitionProps } from '@mui/material/transitions';
import { motion, AnimatePresence } from 'framer-motion';
import { getLoginRedirectUrl } from '@/lib/login-redirect';
import React from 'react';

interface MaterialUILoginModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'regular' | 'admin' | 'staff';
  title?: string;
  description?: string;
}

export default function MaterialUILoginModal({
  open,
  onClose,
  mode = 'regular',
  title,
  description
}: MaterialUILoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  // Custom transition component combining Material UI and Framer Motion
  const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
      children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
  ) {
    return <Slide direction="up" ref={ref} {...props} />;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        
        // Determine redirect URL based on user preferences
        const redirectUrl = getLoginRedirectUrl(result.user);
        
        // Close dialog and redirect
        onClose();
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 300);
      } else {
        setError(result.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('🔧 MaterialUILoginModal - handleClose called, loading:', loading);
    if (!loading) {
      setUsername('');
      setPassword('');
      setError('');
      setShowPassword(false);
      console.log('🔧 MaterialUILoginModal - calling onClose()');
      onClose();
    } else {
      console.log('🔧 MaterialUILoginModal - handleClose blocked by loading state');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Transition}
          transitionDuration={400}
          PaperProps={{
            elevation: 24,
            sx: {
              borderRadius: 2,
              overflow: 'visible',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)'
            },
            component: motion.div,
            initial: { scale: 0.9, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.9, opacity: 0 },
            transition: { type: "spring", damping: 25, stiffness: 300 }
          }}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)'
            }
          }}
        >
          <Box sx={{ position: 'relative' }}>

            {/* Dialog Header with Icon */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              pt: 4,
              pb: 2
            }}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring",
                  damping: 15,
                  stiffness: 200,
                  delay: 0.2
                }}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: config.avatarBg,
                    mb: 2,
                    boxShadow: 3
                  }}
                >
                  {config.icon}
                </Avatar>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <DialogTitle sx={{ pb: 0, pt: 1 }}>
                  <Typography variant="h5" component="div" align="center" fontWeight="600">
                    {config.title}
                  </Typography>
                </DialogTitle>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                  {config.description}
                </Typography>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Chip
                  icon={<BoltIcon sx={{ fontSize: 16 }} />}
                  label={config.badge}
                  size="small"
                  color={config.color as any}
                  variant="outlined"
                  sx={{ mt: 2 }}
                />
              </motion.div>
            </Box>

            <DialogContent sx={{ px: 4, pb: 2 }}>
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
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
                          <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                          >
                            <PersonIcon color="action" />
                          </motion.div>
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
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
                          <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5, delay: 0.9 }}
                          >
                            <LockIcon color="action" />
                          </motion.div>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              disabled={loading}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </motion.div>
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ type: "spring", damping: 20 }}
                    >
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Test accounts info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      mt: 3, 
                      p: 2, 
                      bgcolor: 'grey.50',
                      borderColor: 'grey.300'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight="500">
                      Development Test Accounts:
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                      admin/admin123 • boris.chu/boris123 • john.doe/john123
                    </Typography>
                  </Paper>
                </motion.div>
              </Box>
            </DialogContent>

            <Divider />

            <DialogActions sx={{ px: 4, py: 2 }}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                style={{ flex: 1 }}
              >
                <Button
                  onClick={handleClose}
                  disabled={loading}
                  variant="outlined"
                  fullWidth
                  component={motion.button}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                style={{ flex: 1 }}
              >
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !username.trim() || !password.trim()}
                  variant="contained"
                  color={config.color as any}
                  fullWidth
                  component={motion.button}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  startIcon={
                    loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <CircularProgress size={20} color="inherit" />
                      </motion.div>
                    ) : (
                      <LoginIcon />
                    )
                  }
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </motion.div>
            </DialogActions>
          </Box>
        </Dialog>
      )}
    </AnimatePresence>
  );
}