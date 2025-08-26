'use client';

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Alert, CircularProgress } from '@mui/material';

interface WidgetStatus {
  enabled: boolean;
  showWidget?: boolean;
  status?: 'online' | 'offline' | 'outside_hours';
  message?: string;
  outsideBusinessHours?: boolean;
  widget?: {
    shape: string;
    color: string;
    size: string;
    position: string;
    text: string;
    animation: string;
    animationDuration: number;
    animationDelay: number;
  };
  messages?: {
    welcome: string;
    offline: string;
  };
  schedule?: any;
  nextAvailable?: string;
}

const PublicChatDemo = () => {
  const [widgetStatus, setWidgetStatus] = useState<WidgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChatWidget, setShowChatWidget] = useState(false);

  useEffect(() => {
    checkWidgetStatus();
    // Check status every 30 seconds to handle business hours changes
    const interval = setInterval(checkWidgetStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkWidgetStatus = async () => {
    try {
      const response = await fetch('/api/public-portal/widget-status');
      const data = await response.json();
      setWidgetStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Error checking widget status:', error);
      setWidgetStatus({ enabled: false, message: 'Failed to check widget status' });
      setLoading(false);
    }
  };

  const getWidgetStyles = () => {
    if (!widgetStatus?.widget) return {};

    const { shape, color, size, position } = widgetStatus.widget;
    
    const sizeMap = {
      small: { width: 48, height: 48 },
      medium: { width: 64, height: 64 },
      large: { width: 80, height: 80 }
    };

    const positionMap = {
      'bottom-right': { bottom: 20, right: 20 },
      'bottom-left': { bottom: 20, left: 20 },
      'top-right': { top: 20, right: 20 },
      'top-left': { top: 20, left: 20 }
    };

    return {
      position: 'fixed' as const,
      backgroundColor: widgetStatus?.status === 'online' ? color : '#9e9e9e',
      color: 'white',
      borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? '12px' : '0px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      fontSize: '24px',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      opacity: widgetStatus?.status === 'online' ? 1 : 0.7,
      ...sizeMap[size as keyof typeof sizeMap],
      ...positionMap[position as keyof typeof positionMap],
      '&:hover': {
        transform: 'scale(1.1)'
      }
    };
  };

  const getAnimationClass = () => {
    if (!widgetStatus?.widget || widgetStatus?.status !== 'online') return '';
    
    const { animation } = widgetStatus.widget;
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'bounce':
        return 'animate-bounce';
      case 'shake':
        return 'animate-shake';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography ml={2}>Checking widget status...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', p: 4 }}>
      <Typography variant="h4" gutterBottom textAlign="center" color="primary">
        Public Portal Live Chat - Demo Page
      </Typography>
      
      <Box maxWidth="800px" mx="auto" mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Widget Status
            </Typography>
            
            {widgetStatus?.showWidget ? (
              <Alert severity={widgetStatus?.status === 'online' ? "success" : "warning"} sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {widgetStatus?.status === 'online' ? (
                    <strong>✅ Public live chat is currently ONLINE and available to website visitors</strong>
                  ) : (
                    <strong>🕒 Public live chat widget is VISIBLE but currently {widgetStatus?.status === 'outside_hours' ? 'OUTSIDE BUSINESS HOURS' : 'OFFLINE'}</strong>
                  )}
                  {widgetStatus.outsideBusinessHours && (
                    <><br />Note: Widget shows with offline status - visitors can still see it but will get offline message.</>
                  )}
                  {widgetStatus?.message && (
                    <><br />Message: {widgetStatus.message}</>
                  )}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>❌ Public live chat is currently DISABLED BY ADMIN</strong>
                  <br />
                  {widgetStatus?.message || 'Chat widget will not appear on public pages at all'}
                </Typography>
              </Alert>
            )}

            <Typography variant="body1" paragraph>
              This page demonstrates the public chat widget behavior with the new two-toggle system:
            </Typography>
            
            <ul>
              <li><strong>Widget Visibility Toggle:</strong> Controls if the widget appears on website pages at all</li>
              <li><strong>Business Hours Override Toggle:</strong> Controls if chat is always available or respects business hours</li>
              <li><strong>When Widget Hidden:</strong> No widget appears anywhere (admin disabled visibility)</li>
              <li><strong>When Always Available:</strong> Widget shows online 24/7 (ignoring business hours)</li>
              <li><strong>When Business Hours Only:</strong> Widget shows offline outside configured hours</li>
            </ul>

            <Typography variant="body2" color="text.secondary" mt={2}>
              Widget status updates automatically every 30 seconds.
            </Typography>

            {widgetStatus?.widget && (
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Widget Configuration
                </Typography>
                <Typography variant="body2">
                  <strong>Shape:</strong> {widgetStatus.widget.shape}<br />
                  <strong>Size:</strong> {widgetStatus.widget.size}<br />
                  <strong>Color:</strong> {widgetStatus.widget.color}<br />
                  <strong>Position:</strong> {widgetStatus.widget.position}<br />
                  <strong>Text:</strong> {widgetStatus.widget.text}<br />
                  <strong>Animation:</strong> {widgetStatus.widget.animation}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Demo Content */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sample Website Content
            </Typography>
            <Typography variant="body1" paragraph>
              This is sample content to demonstrate how the chat widget appears on a real website page. 
              The widget should appear in the configured position if live chat is enabled.
            </Typography>
            <Typography variant="body1" paragraph>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt 
              ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.
            </Typography>
            <Typography variant="body1" paragraph>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat 
              nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui 
              officia deserunt mollit anim id est laborum.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Chat Widget */}
      {widgetStatus?.showWidget && widgetStatus?.widget && (
        <Box
          sx={getWidgetStyles()}
          className={getAnimationClass()}
          onClick={() => setShowChatWidget(true)}
          title={widgetStatus.widget.text}
        >
          {widgetStatus.status === 'outside_hours' ? '🕒' :
           widgetStatus.status !== 'online' ? '💤' : '💬'}
        </Box>
      )}

      {/* Simple Chat Modal (Demo) */}
      {showChatWidget && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            width: 300,
            height: 400,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Box sx={{ p: 2, bgcolor: widgetStatus?.widget?.color || '#1976d2', color: 'white', borderRadius: '8px 8px 0 0' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Live Chat</Typography>
              <Typography 
                sx={{ cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => setShowChatWidget(false)}
              >
                ×
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {widgetStatus?.messages?.welcome || 'Hi! How can we help you today?'}
            </Typography>
            <Typography variant="caption" display="block" mt={2} color="text.secondary">
              This is a demo. In the full implementation, this would be a complete chat interface.
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PublicChatDemo;