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
  Search,
  LogOut,
  Ticket,
  ArrowLeft,
  User,
  Globe,
  Table,
  MessageCircle,
  Trophy,
  Award
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Check authentication and admin permissions
    checkAdminAccess();
    loadDashboardStats();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔍 Admin dashboard - checking permissions, token exists:', !!token);
      
      if (!token) {
        console.log('❌ No token found, redirecting to home');
        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Admin dashboard - auth response status:', response.status);

      if (response.ok) {
        const user = await response.json();
        console.log('🔍 Admin dashboard - user loaded:', user.display_name, 'Role:', user.role);
        console.log('🔍 Admin dashboard - permissions:', user.permissions);
        
        // Check if user has any admin permissions
        const adminPermissions = [
          'admin.manage_users', 'admin.view_users',
          'admin.manage_teams', 'admin.view_teams', 
          'admin.manage_organization', 'admin.view_organization',
          'admin.manage_categories', 'admin.view_categories',
          'admin.manage_support_teams', 'admin.view_support_teams',
          'admin.view_analytics', 'admin.system_settings'
        ];
        
        const hasAdminAccess = adminPermissions.some(perm => 
          user.permissions?.includes(perm)
        );
        
        console.log('🔍 Admin dashboard - has admin access:', hasAdminAccess);
        
        if (!hasAdminAccess) {
          console.log('❌ User lacks admin permissions, redirecting to tickets');
          window.location.href = '/tickets';
          return;
        }
        
        console.log('✅ Admin access granted');
        setCurrentUser(user);
      } else {
        console.log('❌ Auth failed, redirecting to login');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      window.location.href = '/';
    }
  };

  const loadDashboardStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      } else {
        console.error('Failed to load stats, status:', response.status);
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
        id: 'portal_management',
        title: 'Public Portal Management',
        description: 'Configure public portal settings and features',
        icon: Globe,
        href: '/developer/portal-management',
        color: 'bg-cyan-500',
        stats: 'Portal configuration',
        requiredPermissions: ['admin.manage_categories', 'admin.manage_organization', 'portal.manage_settings']
      },
      {
        id: 'analytics',
        title: 'Service Analytics',
        description: 'View service delivery performance and metrics',
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
      },
      {
        id: 'chat_management',
        title: 'Chat Management System',
        description: 'Configure chat system, widget, and user management',
        icon: MessageCircle,
        href: '/admin/chat-management',
        color: 'bg-emerald-500',
        stats: 'Chat system administration',
        requiredPermissions: ['chat.manage_system', 'admin.system_settings']
      },
      {
        id: 'public_portal_admin',
        title: 'Public Portal Live Chat',
        description: 'Configure public portal live chat widget and settings',
        icon: Globe,
        href: '/admin/public-portal',
        color: 'bg-rose-500',
        stats: 'Public chat administration',
        requiredPermissions: ['admin.system_settings', 'portal.manage_settings']
      },
      {
        id: 'rbac',
        title: 'Role Management',
        description: 'Manage roles and permissions',
        icon: ShieldCheck,
        href: '/developer/roles',
        color: 'bg-red-500',
        stats: '3 system roles',
        requiredPermissions: ['admin.manage_users', 'admin.system_settings']
      },
      {
        id: 'login_modal_comparison',
        title: 'Login Modal Comparison',
        description: 'Compare UI library login implementations',
        icon: Code,
        href: '/developer/login-modal-comparison',
        color: 'bg-amber-500',
        stats: 'UI Component Testing',
        requiredPermissions: ['admin.system_settings']
      },
      {
        id: 'tables_management',
        title: 'Tables Management',
        description: 'Visual tables and datagrid configuration system',
        icon: Table,
        href: '/admin/tables-management',
        color: 'bg-teal-500',
        stats: 'Configure data displays',
        requiredPermissions: ['tables.view_config', 'admin.system_settings']
      },
      {
        id: 'achievements',
        title: 'Achievements & Badges',
        description: 'Manage gamification system, achievements, and user badges',
        icon: Trophy,
        href: '/admin/achievements',
        color: 'bg-yellow-500',
        stats: 'Gamification system',
        requiredPermissions: ['admin.manage_users', 'admin.system_settings']
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

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  // Return to ticket queue
  const handleReturnToTickets = () => {
    window.location.href = '/tickets';
  };

  // Handle profile update
  const handleProfileUpdate = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    // Also update localStorage
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      const userData = JSON.parse(currentUserData);
      localStorage.setItem('currentUser', JSON.stringify({ ...userData, ...updatedUser }));
    }
  };

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
              {/* Ticket Queue Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReturnToTickets}
                className="flex items-center space-x-2"
              >
                <Ticket className="h-4 w-4" />
                <span>Ticket Queue</span>
              </Button>

              {/* User Menu with Enhanced UI */}
              <TooltipProvider>
                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <UserAvatar 
                          user={currentUser}
                          size="lg"
                          showOnlineIndicator={true}
                          className="border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>User Menu</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Enhanced User Dropdown Menu */}
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
                            onClick={handleLogout}
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
                  You have admin dashboard access, but your current permissions don&apos;t include 
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

      {/* Profile Edit Modal */}
      {currentUser && (
        <ProfileEditModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          user={currentUser}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}