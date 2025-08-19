'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Settings, Wrench, Clock, Phone, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MaintenanceTheme {
  // Primary Colors
  primaryColor: string;
  backgroundColor: string;
  cardBackground: string;
  
  // Text Colors  
  headingColor: string;
  textColor: string;
  accentTextColor: string;
  
  // UI Elements
  borderColor: string;
  iconColor: string;
  buttonBackground: string;
  buttonText: string;
  
  // Advanced
  gradientStart?: string;
  gradientEnd?: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface MaintenanceConfig {
  message: string;
  theme: MaintenanceTheme;
  estimatedReturn?: string;
  emergencyContact?: string;
  adminOverride: boolean;
  showRefreshButton: boolean;
  logChanges: boolean;
}

// Predefined theme presets
export const THEME_PRESETS: Record<string, MaintenanceTheme> = {
  'orvale-default': {
    primaryColor: '#2563eb',
    backgroundColor: '#f8fafc',
    cardBackground: '#ffffff',
    headingColor: '#1e293b',
    textColor: '#475569',
    accentTextColor: '#2563eb',
    borderColor: '#e2e8f0',
    iconColor: '#3b82f6',
    buttonBackground: '#2563eb',
    buttonText: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px'
  },
  'government-official': {
    primaryColor: '#166534',
    backgroundColor: '#f0f9ff',
    cardBackground: '#ffffff',
    headingColor: '#064e3b',
    textColor: '#374151',
    accentTextColor: '#166534',
    borderColor: '#d1fae5',
    iconColor: '#059669',
    buttonBackground: '#166534',
    buttonText: '#ffffff',
    fontFamily: 'Georgia, serif',
    borderRadius: '4px'
  },
  'maintenance-orange': {
    primaryColor: '#ea580c',
    backgroundColor: '#fff7ed',
    cardBackground: '#ffffff',
    headingColor: '#9a3412',
    textColor: '#451a03',
    accentTextColor: '#ea580c',
    borderColor: '#fed7aa',
    iconColor: '#f97316',
    buttonBackground: '#ea580c',
    buttonText: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px'
  },
  'emergency-red': {
    primaryColor: '#dc2626',
    backgroundColor: '#fef2f2',
    cardBackground: '#ffffff',
    headingColor: '#991b1b',
    textColor: '#7f1d1d',
    accentTextColor: '#dc2626',
    borderColor: '#fecaca',
    iconColor: '#ef4444',
    buttonBackground: '#dc2626',
    buttonText: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px'
  },
  'dark-mode': {
    primaryColor: '#3b82f6',
    backgroundColor: '#0f172a',
    cardBackground: '#1e293b',
    headingColor: '#f1f5f9',
    textColor: '#e2e8f0',
    accentTextColor: '#60a5fa',
    borderColor: '#334155',
    iconColor: '#3b82f6',
    buttonBackground: '#3b82f6',
    buttonText: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px'
  }
};

interface MaintenancePageProps {
  config?: MaintenanceConfig;
  preview?: boolean;
}

export default function MaintenancePage({ config, preview = false }: MaintenancePageProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeUntilReturn, setTimeUntilReturn] = useState<string | null>(null);

  // Format phone number for display
  const formatPhoneForDisplay = (phone: string): string => {
    // Remove all non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // Format if it's exactly 10 digits
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return phone;
  };

  // Default configuration
  const defaultConfig: MaintenanceConfig = {
    message: 'System is under maintenance. Please try again later.',
    theme: THEME_PRESETS['orvale-default'],
    adminOverride: true,
    showRefreshButton: true,
    logChanges: true
  };

  const activeConfig = config || defaultConfig;
  const theme = activeConfig.theme;

  // Calculate time until return if estimated return time is provided
  useEffect(() => {
    if (!activeConfig.estimatedReturn) return;

    const updateTimeRemaining = () => {
      const returnTime = new Date(activeConfig.estimatedReturn!);
      const now = new Date();
      const diff = returnTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilReturn('Expected momentarily');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeUntilReturn(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeUntilReturn(`${minutes}m remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeConfig.estimatedReturn]);

  // Auto-refresh functionality (only when not in preview mode)
  useEffect(() => {
    if (preview || !activeConfig.showRefreshButton) return;

    const checkMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/maintenance/status');
        const data = await response.json();
        
        if (!data.isSystemMaintenance && !data.isPortalMaintenance) {
          // Maintenance is over, reload the page
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to check maintenance status:', error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [preview, activeConfig.showRefreshButton]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    if (preview) {
      // In preview mode, just simulate refresh
      setTimeout(() => setIsRefreshing(false), 1000);
      return;
    }

    try {
      const response = await fetch('/api/maintenance/status');
      const data = await response.json();
      
      if (!data.isSystemMaintenance && !data.isPortalMaintenance) {
        window.location.reload();
      } else {
        // Still in maintenance, just stop the loading spinner
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleAdminLogin = () => {
    if (preview) return;
    window.location.href = '/?admin=true';
  };

  // Dynamic styles based on theme with safe property access
  const pageStyle: React.CSSProperties = {
    backgroundColor: (theme?.gradientStart && theme?.gradientEnd) 
      ? undefined 
      : theme?.backgroundColor || '#f8fafc',
    backgroundImage: (theme?.gradientStart && theme?.gradientEnd) 
      ? `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})`
      : undefined,
    fontFamily: theme?.fontFamily || 'system-ui, sans-serif',
    minHeight: '100vh',
    color: theme?.textColor || '#475569'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || '#ffffff',
    borderColor: theme?.borderColor || '#e2e8f0',
    borderRadius: theme?.borderRadius || '8px'
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonBackground || '#2563eb',
    color: theme?.buttonText || '#ffffff',
    borderRadius: theme?.borderRadius || '6px'
  };

  return (
    <div style={pageStyle} className="flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card style={cardStyle} className="border-2 shadow-lg">
          <CardContent className="p-8 text-center">
            {/* Logo and Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
                   style={{ backgroundColor: `${theme?.primaryColor || '#2563eb'}20` }}>
                <Wrench 
                  size={40} 
                  style={{ color: theme?.iconColor || theme?.primaryColor || '#2563eb' }}
                  className="animate-pulse"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-wide" style={{ color: theme?.headingColor || '#1e293b' }}>
                ORVALE MANAGEMENT SYSTEM
              </h1>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <h2 className="text-3xl font-bold mb-2" style={{ color: theme?.primaryColor || '#2563eb' }}>
                System Maintenance
              </h2>
              <div className="w-24 h-1 mx-auto rounded" style={{ backgroundColor: theme?.primaryColor || '#2563eb' }}></div>
            </motion.div>

            {/* Maintenance Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <div className="text-lg leading-relaxed mb-4" style={{ color: theme?.textColor || '#475569' }}>
                <div dangerouslySetInnerHTML={{ 
                  __html: activeConfig.message.replace(/\n/g, '<br>') 
                }} />
              </div>
              
            </motion.div>

            {/* Additional Information */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="space-y-4 mb-8"
            >
              {/* Estimated Return Time */}
              {activeConfig.estimatedReturn && (
                <div className="flex items-center justify-center space-x-2 p-3 rounded-lg"
                     style={{ backgroundColor: `${theme?.primaryColor || '#2563eb'}10` }}>
                  <Clock size={20} style={{ color: theme?.accentTextColor || theme?.primaryColor || '#2563eb' }} />
                  <span style={{ color: theme?.accentTextColor || theme?.primaryColor || '#2563eb' }} className="font-medium">
                    {timeUntilReturn || `Expected completion: ${new Date(activeConfig.estimatedReturn).toLocaleString()}`}
                  </span>
                </div>
              )}

              {/* Emergency Contact */}
              {activeConfig.emergencyContact && (
                <div className="flex items-center justify-center space-x-2 p-3 rounded-lg"
                     style={{ backgroundColor: `${theme?.primaryColor || '#2563eb'}10` }}>
                  <Phone size={20} style={{ color: theme?.accentTextColor || theme?.primaryColor || '#2563eb' }} />
                  <span style={{ color: theme?.accentTextColor || theme?.primaryColor || '#2563eb' }} className="font-medium">
                    Emergency contact: {formatPhoneForDisplay(activeConfig.emergencyContact)}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {activeConfig.showRefreshButton && (
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  style={buttonStyle}
                  className="flex items-center space-x-2 px-6 py-3 text-lg font-medium transition-all duration-200 hover:opacity-90"
                >
                  <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>{isRefreshing ? 'Checking...' : 'Refresh Page'}</span>
                </Button>
              )}

              {activeConfig.adminOverride && (
                <Button
                  onClick={handleAdminLogin}
                  variant="outline"
                  className="flex items-center space-x-2 px-6 py-3 text-lg font-medium transition-all duration-200"
                  style={{ 
                    borderColor: theme?.borderColor || '#e2e8f0', 
                    color: theme?.accentTextColor || theme?.primaryColor || '#2563eb',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Settings size={20} />
                  <span>Admin Login</span>
                </Button>
              )}
            </motion.div>

            {/* Footer Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 pt-6 border-t"
              style={{ borderColor: theme?.borderColor || '#e2e8f0' }}
            >
              <p className="text-sm font-medium" style={{ color: theme?.textColor || '#475569' }}>
                Thank you for your patience.
              </p>
              {!preview && activeConfig.showRefreshButton && (
                <p className="text-xs mt-2" style={{ color: theme?.textColor || '#475569', opacity: 0.7 }}>
                  This page will automatically refresh when maintenance is complete.
                </p>
              )}
            </motion.div>
          </CardContent>
        </Card>

        {/* Preview indicator */}
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-4 text-center"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium"
                 style={{ backgroundColor: theme?.primaryColor || '#2563eb', color: theme?.buttonText || '#ffffff' }}>
              <AlertTriangle size={14} />
              <span>Live Preview - Updates in real-time</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}