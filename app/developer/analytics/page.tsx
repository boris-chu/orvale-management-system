'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Ticket, 
  Activity,
  ArrowLeft,
  RefreshCw,
  Calendar,
  PieChart,
  Clock,
  Target,
  Download,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRegularTime } from '@/lib/time-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';

// Placeholder chart components - will be replaced with actual evilcharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';

interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalTickets: number;
  organizationalUnits: number;
  categoryPaths: number;
  // Real analytics data
  resolutionRate?: number;
  avgResolutionTime?: number;
  completedTickets?: number;
  pendingTickets?: number;
  inProgressTickets?: number;
}

interface TicketTrend {
  date: string;
  tickets: number;
  resolved: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface TeamPerformance {
  teamName: string;
  ticketsHandled: number;
  avgResponseTime: number;
  resolutionRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Helper function to format category names
const formatCategoryName = (name: string): string => {
  // Handle camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim(); // Remove any leading/trailing spaces
};

export default function SystemAnalytics() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<AnalyticsStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTeams: 0,
    totalTickets: 0,
    organizationalUnits: 0,
    categoryPaths: 0,
    resolutionRate: 0,
    avgResolutionTime: 0,
    completedTickets: 0,
    pendingTickets: 0,
    inProgressTickets: 0
  });
  const [ticketTrends, setTicketTrends] = useState<TicketTrend[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDistribution[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [workModeData, setWorkModeData] = useState([
    { name: 'Ready', count: 12, color: '#4ade80' },
    { name: 'Work Mode', count: 8, color: '#fbbf24' },
    { name: 'Ticketing Mode', count: 5, color: '#60a5fa' },
    { name: 'Away', count: 3, color: '#f87171' },
    { name: 'Break', count: 2, color: '#a78bfa' }
  ]);
  const [workModeHistory, setWorkModeHistory] = useState([
    { hour: '00:00', ready: 15, work_mode: 5, ticketing_mode: 8, away: 2, break: 0 },
    { hour: '04:00', ready: 12, work_mode: 3, ticketing_mode: 10, away: 5, break: 0 },
    { hour: '08:00', ready: 18, work_mode: 12, ticketing_mode: 6, away: 2, break: 2 },
    { hour: '12:00', ready: 20, work_mode: 15, ticketing_mode: 4, away: 1, break: 3 },
    { hour: '16:00', ready: 16, work_mode: 18, ticketing_mode: 5, away: 2, break: 1 },
    { hour: '20:00', ready: 14, work_mode: 8, ticketing_mode: 8, away: 3, break: 1 }
  ]);
  const [staffWorkModeDetails, setStaffWorkModeDetails] = useState([
    {
      username: 'bchu',
      displayName: 'Boris Chu',
      currentMode: 'Ready',
      modeIcon: '🟢',
      modeColor: '#4ade80',
      timeInMode: '2h 15m',
      activeChats: 3,
      dailyModeChanges: 5,
      assignmentRate: 95
    },
    {
      username: 'admin',
      displayName: 'Administrator',
      currentMode: 'Work Mode',
      modeIcon: '🟡',
      modeColor: '#fbbf24',
      timeInMode: '45m',
      activeChats: 1,
      dailyModeChanges: 3,
      assignmentRate: 87
    },
    {
      username: 'jdoe',
      displayName: 'John Doe',
      currentMode: 'Ticketing Mode',
      modeIcon: '🔵',
      modeColor: '#60a5fa',
      timeInMode: '1h 30m',
      activeChats: 0,
      dailyModeChanges: 2,
      assignmentRate: 0
    },
    {
      username: 'msmith',
      displayName: 'Mary Smith',
      currentMode: 'Break',
      modeIcon: '⏸️',
      modeColor: '#a78bfa',
      timeInMode: '12m',
      activeChats: 0,
      dailyModeChanges: 6,
      assignmentRate: 92
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadAnalyticsData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAnalyticsData();
    }
  }, [dateRange]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const checkPermissions = async () => {
    try {
      const result = await apiClient.getCurrentUser();
      const user = result.data?.user || result.data;
      
      if (!user) {
        window.location.href = '/';
        return;
      }
      
      // Check for analytics permission
      if (!user.permissions?.includes('admin.view_analytics')) {
        window.location.href = '/developer';
        return;
      }
      
      setCurrentUser(user);
    } catch (error) {
      console.error('Permission check failed:', error);
      window.location.href = '/';
    }
  };

  const loadAnalyticsData = async () => {
    try {
      // Load basic stats
      const statsResult = await apiClient.getDeveloperStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Load analytics overview data
      const analyticsResult = await apiClient.getDeveloperAnalytics('overview', dateRange);
      if (analyticsResult.success) {
        const analyticsData = analyticsResult.data;
        
        // Update stats with real analytics data
        if (analyticsData.summary) {
          setStats(prev => ({
            ...prev,
            resolutionRate: analyticsData.summary.resolutionRate,
            avgResolutionTime: analyticsData.summary.avgResolutionTime,
            completedTickets: analyticsData.summary.completedTickets,
            pendingTickets: analyticsData.summary.pendingTickets,
            inProgressTickets: analyticsData.summary.inProgressTickets
          }));
        }
        
        // Update category data
        if (analyticsData.categoryDistribution) {
          setCategoryData(analyticsData.categoryDistribution.map((cat: any) => ({
            name: cat.category,
            value: cat.count,
            percentage: cat.percentage
          })));
        }
      }

      // Load ticket trends
      await loadTicketTrends();
      
      // Load team performance
      await loadTeamPerformance();
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketTrends = async () => {
    try {
      const result = await apiClient.getDeveloperAnalytics('trends', dateRange);
      if (result.success) {
        setTicketTrends(result.data.trends || []);
      }
    } catch (error) {
      console.error('Failed to load ticket trends:', error);
    }
  };

  const loadTeamPerformance = async () => {
    try {
      const result = await apiClient.getDeveloperAnalytics('teams', dateRange);
      if (result.success) {
        setTeamPerformance(result.data.teams || []);
      }
    } catch (error) {
      console.error('Failed to load team performance:', error);
    }
  };

  const refreshData = () => {
    setLoading(true);
    loadAnalyticsData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading service analytics...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/developer'}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Service Analytics</h1>
                  <p className="text-sm text-gray-500">Service delivery performance and operational insights</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={refreshData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              
              {/* User Profile Menu */}
              <TooltipProvider>
                <div className="relative user-menu-container">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <UserAvatar 
                          user={currentUser}
                          size="md"
                          showOnlineIndicator={true}
                          className="border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>User Menu</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* User Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* User Info Section */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="flex items-center space-x-3">
                            <UserAvatar 
                              user={currentUser}
                              size="lg"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.display_name}</p>
                              <p className="text-xs text-gray-600 truncate">{currentUser?.email}</p>
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {currentUser?.role_id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              setShowProfileModal(true);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150"
                          >
                            <div className="w-5 h-5 flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Edit Profile</span>
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem('authToken');
                              localStorage.removeItem('currentUser');
                              window.location.href = '/';
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors duration-150"
                          >
                            <div className="w-5 h-5 flex items-center justify-center">
                              <LogOut className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalTickets}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +12% from last month
                  </p>
                </div>
                <Ticket className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +5% from last month
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.avgResolutionTime ? `${stats.avgResolutionTime}h` : '0h'}</p>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    Resolution time
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.resolutionRate || 0}%</p>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Target className="h-4 w-4 mr-1" />
                    {stats.completedTickets || 0} of {stats.totalTickets || 0} completed
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tickets">Ticket Trends</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="teams">Team Performance</TabsTrigger>
              <TabsTrigger value="work-modes">Staff Work Modes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ticket Volume Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Volume (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={ticketTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate().toString()} />
                        <YAxis />
                        <RechartsTooltip labelFormatter={(date) => formatRegularTime(date)} />
                        <Line type="monotone" dataKey="tickets" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="resolved" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Ticket Trends Analysis</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant={dateRange === '7d' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setDateRange('7d')}
                        disabled={loading}
                      >
                        7 Days
                      </Button>
                      <Button 
                        variant={dateRange === '30d' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setDateRange('30d')}
                        disabled={loading}
                      >
                        30 Days
                      </Button>
                      <Button 
                        variant={dateRange === '90d' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setDateRange('90d')}
                        disabled={loading}
                      >
                        90 Days
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={ticketTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate().toString()} />
                      <YAxis />
                      <RechartsTooltip labelFormatter={(date) => formatRegularTime(date)} />
                      <Bar dataKey="tickets" fill="#8884d8" name="New Tickets" />
                      <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Category Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryData.map((category, index) => (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{formatCategoryName(category.name)}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{category.value} tickets</p>
                            <p className="text-sm text-gray-500">{category.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resolution Times by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryData.map((category, index) => {
                        const avgTime = (Math.random() * 5 + 1).toFixed(1);
                        return (
                          <div key={category.name} className="flex items-center justify-between">
                            <span className="font-medium">{formatCategoryName(category.name)}</span>
                            <Badge variant="outline">{avgTime}h avg</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="teams" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Team</th>
                          <th className="text-right py-3 px-4">Tickets Handled</th>
                          <th className="text-right py-3 px-4">Avg Response Time</th>
                          <th className="text-right py-3 px-4">Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPerformance.map((team, index) => (
                          <tr key={team.teamName} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{team.teamName}</td>
                            <td className="text-right py-3 px-4">{team.ticketsHandled}</td>
                            <td className="text-right py-3 px-4">{team.avgResponseTime}h</td>
                            <td className="text-right py-3 px-4">
                              <Badge 
                                variant={team.resolutionRate >= 90 ? "default" : "destructive"}
                              >
                                {team.resolutionRate}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="work-modes" className="space-y-6 mt-6">
              {/* Mock Data Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800">
                  <Activity className="h-5 w-5" />
                  <span className="font-semibold">Work Mode Analytics - Preview</span>
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  This data is currently simulated for demonstration purposes. Real-time work mode analytics will be available once staff begin using the public portal chat system. 
                  Data includes work mode distribution, time tracking, chat assignment rates, and productivity metrics.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Work Mode Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Work Mode Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={workModeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                        >
                          {workModeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {workModeData.map((mode) => (
                        <div key={mode.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: mode.color }}
                            />
                            <span className="text-sm">{mode.name}</span>
                          </div>
                          <Badge variant="outline">{mode.count} staff</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Work Mode History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Work Mode Changes (Last 24h)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={workModeHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="ready" stackId="a" fill="#4ade80" />
                        <Bar dataKey="work_mode" stackId="a" fill="#fbbf24" />
                        <Bar dataKey="ticketing_mode" stackId="a" fill="#60a5fa" />
                        <Bar dataKey="away" stackId="a" fill="#f87171" />
                        <Bar dataKey="break" stackId="a" fill="#a78bfa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Staff Work Mode Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff Work Mode Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Staff Member</th>
                          <th className="text-left py-3 px-4">Current Mode</th>
                          <th className="text-right py-3 px-4">Time in Mode</th>
                          <th className="text-right py-3 px-4">Active Chats</th>
                          <th className="text-right py-3 px-4">Daily Mode Changes</th>
                          <th className="text-right py-3 px-4">Chat Assignment Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffWorkModeDetails.map((staff, index) => (
                          <tr key={staff.username} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <UserAvatar 
                                  user={{ display_name: staff.displayName }}
                                  size="sm"
                                />
                                <span className="font-medium">{staff.displayName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant="outline"
                                style={{ 
                                  color: staff.modeColor,
                                  borderColor: staff.modeColor
                                }}
                              >
                                {staff.modeIcon} {staff.currentMode}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-gray-600">
                              {staff.timeInMode}
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={staff.activeChats > 0 ? "default" : "secondary"}>
                                {staff.activeChats}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4 text-sm">
                              {staff.dailyModeChanges}
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge 
                                variant={staff.assignmentRate >= 80 ? "default" : "destructive"}
                              >
                                {staff.assignmentRate}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Work Mode Efficiency Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Chat Assignment Efficiency
                      </div>
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        PREVIEW
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">92.5%</div>
                    <p className="text-sm text-gray-600">
                      Average chat assignment success rate across all work modes
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Ready Mode:</span>
                        <span className="font-medium">98.2%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Work Mode:</span>
                        <span className="font-medium">85.1%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Ticketing:</span>
                        <span className="font-medium">0%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Average Response Time
                      </div>
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        PREVIEW
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">2.3 min</div>
                    <p className="text-sm text-gray-600">
                      Time from chat initiation to staff response
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Ready Mode:</span>
                        <span className="font-medium">1.8 min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Work Mode:</span>
                        <span className="font-medium">4.2 min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Queue Performance
                      </div>
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        PREVIEW
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">18 sec</div>
                    <p className="text-sm text-gray-600">
                      Average guest wait time in queue
                    </p>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Ready Staff Available:</span>
                        <span className="font-medium">{workModeData.find(m => m.name === 'Ready')?.count || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Peak Queue Time:</span>
                        <span className="font-medium">2:30 PM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      
      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={currentUser}
        onProfileUpdate={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }}
      />
    </div>
  );
}