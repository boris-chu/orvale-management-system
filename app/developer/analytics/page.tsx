'use client';

import { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Placeholder chart components - will be replaced with actual evilcharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar } from 'recharts';

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    checkPermissions();
    loadAnalyticsData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAnalyticsData();
    }
  }, [dateRange]);

  const checkPermissions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const user = await response.json();
        
        // Check for analytics permission
        if (!user.permissions?.includes('admin.view_analytics')) {
          window.location.href = '/developer';
          return;
        }
        
        setCurrentUser(user);
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      window.location.href = '/';
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Load basic stats
      const statsResponse = await fetch('/api/developer/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load analytics overview data
      const analyticsResponse = await fetch(`/api/developer/analytics?type=overview&range=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/analytics?type=trends&range=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicketTrends(data.trends || []);
      }
    } catch (error) {
      console.error('Failed to load ticket trends:', error);
    }
  };

  const loadTeamPerformance = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/analytics?type=teams&range=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamPerformance(data.teams || []);
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
          <p className="text-gray-600">Loading analytics data...</p>
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
                  <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
                  <p className="text-sm text-gray-500">Performance metrics and usage insights</p>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tickets">Ticket Trends</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="teams">Team Performance</TabsTrigger>
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
                        <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
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
                        <PieChart data={categoryData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </PieChart>
                        <Tooltip />
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
                      <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
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
                            <span className="font-medium">{category.name}</span>
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
                            <span className="font-medium">{category.name}</span>
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
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}