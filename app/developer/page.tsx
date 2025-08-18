'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCog, 
  Building2, 
  Tag, 
  Settings, 
  Activity, 
  Database,
  ShieldCheck,
  Code,
  BarChart3,
  FileText,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalTickets: number;
  organizationalUnits: number;
  categoryPaths: number;
}

export default function DeveloperDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTeams: 0,
    totalTickets: 0,
    organizationalUnits: 0,
    categoryPaths: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication and admin permissions
    checkAdminAccess();
    loadDashboardStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const user = await response.json();
        // Check if user has any admin permissions
        const adminPermissions = [
          'admin.manage_users', 'admin.view_users',
          'admin.manage_teams', 'admin.view_teams', 
          'admin.manage_organization', 'admin.view_organization',
          'admin.manage_categories', 'admin.view_categories',
          'admin.view_analytics', 'admin.system_settings'
        ];
        
        const hasAdminAccess = adminPermissions.some(perm => 
          user.permissions?.includes(perm)
        );
        
        if (!hasAdminAccess) {
          window.location.href = '/tickets';
          return;
        }
        setCurrentUser(user);
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      window.location.href = '/';
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/developer/stats');
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter navigation items based on user permissions
  const getAccessibleNavigationItems = () => {
    if (!currentUser?.permissions) return [];

    const allItems = [
      {
        id: 'users',
        title: 'User Management',
        description: 'Create, edit, and manage system users',
        icon: Users,
        href: '/developer/users',
        color: 'bg-blue-500',
        stats: `${stats.totalUsers} total, ${stats.activeUsers} active`,
        requiredPermissions: ['admin.manage_users', 'admin.view_users']
      },
      {
        id: 'teams',
        title: 'Team Management',
        description: 'Manage teams and member assignments',
        icon: UserCog,
        href: '/developer/teams',
        color: 'bg-green-500',
        stats: `${stats.totalTeams} teams`,
        requiredPermissions: ['admin.manage_teams', 'admin.view_teams']
      },
      {
        id: 'organization',
        title: 'Organizational Structure',
        description: 'Manage organizational hierarchy',
        icon: Building2,
        href: '/developer/organization',
        color: 'bg-purple-500',
        stats: `${stats.organizationalUnits} units`,
        requiredPermissions: ['admin.manage_organization', 'admin.view_organization']
      },
      {
        id: 'categories',
        title: 'Category Management',
        description: 'Manage ticket categories and paths',
        icon: Tag,
        href: '/developer/categories',
        color: 'bg-orange-500',
        stats: `${stats.categoryPaths} paths`,
        requiredPermissions: ['admin.manage_categories', 'admin.view_categories']
      },
      {
        id: 'analytics',
        title: 'System Analytics',
        description: 'View system metrics and reports',
        icon: BarChart3,
        href: '/developer/analytics',
        color: 'bg-indigo-500',
        stats: `${stats.totalTickets} tickets processed`,
        requiredPermissions: ['admin.view_analytics']
      },
      {
        id: 'settings',
        title: 'System Settings',
        description: 'Configure system-wide settings',
        icon: Settings,
        href: '/developer/settings',
        color: 'bg-gray-500',
        stats: 'Configuration management',
        requiredPermissions: ['admin.system_settings']
      }
    ];

    // Filter items based on user permissions
    return allItems.filter(item => 
      item.requiredPermissions.some(perm => 
        currentUser.permissions.includes(perm)
      )
    );
  };

  const navigationItems = getAccessibleNavigationItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Database className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading Admin Dashboard...</p>
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
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3"
              >
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">Orvale Management System Administration</p>
                </div>
              </motion.div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Admin Access</span>
              </Badge>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.display_name}</p>
                <p className="text-xs text-gray-500">{currentUser?.role_id}</p>
              </div>
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
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCog className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
                  <p className="text-sm text-gray-500">Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.organizationalUnits}</p>
                  <p className="text-sm text-gray-500">Org Units</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTickets}</p>
                  <p className="text-sm text-gray-500">Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Grid */}
        {navigationItems.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {navigationItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (index * 0.1) }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${item.color}`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{item.stats}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = item.href}
                    >
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-8 text-center">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Limited Access</h3>
                <p className="text-gray-500 mb-4">
                  You have admin dashboard access, but your current permissions don't include 
                  access to any management features.
                </p>
                <p className="text-sm text-gray-400">
                  Contact your system administrator to request additional permissions for 
                  user management, team management, or other admin functions.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Admin Activity</span>
                </CardTitle>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View Audit Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Recent activity will appear here once you start making changes.</p>
                <p className="text-sm mt-2">All admin actions are logged for audit purposes.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}