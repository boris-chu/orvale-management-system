'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { 
  Tabs, 
  Tab, 
  Box, 
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Settings, 
  BarChart3,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import AchievementCatalog from './components/AchievementCatalog';
import AchievementEditor from './components/AchievementEditor';
import ToastCustomization from './components/ToastCustomization';
import DashboardSettings from './components/DashboardSettings';
import AchievementAnalytics from './components/AchievementAnalytics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`achievement-tabpanel-${index}`}
      aria-labelledby={`achievement-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `achievement-tab-${index}`,
    'aria-controls': `achievement-tabpanel-${index}`,
  };
}

export default function AchievementManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalAchievements: 0,
    activeAchievements: 0,
    totalUnlocks: 0,
    activeUsers: 0
  });
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    loadStats();
  }, []);

  const checkAdminAccess = async () => {
    if (!user) {
      router.push('/');
      return;
    }

    const hasAccess = user.permissions?.includes('admin.manage_users') || 
                      user.permissions?.includes('admin.system_settings');
    
    if (!hasAccess) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to manage achievements',
        variant: 'destructive'
      });
      router.push('/developer');
      return;
    }
    
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const result = await apiClient.getAchievementStats();

      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load achievement stats:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Reset states when changing tabs
    if (newValue !== 1) {
      setSelectedAchievement(null);
      setIsCreating(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedAchievement(null);
    setIsCreating(true);
    setTabValue(1); // Switch to editor tab
  };

  const handleEditAchievement = (achievement: any) => {
    setSelectedAchievement(achievement);
    setIsCreating(false);
    setTabValue(1); // Switch to editor tab
  };

  const handleSaveComplete = () => {
    // Refresh catalog after save
    setTabValue(0);
    loadStats();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/developer')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="h-6 border-l border-gray-300" />
            
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-600" />
                Achievement Management
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage achievements, badges, and gamification settings
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleCreateNew}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Achievement
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Paper elevation={1} className="p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <Typography variant="h4">{stats.totalAchievements}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total Achievements
            </Typography>
          </Paper>
          
          <Paper elevation={1} className="p-4 text-center">
            <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <Typography variant="h4">{stats.activeAchievements}</Typography>
            <Typography variant="body2" color="textSecondary">
              Active Achievements
            </Typography>
          </Paper>
          
          <Paper elevation={1} className="p-4 text-center">
            <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <Typography variant="h4">{stats.totalUnlocks}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total Unlocks
            </Typography>
          </Paper>
          
          <Paper elevation={1} className="p-4 text-center">
            <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <Typography variant="h4">{stats.activeUsers}</Typography>
            <Typography variant="body2" color="textSecondary">
              Users with Achievements
            </Typography>
          </Paper>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Paper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="achievement management tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Achievement Catalog" 
              icon={<Trophy className="h-4 w-4" />}
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              label={isCreating ? "Create Achievement" : "Edit Achievement"} 
              icon={<Award className="h-4 w-4" />}
              iconPosition="start"
              {...a11yProps(1)} 
              disabled={!isCreating && !selectedAchievement}
            />
            <Tab 
              label="Toast Customization" 
              icon={<Sparkles className="h-4 w-4" />}
              iconPosition="start"
              {...a11yProps(2)} 
            />
            <Tab 
              label="Dashboard Settings" 
              icon={<Settings className="h-4 w-4" />}
              iconPosition="start"
              {...a11yProps(3)} 
            />
            <Tab 
              label="Analytics" 
              icon={<BarChart3 className="h-4 w-4" />}
              iconPosition="start"
              {...a11yProps(4)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <AchievementCatalog 
            onEdit={handleEditAchievement}
            onRefresh={loadStats}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <AchievementEditor 
            achievement={selectedAchievement}
            isCreating={isCreating}
            onSave={handleSaveComplete}
            onCancel={() => setTabValue(0)}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <ToastCustomization />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <DashboardSettings />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <AchievementAnalytics />
        </TabPanel>
      </Paper>
    </div>
  );
}