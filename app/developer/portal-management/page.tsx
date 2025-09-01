'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Users, 
  FolderTree, 
  Building2, 
  Settings,
  FileText,
  ArrowLeft,
  Shield,
  Database,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ManagementCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  stats?: {
    label: string;
    value: string | number;
  }[];
  permissions: string[];
}

export default function PortalManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await apiClient.getCurrentUser();
        const userData = result.data?.user || result.data;
        
        if (!userData) {
          router.push('/');
          return;
        }
        
        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const managementCards: ManagementCard[] = [
    {
      id: 'support-teams',
      title: 'Support Team Assignments',
      description: 'Manage which support teams handle specific ticket categories',
      icon: Users,
      href: '/developer/portal-management/support-teams',
      color: 'from-blue-500 to-blue-600',
      stats: [
        { label: 'Active Teams', value: '12' },
        { label: 'Assignments', value: '156' }
      ],
      permissions: ['admin.manage_teams', 'portal.manage_teams']
    },
    {
      id: 'categories',
      title: 'Category Management',
      description: 'Add, edit, or remove ticket categories and subcategories',
      icon: FolderTree,
      href: '/developer/portal-management/categories',
      color: 'from-green-500 to-green-600',
      stats: [
        { label: 'Main Categories', value: '9' },
        { label: 'Total Options', value: '1,247' }
      ],
      permissions: ['admin.manage_categories', 'portal.manage_categories']
    },
    {
      id: 'organization',
      title: 'Organization Structure',
      description: 'Manage DPSS offices and sections used in the public portal',
      icon: Building2,
      href: '/developer/portal-management/organization',
      color: 'from-purple-500 to-purple-600',
      stats: [
        { label: 'Offices', value: '8' },
        { label: 'Sections', value: '89' }
      ],
      permissions: ['admin.manage_organization']
    },
    {
      id: 'settings',
      title: 'Portal Settings',
      description: 'Configure form fields, validation rules, and display options',
      icon: Settings,
      href: '/developer/portal-management/settings',
      color: 'from-orange-500 to-orange-600',
      stats: [
        { label: 'Custom Fields', value: '5' },
        { label: 'Validation Rules', value: '12' }
      ],
      permissions: ['admin.system_settings', 'portal.manage_settings']
    },
    {
      id: 'templates',
      title: 'Response Templates',
      description: 'Manage automated response templates and SLA times',
      icon: FileText,
      href: '/developer/portal-management/templates',
      color: 'from-indigo-500 to-indigo-600',
      stats: [
        { label: 'Templates', value: '47' },
        { label: 'Active SLAs', value: '9' }
      ],
      permissions: ['portal.manage_templates']
    },
    {
      id: 'data-export',
      title: 'Data Management',
      description: 'Export and import configuration data',
      icon: Database,
      href: '/developer/portal-management/data',
      color: 'from-gray-600 to-gray-700',
      stats: [
        { label: 'Last Export', value: 'Never' },
        { label: 'Data Sections', value: '5' }
      ],
      permissions: ['portal.export_data', 'admin.manage_data']
    }
  ];

  const hasPermission = (permissions: string[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.some(permission => 
      user.permissions?.includes(permission)
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onClick={() => setShowUserMenu(false)}
    >
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/developer" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Globe className="h-8 w-8 mr-3 text-blue-600" />
                Public Portal Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage all aspects of the public ticket submission portal
              </p>
            </div>
            
            {/* User Profile Menu */}
            <TooltipProvider>
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(!showUserMenu);
                      }}
                      className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <UserAvatar 
                        user={user}
                        size="lg"
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
                            user={user}
                            size="lg"
                            showOnlineIndicator={true}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user?.display_name}</p>
                            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {user?.role_id}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowProfileModal(true);
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Users className="h-4 w-4" />
                          <span>Edit Profile</span>
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={() => {
                            handleLogout();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TooltipProvider>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementCards.map((card, index) => {
            const isAccessible = hasPermission(card.permissions);
            
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`h-full transition-all ${
                    isAccessible 
                      ? 'hover:shadow-lg cursor-pointer' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => isAccessible && router.push(card.href)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white mr-3`}>
                          <card.icon className="h-6 w-6" />
                        </div>
                        {card.title}
                      </span>
                      {!isAccessible && (
                        <Shield className="h-4 w-4 text-gray-400" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">
                      {card.description}
                    </p>
                    
                    {card.stats && (
                      <div className="grid grid-cols-2 gap-4">
                        {card.stats.map((stat, i) => (
                          <div key={i}>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                            <p className="text-lg font-semibold">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!isAccessible && (
                      <p className="text-xs text-red-600 mt-4">
                        Insufficient permissions
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="mt-8 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm">
                View Change Log
              </Button>
              <Button variant="outline" size="sm">
                Export All Configurations
              </Button>
              <Button variant="outline" size="sm">
                Test Portal Form
              </Button>
              <Button variant="outline" size="sm">
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={user}
        onProfileUpdate={setUser}
      />
    </div>
  );
}