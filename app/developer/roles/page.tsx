'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Shield, 
  ShieldCheck,
  ShieldPlus,
  Edit, 
  Trash2, 
  Search, 
  ArrowLeft,
  Lock,
  Unlock,
  Users,
  FileText,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Key,
  HelpCircle,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  user_count?: number;
}

// Define all available permissions in the system
const AVAILABLE_PERMISSIONS: Permission[] = [
  // Ticket Permissions
  { 
    id: 'ticket.view_own', 
    name: 'View Own Tickets', 
    category: 'Tickets', 
    description: 'View tickets assigned to self\n• See personal workload\n• Track assigned issues\n• Basic permission for IT staff' 
  },
  { 
    id: 'ticket.view_team', 
    name: 'View Team Tickets', 
    category: 'Tickets', 
    description: 'View all team tickets\n• See team workload\n• Monitor priorities\n• For team leads & managers' 
  },
  { 
    id: 'ticket.view_all', 
    name: 'View All Tickets', 
    category: 'Tickets', 
    description: 'View all system tickets\n• System-wide visibility\n• For administrators\n• Senior management access' 
  },
  { 
    id: 'ticket.update_own', 
    name: 'Update Own Tickets', 
    category: 'Tickets', 
    description: 'Modify assigned tickets\n• Update status & details\n• Add resolution notes\n• Essential for IT staff' 
  },
  { 
    id: 'ticket.assign_within_team', 
    name: 'Assign Within Team', 
    category: 'Tickets', 
    description: 'Assign to team members\n• Distribute workload\n• For team leads\n• Within same section only' 
  },
  { 
    id: 'ticket.assign_any', 
    name: 'Assign Any', 
    category: 'Tickets', 
    description: 'Assign to any user\n• Cross-team assignment\n• For administrators\n• Broad oversight required' 
  },
  { 
    id: 'ticket.comment_own', 
    name: 'Comment Own Tickets', 
    category: 'Tickets', 
    description: 'Add comments & notes\n• Document progress\n• Communicate with users\n• Track solutions attempted' 
  },
  { 
    id: 'ticket.escalate', 
    name: 'Escalate Tickets', 
    category: 'Tickets', 
    description: 'Escalate to higher level\n• Move to senior support\n• Critical for workflow\n• When issues can\'t be resolved' 
  },
  { 
    id: 'ticket.delete', 
    name: 'Delete Tickets', 
    category: 'Tickets', 
    description: 'Permanently delete tickets\n• Handle spam/duplicates\n• Data cleanup\n• ⚠️ Destructive action' 
  },
  { 
    id: 'ticket.view_history', 
    name: 'View Ticket History', 
    category: 'Tickets', 
    description: 'View ticket audit trail\n• Track changes & assignments\n• See escalation history\n• Essential for accountability' 
  },
  
  // Queue Permissions
  { 
    id: 'queue.view_own_team', 
    name: 'View Own Team Queue', 
    category: 'Queues', 
    description: 'View team queue\n• See pending work\n• Prioritize tasks\n• Essential for team members' 
  },
  { 
    id: 'queue.view_team', 
    name: 'View Team Queues', 
    category: 'Queues', 
    description: 'View all section queues\n• Cross-team visibility\n• Coordinate work\n• For managers' 
  },
  { 
    id: 'queue.view_all', 
    name: 'View All Queues', 
    category: 'Queues', 
    description: 'View all system queues\n• Organization-wide view\n• For administrators\n• System oversight' 
  },
  { 
    id: 'queue.manage', 
    name: 'Manage Queues', 
    category: 'Queues', 
    description: 'Create & manage queues\n• Set rules & priorities\n• Configure routing\n• Administrator only' 
  },
  
  // Helpdesk Permissions
  { 
    id: 'helpdesk.multi_queue_access', 
    name: 'Helpdesk Multi-Queue Access', 
    category: 'Helpdesk', 
    description: 'Access helpdesk multi-queue interface\n• View escalated tickets from all teams\n• Monitor multiple team queues\n• Configure team visibility settings\n• Essential for helpdesk supervisors & staff' 
  },
  { 
    id: 'helpdesk.view_all_teams', 
    name: 'View All Teams', 
    category: 'Helpdesk', 
    description: 'Read-only access to all team tickets\n• Monitor cross-team workloads\n• Visibility into all queues\n• No assignment permissions\n• For helpdesk analysts' 
  },
  { 
    id: 'helpdesk.assign_cross_team', 
    name: 'Cross-Team Assignment', 
    category: 'Helpdesk', 
    description: 'Assign tickets to any team\n• Cross-team ticket routing\n• Load balancing capability\n• Override normal boundaries\n• ⚠️ Powerful helpdesk permission' 
  },
  { 
    id: 'helpdesk.transfer_tickets', 
    name: 'Transfer Tickets', 
    category: 'Helpdesk', 
    description: 'Transfer tickets between teams\n• Redirect misrouted requests\n• Organizational flexibility\n• Track transfer history\n• For helpdesk coordinators' 
  },
  { 
    id: 'helpdesk.escalate_tickets', 
    name: 'Escalate Tickets', 
    category: 'Helpdesk', 
    description: 'Escalate tickets to management\n• Bypass normal workflows\n• Urgent issue handling\n• Management notification\n• Crisis response capability' 
  },
  { 
    id: 'helpdesk.add_internal_notes', 
    name: 'Add Internal Notes', 
    category: 'Helpdesk', 
    description: 'Add internal-only notes\n• Team communication\n• Hidden from requesters\n• Collaboration tool\n• For all helpdesk staff' 
  },
  { 
    id: 'helpdesk.override_priority', 
    name: 'Override Priority', 
    category: 'Helpdesk', 
    description: 'Change ticket priority\n• Bump urgent issues\n• Adjust based on impact\n• Override initial assessment\n• For supervisors & leads' 
  },
  { 
    id: 'helpdesk.view_team_metrics', 
    name: 'View Team Metrics', 
    category: 'Helpdesk', 
    description: 'Access team performance data\n• Resolution time analytics\n• Workload distribution\n• Quality metrics\n• Management reporting tools' 
  },
  
  // User Permissions
  { 
    id: 'user.view_all', 
    name: 'View All Users', 
    category: 'Users', 
    description: 'View all user accounts\n• See details & roles\n• Check status\n• For administrators' 
  },
  { 
    id: 'user.create', 
    name: 'Create Users', 
    category: 'Users', 
    description: 'Create new accounts\n• Set passwords & roles\n• Assign teams\n• HR & IT administrators' 
  },
  { 
    id: 'user.update', 
    name: 'Update Users', 
    category: 'Users', 
    description: 'Modify user details\n• Update contact info\n• Change assignments\n• Maintain accurate records' 
  },
  { 
    id: 'user.deactivate', 
    name: 'Deactivate Users', 
    category: 'Users', 
    description: 'Deactivate accounts\n• Remove system access\n• Security critical\n• When employees leave' 
  },
  
  // Reporting Permissions
  { 
    id: 'reporting.view_team_metrics', 
    name: 'View Team Metrics', 
    category: 'Reporting', 
    description: 'View team analytics\n• Resolution times\n• Workload distribution\n• Efficiency statistics' 
  },
  { 
    id: 'reporting.view_all', 
    name: 'View All Reports', 
    category: 'Reporting', 
    description: 'Access all reports\n• System-wide analytics\n• Strategic planning\n• Senior management' 
  },
  
  // System Permissions
  { 
    id: 'system.view_basic_info', 
    name: 'View Basic Info', 
    category: 'System', 
    description: 'View system information\n• Version numbers\n• Uptime status\n• General awareness' 
  },
  { 
    id: 'system.manage_settings', 
    name: 'Manage Settings', 
    category: 'System', 
    description: 'Modify system config\n• Email templates\n• Notification rules\n• ⚠️ Critical permission' 
  },
  
  // Admin Permissions
  { 
    id: 'admin.manage_users', 
    name: 'Manage Users', 
    category: 'Administration', 
    description: 'Full user management\n• Create, modify, delete\n• Role assignment\n• ⚠️ Powerful permission' 
  },
  { 
    id: 'admin.view_users', 
    name: 'View Users', 
    category: 'Administration', 
    description: 'Read-only user access\n• View details\n• See assignments\n• No modification rights' 
  },
  { 
    id: 'admin.manage_teams', 
    name: 'Manage Teams', 
    category: 'Administration', 
    description: 'Create & manage teams\n• Set hierarchies\n• Assign members\n• Organizational structure' 
  },
  { 
    id: 'admin.view_teams', 
    name: 'View Teams', 
    category: 'Administration', 
    description: 'Read-only team access\n• View structure\n• See relationships\n• No modifications' 
  },
  { 
    id: 'admin.manage_organization', 
    name: 'Manage Organization', 
    category: 'Administration', 
    description: 'Modify org structure\n• Departments & sections\n• Reporting relationships\n• Critical data management' 
  },
  { 
    id: 'admin.view_organization', 
    name: 'View Organization', 
    category: 'Administration', 
    description: 'View org hierarchy\n• Understand structure\n• See relationships\n• Read-only access' 
  },
  { 
    id: 'admin.manage_categories', 
    name: 'Manage Categories', 
    category: 'Administration', 
    description: 'Manage ticket categories\n• Create & modify types\n• Organize routing\n• Classification system' 
  },
  { 
    id: 'admin.view_categories', 
    name: 'View Categories', 
    category: 'Administration', 
    description: 'View category system\n• See available types\n• Understand structure\n• No modifications' 
  },
  { 
    id: 'admin.view_analytics', 
    name: 'View Analytics', 
    category: 'Administration', 
    description: 'System analytics access\n• Performance dashboards\n• Trend analysis\n• Strategic planning' 
  },
  { 
    id: 'admin.system_settings', 
    name: 'System Settings', 
    category: 'Administration', 
    description: 'Advanced system config\n• Security settings\n• Core behaviors\n• ⚠️ Highest level access' 
  },
  { 
    id: 'admin.maintenance_override', 
    name: 'Maintenance Override', 
    category: 'Administration', 
    description: 'Bypass maintenance mode\n• Access during maintenance\n• Emergency administrative access\n• Override system downtime' 
  },
  
  // Portal Management Permissions
  { 
    id: 'portal.manage_settings', 
    name: 'Manage Portal Settings', 
    category: 'Portal Management', 
    description: 'Configure portal settings\n• Form fields & validation\n• Display options\n• User experience controls' 
  },
  { 
    id: 'portal.view_settings', 
    name: 'View Portal Settings', 
    category: 'Portal Management', 
    description: 'Read portal configuration\n• See current settings\n• Review options\n• No modification rights' 
  },
  { 
    id: 'portal.manage_teams', 
    name: 'Manage Support Teams', 
    category: 'Portal Management', 
    description: 'Manage support teams\n• Create team assignments\n• Route categories to teams\n• Workflow configuration' 
  },
  { 
    id: 'portal.view_teams', 
    name: 'View Support Teams', 
    category: 'Portal Management', 
    description: 'View team assignments\n• See routing rules\n• Check configurations\n• Read-only access' 
  },
  { 
    id: 'portal.manage_categories', 
    name: 'Manage Portal Categories', 
    category: 'Portal Management', 
    description: 'Configure ticket categories\n• Add/edit categories\n• Set up routing\n• Classification management' 
  },
  { 
    id: 'portal.view_categories', 
    name: 'View Portal Categories', 
    category: 'Portal Management', 
    description: 'View category structure\n• See available options\n• Understand routing\n• No modifications' 
  },
  { 
    id: 'portal.manage_templates', 
    name: 'Manage Response Templates', 
    category: 'Portal Management', 
    description: 'Manage email templates\n• Create & edit templates\n• Set trigger conditions\n• Communication management' 
  },
  { 
    id: 'portal.view_templates', 
    name: 'View Response Templates', 
    category: 'Portal Management', 
    description: 'View email templates\n• See template content\n• Check configurations\n• Read-only access' 
  },
  { 
    id: 'portal.export_data', 
    name: 'Export Data', 
    category: 'Portal Management', 
    description: 'Export configuration data\n• Backup settings\n• Data migration\n• System maintenance' 
  },
  
  // Data Management Permissions
  { 
    id: 'admin.manage_data', 
    name: 'Manage Data', 
    category: 'Data Management', 
    description: 'Full data management\n• Import/export operations\n• Database maintenance\n• ⚠️ Critical system access' 
  },
  
  // Role Management Permissions
  { 
    id: 'admin.manage_roles', 
    name: 'Manage Roles', 
    category: 'Role Management', 
    description: 'Create & modify roles\n• Assign permissions\n• Define access levels\n• ⚠️ Security critical' 
  },
  { 
    id: 'admin.view_roles', 
    name: 'View Roles', 
    category: 'Role Management', 
    description: 'View role definitions\n• See permissions\n• Understand hierarchy\n• Read-only access' 
  },
  
  // SLA Management Permissions
  { 
    id: 'admin.manage_sla', 
    name: 'Manage SLA Configurations', 
    category: 'SLA Management', 
    description: 'Configure SLA rules\n• Set response times\n• Define escalation\n• Service level management' 
  },
  { 
    id: 'admin.view_sla', 
    name: 'View SLA Configurations', 
    category: 'SLA Management', 
    description: 'View SLA settings\n• See time limits\n• Check configurations\n• Read-only access' 
  },

  // Tables Management Permissions
  { 
    id: 'tables.view_config', 
    name: 'View Table Configurations', 
    category: 'Tables Management', 
    description: 'View table configurations\n• See table layouts\n• Review saved views\n• Read-only access' 
  },
  { 
    id: 'tables.manage_columns', 
    name: 'Manage Columns', 
    category: 'Tables Management', 
    description: 'Add/remove/reorder columns\n• Configure column properties\n• Set visibility rules\n• Define column types' 
  },
  { 
    id: 'tables.manage_filters', 
    name: 'Manage Filters', 
    category: 'Tables Management', 
    description: 'Configure filters and search\n• Create filter presets\n• Set default filters\n• Build complex queries' 
  },
  { 
    id: 'tables.manage_sorting', 
    name: 'Manage Sorting', 
    category: 'Tables Management', 
    description: 'Set up sorting rules\n• Define default sort order\n• Configure multi-column sorts\n• Priority ordering' 
  },
  { 
    id: 'tables.manage_grouping', 
    name: 'Manage Grouping', 
    category: 'Tables Management', 
    description: 'Configure row grouping\n• Set grouping criteria\n• Define collapse behavior\n• Summary calculations' 
  },
  { 
    id: 'tables.manage_styles', 
    name: 'Manage Styles', 
    category: 'Tables Management', 
    description: 'Customize appearance\n• Color schemes\n• Typography settings\n• Visual themes' 
  },
  { 
    id: 'tables.manage_exports', 
    name: 'Manage Exports', 
    category: 'Tables Management', 
    description: 'Configure export options\n• Set export formats\n• Define export rules\n• Custom templates' 
  },
  { 
    id: 'tables.manage_actions', 
    name: 'Manage Actions', 
    category: 'Tables Management', 
    description: 'Add/remove row actions\n• Configure bulk actions\n• Set action permissions\n• Custom actions' 
  },
  { 
    id: 'tables.create_views', 
    name: 'Create Views', 
    category: 'Tables Management', 
    description: 'Create saved views\n• Personal table configs\n• Custom layouts\n• View templates' 
  },
  { 
    id: 'tables.share_views', 
    name: 'Share Views', 
    category: 'Tables Management', 
    description: 'Share views with others\n• Team configurations\n• Public view access\n• View distribution' 
  },
  { 
    id: 'tables.manage_permissions', 
    name: 'Manage Permissions', 
    category: 'Tables Management', 
    description: 'Set column-level permissions\n• Data access control\n• Field visibility rules\n• Security configuration' 
  },
  { 
    id: 'tables.reset_defaults', 
    name: 'Reset Defaults', 
    category: 'Tables Management', 
    description: 'Reset to system defaults\n• Restore original configs\n• Clear customizations\n• Admin override capability' 
  }
];

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    checkPermissions();
    loadRoles();
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

  const checkPermissions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        if (!user.permissions?.includes('admin.manage_users') && !user.permissions?.includes('admin.system_settings')) {
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

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/roles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const roleData = await response.json();
        // Add system flag to built-in roles
        const rolesWithFlags = roleData.map((role: any) => ({
          ...role,
          is_system: role.is_system === 1
        }));
        setRoles(rolesWithFlags);
      } else {
        showNotification('Failed to load roles', 'error');
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      showNotification('Error loading roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
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

  const handleCreateRole = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: formData.id || formData.name.toLowerCase().replace(/\s+/g, '_'),
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions
        })
      });

      if (response.ok) {
        showNotification('Role created successfully', 'success');
        setShowCreateModal(false);
        setFormData({
          id: '',
          name: '',
          description: '',
          permissions: []
        });
        loadRoles();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to create role', 'error');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification('Error creating role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/developer/roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedRole.id,
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions
        })
      });

      if (response.ok) {
        showNotification('Role updated successfully', 'success');
        setShowEditModal(false);
        setSelectedRole(null);
        loadRoles();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('Error updating role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.is_system) {
      showNotification('Cannot delete system roles', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/developer/roles?id=${selectedRole.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('Role deleted successfully', 'success');
        setShowDeleteModal(false);
        setSelectedRole(null);
        loadRoles();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to delete role', 'error');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('Error deleting role', 'error');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: [...role.permissions]
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'system' && role.is_system) ||
                      (activeTab === 'custom' && !role.is_system);
    
    return matchesSearch && matchesTab;
  });

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Tickets': return FileText;
      case 'Queues': return Users;
      case 'Helpdesk': return AlertTriangle;
      case 'Users': return Users;
      case 'Reporting': return BarChart3;
      case 'System': return Settings;
      case 'Administration': return Shield;
      default: return Key;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading roles...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div 
        className="min-h-screen bg-gray-50"
        onClick={() => setShowUserMenu(false)}
      >
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
                <ShieldCheck className="h-6 w-6 text-red-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
                  <p className="text-sm text-gray-500">{roles.length} roles configured</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2"
              >
                <ShieldPlus className="h-4 w-4" />
                <span>Create Role</span>
              </Button>

              {/* User Profile Menu */}
              {currentUser && (
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <Alert className={`${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {notification.message}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Tabs */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All Roles</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${role.is_system ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {role.is_system ? <Lock className="h-5 w-5 text-blue-600" /> : <Unlock className="h-5 w-5 text-green-600" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <Badge variant={role.is_system ? "secondary" : "default"} className="mt-1">
                          {role.is_system ? 'System Role' : 'Custom Role'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(role)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Permissions:</span>
                      <span className="font-medium">{role.permissions.length}</span>
                    </div>
                    
                    {role.user_count !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Users:</span>
                        <span className="font-medium">{role.user_count}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Key Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm.split('.')[1]}
                        </Badge>
                      ))}
                      {role.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No roles found matching your criteria.</p>
            </CardContent>
          </Card>
        )}

        {/* Permissions Reference */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Available Permissions</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hover over any permission to see detailed information</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(
                AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
                  if (!acc[perm.category]) acc[perm.category] = [];
                  acc[perm.category].push(perm);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([category, permissions]) => {
                const Icon = getCategoryIcon(category);
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{category}</h4>
                    </div>
                    <div className="space-y-1">
                      {permissions.map(perm => (
                        <Tooltip key={perm.id}>
                          <TooltipTrigger asChild>
                            <div className="text-sm p-2 rounded hover:bg-gray-50 cursor-help transition-colors">
                              <p className="font-medium text-gray-700">{perm.name}</p>
                              <p className="text-xs text-gray-500">{perm.id}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-64 p-3"
                            sideOffset={8}
                          >
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-sm">{perm.name}</p>
                                <p className="text-xs opacity-75 font-mono">{perm.id}</p>
                              </div>
                              <div className="text-sm space-y-1">
                                {perm.description.split('\n').map((line, index) => (
                                  <p key={index} className={index === 0 ? "font-medium" : ""}>{line}</p>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Role Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ShieldPlus className="h-5 w-5" />
              <span>Create New Role</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="role_id">Role ID</Label>
              <Input
                id="role_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder="e.g., support_specialist (leave blank to auto-generate)"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier for the role. If left blank, will be auto-generated from the role name.</p>
            </div>
            
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Support Specialist"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the purpose and responsibilities of this role"
                rows={3}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Permissions</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hover over any permission for detailed information</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-gray-500 mb-4">Select the permissions this role should have</p>
              
              <div className="space-y-6">
                {Object.entries(
                  AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
                    if (!acc[perm.category]) acc[perm.category] = [];
                    acc[perm.category].push(perm);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, permissions]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                    <div className="space-y-2">
                      {permissions.map(perm => (
                        <Tooltip key={perm.id}>
                          <TooltipTrigger asChild>
                            <div className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 transition-colors">
                              <Checkbox
                                id={perm.id}
                                checked={formData.permissions.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <div className="flex-1">
                                <Label htmlFor={perm.id} className="font-normal cursor-pointer">
                                  <span className="font-medium">{perm.name}</span>
                                  <span className="text-xs text-gray-400 block">{perm.id}</span>
                                </Label>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-64 p-3"
                            sideOffset={8}
                          >
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-sm">{perm.name}</p>
                                <p className="text-xs opacity-75 font-mono">{perm.id}</p>
                              </div>
                              <div className="text-sm space-y-1">
                                {perm.description.split('\n').map((line, index) => (
                                  <p key={index} className={index === 0 ? "font-medium" : ""}>{line}</p>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRole}
                disabled={saving || !formData.name || formData.permissions.length === 0}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Role'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal - Similar to Create but with pre-filled data */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Role</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRole?.is_system && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This is a system role. You can only modify its permissions.
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="edit_name">Role Name</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={selectedRole?.is_system}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                disabled={selectedRole?.is_system}
                rows={3}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Permissions</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hover over any permission for detailed information</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-gray-500 mb-4">Select the permissions this role should have</p>
              
              <div className="space-y-6">
                {Object.entries(
                  AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
                    if (!acc[perm.category]) acc[perm.category] = [];
                    acc[perm.category].push(perm);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, permissions]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                    <div className="space-y-2">
                      {permissions.map(perm => (
                        <Tooltip key={perm.id}>
                          <TooltipTrigger asChild>
                            <div className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 transition-colors">
                              <Checkbox
                                id={`edit_${perm.id}`}
                                checked={formData.permissions.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`edit_${perm.id}`} className="font-normal cursor-pointer">
                                  <span className="font-medium">{perm.name}</span>
                                  <span className="text-xs text-gray-400 block">{perm.id}</span>
                                </Label>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-64 p-3"
                            sideOffset={8}
                          >
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-sm">{perm.name}</p>
                                <p className="text-xs opacity-75 font-mono">{perm.id}</p>
                              </div>
                              <div className="text-sm space-y-1">
                                {perm.description.split('\n').map((line, index) => (
                                  <p key={index} className={index === 0 ? "font-medium" : ""}>{line}</p>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditRole}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Delete Role</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>Are you sure you want to delete the role "{selectedRole?.name}"?</p>
            
            {selectedRole?.user_count && selectedRole.user_count > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This role is currently assigned to {selectedRole.user_count} user(s). 
                  You will need to reassign these users to a different role.
                </AlertDescription>
              </Alert>
            )}
            
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Role'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={currentUser}
        onProfileUpdate={handleProfileUpdate}
      />
      </div>
    </TooltipProvider>
  );
}