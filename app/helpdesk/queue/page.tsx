'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Material-UI imports for working Select components
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Settings,
  Clock,
  User,
  Tag,
  ChevronRight,
  Filter,
  ArrowLeft,
  LogOut,
  Eye,
  Save,
  Check,
  Building2,
  Monitor,
  CheckCircle,
  FolderOpen,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { formatRegularTime } from '@/lib/time-utils';
import HelpdeskTeamSettings from '@/components/HelpdeskTeamSettings';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { StaffTicketModal } from '@/components/StaffTicketModal';
import CategoryBrowserModal from '@/components/CategoryBrowserModal';
import OrganizationalBrowserModal from '@/components/OrganizationalBrowserModal';
import TicketHistoryComponent from '@/components/TicketHistoryComponent';

interface Ticket {
  id: string;
  submission_id: string;
  user_name: string;
  employee_number: string;
  phone_number: string;
  location: string;
  cubicle_room?: string;
  section: string;
  office?: string;
  bureau?: string;
  division?: string;
  category?: string;
  request_type?: string;
  subcategory?: string;
  sub_subcategory?: string;
  implementation?: string;
  issue_title: string;
  issue_description: string;
  computer_info?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'complete' | 'completed' | 'escalate' | 'escalated' | 'deleted';
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_team?: string;
  assigned_team_name?: string;
  assigned_team_label?: string;
  request_creator_display_name?: string;
  submitted_at: string;
  updated_at: string;
  escalated_at?: string;
  completed_at?: string;
  escalation_reason?: string;
  completion_notes?: string;
  activity_count: number;
}

interface TeamInfo {
  team_id: string;
  team_name: string;
  team_label: string;
  tab_order: number;
  statusCounts: {
    pending: number;
    in_progress: number;
    completed: number;
    escalated: number;
    deleted: number;
  };
  totalTickets: number;
}

interface HelpdeskQueueData {
  success: boolean;
  queueType: 'escalated' | 'team' | 'summary';
  tickets?: Ticket[];
  userTeams?: TeamInfo[];
  escalatedCount?: number;
  teamInfo?: any;
  totalCount?: number;
}

export default function HelpdeskQueue() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  
  // Data state
  const [summaryData, setSummaryData] = useState<HelpdeskQueueData | null>(null);
  const [escalatedTickets, setEscalatedTickets] = useState<Ticket[]>([]);
  const [teamTickets, setTeamTickets] = useState<{[key: string]: {[key: string]: Ticket[]}}>({}); // teamId -> status -> tickets
  
  // UI state
  const [activeMainTab, setActiveMainTab] = useState<string>('escalated');
  const [activeTeamTabs, setActiveTeamTabs] = useState<{[key: string]: string}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStaffTicketModal, setShowStaffTicketModal] = useState(false);
  
  // Ticket modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState('details');
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [originalTicket, setOriginalTicket] = useState<Ticket | null>(null);
  
  // Modal states for browse functionality
  const [showOrgBrowser, setShowOrgBrowser] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  
  // Data for dropdowns
  const [categories, setCategories] = useState<any>({});
  const [requestTypes, setRequestTypes] = useState<any>({});
  const [subcategories, setSubcategories] = useState<any>({});
  const [organizationalData, setOrganizationalData] = useState<any>({});

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSummaryData();
      loadDropdownData();
    }
  }, [currentUser]);

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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        if (!user.permissions?.includes('helpdesk.multi_queue_access')) {
          window.location.href = '/';
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

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/helpdesk/queue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: HelpdeskQueueData = await response.json();
        setSummaryData(data);
        
        // Initialize team tabs to 'pending' status
        if (data.userTeams) {
          const initialTeamTabs: {[key: string]: string} = {};
          data.userTeams.forEach(team => {
            initialTeamTabs[team.team_id] = 'pending';
          });
          setActiveTeamTabs(initialTeamTabs);
        }
        
        // Load escalated tickets if this is the initial load
        if (activeMainTab === 'escalated') {
          loadEscalatedTickets();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load queue data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEscalatedTickets = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/helpdesk/queue?type=escalated', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: HelpdeskQueueData = await response.json();
        setEscalatedTickets(data.tickets || []);
      } else {
        showNotification('Failed to load escalated tickets', 'error');
      }
    } catch (err: any) {
      showNotification('Error loading escalated tickets', 'error');
    }
  };

  const loadTeamTickets = async (teamId: string, status: string = 'all') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/helpdesk/queue?type=team&teamId=${teamId}&status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: HelpdeskQueueData = await response.json();
        setTeamTickets(prev => ({
          ...prev,
          [teamId]: {
            ...prev[teamId],
            [status]: data.tickets || []
          }
        }));
      } else {
        showNotification('Failed to load team tickets', 'error');
      }
    } catch (err: any) {
      showNotification('Error loading team tickets', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMainTabChange = (value: string) => {
    setActiveMainTab(value);
    
    if (value === 'escalated') {
      loadEscalatedTickets();
    } else {
      // Load pending tickets for the selected team
      const teamStatus = activeTeamTabs[value] || 'pending';
      loadTeamTickets(value, teamStatus);
    }
  };

  const handleTeamTabChange = (teamId: string, status: string) => {
    setActiveTeamTabs(prev => ({
      ...prev,
      [teamId]: status
    }));
    loadTeamTickets(teamId, status);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSummaryData();
    
    if (activeMainTab === 'escalated') {
      await loadEscalatedTickets();
    } else {
      const teamStatus = activeTeamTabs[activeMainTab] || 'pending';
      await loadTeamTickets(activeMainTab, teamStatus);
    }
    setRefreshing(false);
  };

  const handleSettingsSaved = () => {
    // Refresh data when settings are saved
    loadSummaryData();
    showNotification('Team settings updated successfully', 'success');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Ticket modal helper functions
  const canAssignCrossTeam = () => {
    return currentUser?.permissions?.includes('helpdesk.assign_cross_team');
  };

  const isTicketEditable = (ticket: Ticket | null) => {
    if (!ticket) return false;
    return ticket.status !== 'completed';
  };

  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setOriginalTicket({...ticket});
    setSaveStatus('idle');
    setModalActiveTab('details');
    loadAssignableUsers();
    loadAvailableTeams();
  };

  const loadAssignableUsers = async () => {
    setLoadingAssignableUsers(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users/assignable', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading assignable users:', error);
    } finally {
      setLoadingAssignableUsers(false);
    }
  };

  const loadAvailableTeams = async () => {
    if (!canAssignCrossTeam()) return;
    setLoadingTeams(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/helpdesk/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableTeams(data.data?.all_teams || []);
      }
    } catch (error) {
      console.error('Error loading available teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const [categoriesRes, orgRes] = await Promise.all([
        fetch('/api/ticket-data/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/ticket-data/organization', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        setCategories(catData.categories || {});
        setRequestTypes(catData.requestTypes || {});
        setSubcategories(catData.subcategories || {});
      }
      
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganizationalData(orgData || {});
      }
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const updateTicketField = (field: string, value: string) => {
    if (selectedTicket && isTicketEditable(selectedTicket)) {
      if (field === 'assigned_team' && value !== selectedTicket.assigned_team) {
        setSelectedTicket(prev => prev ? {
          ...prev,
          assigned_team: value,
          assigned_to: ''
        } : null);
        setTimeout(() => loadAssignableUsers(), 100);
        showNotification('Team changed - assigned user cleared', 'success');
        return;
      }
      
      // Clear dependent fields when parent category changes
      if (field === 'category') {
        setSelectedTicket(prev => prev ? {
          ...prev,
          category: value,
          request_type: '',
          subcategory: ''
        } : null);
        return;
      }
      
      if (field === 'request_type') {
        setSelectedTicket(prev => prev ? {
          ...prev,
          request_type: value,
          subcategory: ''
        } : null);
        return;
      }
      
      setSelectedTicket(prev => prev ? { ...prev, [field]: value } : null);
    }
  };
  
  const hasChanges = () => {
    if (!selectedTicket || !originalTicket) return false;
    return JSON.stringify(selectedTicket) !== JSON.stringify(originalTicket);
  };
  
  const saveTicketChanges = async () => {
    if (!selectedTicket || !hasChanges()) return;
    
    setSaveStatus('saving');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(selectedTicket)
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        setOriginalTicket({...selectedTicket});
        showNotification('Ticket updated successfully', 'success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save ticket');
      }
    } catch (error) {
      setSaveStatus('idle');
      showNotification('Failed to save changes', 'error');
    }
  };
  
  const cyclePriority = () => {
    if (!selectedTicket || !isTicketEditable(selectedTicket)) return;
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(selectedTicket.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    updateTicketField('priority', priorities[nextIndex]);
  };
  
  const cycleStatus = () => {
    if (!selectedTicket || !isTicketEditable(selectedTicket)) return;
    const statuses = ['pending', 'in_progress', 'escalated'];
    const currentIndex = statuses.indexOf(selectedTicket.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    updateTicketField('status', statuses[nextIndex]);
  };
  
  const openOrgBrowser = () => setShowOrgBrowser(true);
  const openCategoryBrowser = () => setShowCategoryBrowser(true);
  
  const handleTabChange = (value: string) => {
    setModalActiveTab(value);
  };

  const formatDate = (dateString: string) => {
    return formatRegularTime(dateString);
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const formatPriority = (priority: string) => {
    return priority.toUpperCase();
  };

  const filterTickets = (tickets: Ticket[]) => {
    return tickets.filter(ticket => 
      ticket.issue_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.submission_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.request_creator_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Search across all teams and all statuses
  const searchAllTickets = () => {
    if (!searchTerm.trim()) return [];
    
    const allTickets: Ticket[] = [];
    
    // Add escalated tickets
    allTickets.push(...escalatedTickets);
    
    // Add all team tickets from all statuses
    Object.values(teamTickets).forEach(teamData => {
      Object.values(teamData).forEach(statusTickets => {
        allTickets.push(...statusTickets);
      });
    });
    
    return filterTickets(allTickets);
  };

  // Get total count of all tickets across all teams
  const getTotalTicketCount = () => {
    let total = escalatedTickets.length;
    
    Object.values(teamTickets).forEach(teamData => {
      Object.values(teamData).forEach(statusTickets => {
        total += statusTickets.length;
      });
    });
    
    return total;
  };

  const TicketCard = ({ ticket, showTeamInfo = false }: { ticket: Ticket; showTeamInfo?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
      onClick={() => openTicketModal(ticket)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-blue-600">#{ticket.submission_id}</span>
            <Badge className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
            {ticket.activity_count > 0 && (
              <Badge variant="outline" className="text-xs">
                {ticket.activity_count} updates
              </Badge>
            )}
            {showTeamInfo && ticket.assigned_team_name && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Building2 className="h-3 w-3 mr-1" />
                {ticket.assigned_team_name}
              </Badge>
            )}
          </div>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
            {ticket.issue_title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {ticket.issue_description}
          </p>
        </div>
        <div className="ml-4" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            onClick={() => openTicketModal(ticket)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{ticket.request_creator_display_name || ticket.user_name}</span>
          </div>
          {ticket.assigned_to_name && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>{ticket.assigned_to_name}</span>
            </div>
          )}
          {ticket.assigned_team_label && (
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Team:</span>
              <span>{ticket.assigned_team_label}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatRegularTime(ticket.submitted_at, { dateFormat: 'short' })}</span>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading helpdesk queue...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Determine which tickets to show
  const currentTickets = activeMainTab === 'escalated' 
    ? escalatedTickets 
    : teamTickets[activeMainTab]?.[activeTeamTabs[activeMainTab] || 'pending'] || [];

  // If searching, show results from all teams, otherwise show current tab
  const displayTickets = searchTerm.trim() 
    ? searchAllTickets() 
    : currentTickets;
    
  const filteredTickets = searchTerm.trim() 
    ? displayTickets 
    : filterTickets(currentTickets);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Portal</span>
              </Button>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Helpdesk Queue</h1>
                  <p className="text-sm text-gray-500">Multi-team ticket management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Create Ticket Button - only show if user has staff ticket creation permissions */}
              {currentUser?.permissions?.includes('ticket.create_for_users') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowStaffTicketModal(true)}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Ticket</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create ticket for user or internal issue</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Button 
                variant="outline"
                onClick={() => window.location.href = '/tickets'}
                className="flex items-center space-x-2"
              >
                <Clock className="h-4 w-4" />
                <span>Ticket Queue</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              {/* User Profile Menu */}
              <TooltipProvider>
                <div className="relative user-menu-container">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
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
                                {currentUser?.role_id || 'Helpdesk'}
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
                            setShowUserMenu(false);
                            setShowSettings(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150"
                        >
                          <div className="w-5 h-5 flex items-center justify-center">
                            <Settings className="h-4 w-4" />
                          </div>
                          <span className="font-medium">Team Settings</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Queue Navigation */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <Tabs value={activeMainTab} onValueChange={handleMainTabChange}>
              <div className="flex items-center justify-between mb-4">
                <TabsList className="h-12 overflow-x-auto min-w-0 flex-1 justify-start scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors">
                  {/* ESCALATED Tab */}
                  <TabsTrigger 
                    value="escalated" 
                    className="flex items-center space-x-2 px-4 data-[state=active]:bg-red-100 data-[state=active]:text-red-800 whitespace-nowrap min-w-fit flex-shrink-0"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>ESCALATED</span>
                    {summaryData?.escalatedCount && summaryData.escalatedCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-2">
                        {summaryData.escalatedCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  {/* Team Tabs */}
                  {summaryData?.userTeams?.map((team) => (
                    <TabsTrigger 
                      key={team.team_id}
                      value={team.team_id}
                      className="flex items-center space-x-2 px-4 whitespace-nowrap min-w-fit flex-shrink-0"
                    >
                      <span>{team.team_label}</span>
                      {team.totalTickets > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {team.totalTickets}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {/* Search */}
                <div className="relative ml-4 w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* ESCALATED Tab Content */}
              <TabsContent value="escalated" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      {searchTerm.trim() ? 'Search Results' : 'Escalated Tickets'}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {searchTerm.trim() 
                        ? `${filteredTickets.length} of ${getTotalTicketCount()} tickets (all teams)`
                        : `${filteredTickets.length} of ${escalatedTickets.length} tickets`
                      }
                    </span>
                  </div>
                  
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{searchTerm.trim() ? `No tickets found matching "${searchTerm}"` : 'No escalated tickets found.'}</p>
                      {searchTerm.trim() && (
                        <p className="text-xs mt-2">Search includes all teams and statuses</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} showTeamInfo={!!searchTerm.trim()} />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Team Tab Contents */}
              {summaryData?.userTeams?.map((team) => (
                <TabsContent key={team.team_id} value={team.team_id} className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">{team.team_label} Queue</h3>
                      <span className="text-sm text-gray-500">
                        {filteredTickets.length} tickets
                      </span>
                    </div>
                    
                    {/* Team Status Tabs */}
                    <Tabs 
                      value={activeTeamTabs[team.team_id] || 'pending'} 
                      onValueChange={(value) => handleTeamTabChange(team.team_id, value)}
                    >
                      <TabsList className="h-12 w-full justify-start rounded-none border-b bg-transparent overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors">
                        <TabsTrigger 
                          value="pending" 
                          className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-t-lg whitespace-nowrap min-w-fit flex-shrink-0"
                        >
                          Pending ({team.statusCounts.pending})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="in_progress" 
                          className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-t-lg whitespace-nowrap min-w-fit flex-shrink-0"
                        >
                          In Progress ({team.statusCounts.in_progress})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="completed" 
                          className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-t-lg whitespace-nowrap min-w-fit flex-shrink-0"
                        >
                          Completed ({team.statusCounts.completed})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="escalated" 
                          className="data-[state=active]:bg-red-500 data-[state=active]:text-white rounded-t-lg whitespace-nowrap min-w-fit flex-shrink-0"
                        >
                          Escalated ({team.statusCounts.escalated})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="deleted" 
                          className="data-[state=active]:bg-gray-500 data-[state=active]:text-white rounded-t-lg whitespace-nowrap min-w-fit flex-shrink-0"
                        >
                          Deleted ({team.statusCounts.deleted})
                        </TabsTrigger>
                      </TabsList>

                      {['pending', 'in_progress', 'completed', 'escalated', 'deleted'].map((status) => (
                        <TabsContent key={status} value={status} className="mt-4">
                          {filteredTickets.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No {status.replace('_', ' ')} tickets found.</p>
                            </div>
                          ) : (
                            <div className="grid gap-4">
                              {filteredTickets.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} showTeamInfo={!!searchTerm.trim()} />
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Team Settings Modal */}
      <HelpdeskTeamSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={handleSettingsSaved}
      />
      
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

      {/* Staff Ticket Creation Modal */}
      {currentUser && (
        <StaffTicketModal
          open={showStaffTicketModal}
          onOpenChange={setShowStaffTicketModal}
          onSubmit={async (ticketData) => {
            // After successful ticket creation, refresh the tickets
            await handleRefresh();
            showNotification('Ticket created successfully', 'success');
          }}
        />
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedTicket(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] min-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selectedTicket.issue_title}</h2>
                {selectedTicket.status === 'completed' && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      This ticket has been completed and is now read-only
                    </span>
                  </div>
                )}
                {canAssignCrossTeam() && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-800 font-medium">
                      Helpdesk Mode - Cross-team assignment available
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <AnimatePresence mode="wait">
                  {hasChanges() && isTicketEditable(selectedTicket) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button 
                        onClick={saveTicketChanges} 
                        disabled={saveStatus === 'saving'}
                        className={`transition-all duration-300 ${
                          saveStatus === 'saved' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : saveStatus === 'saving'
                            ? 'bg-blue-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                      >
                        <motion.div 
                          className="flex items-center gap-2"
                          initial={false}
                          animate={{ 
                            scale: saveStatus === 'saving' ? [1, 1.05, 1] : 1,
                          }}
                          transition={{ 
                            repeat: saveStatus === 'saving' ? Infinity : 0,
                            duration: 0.6 
                          }}
                        >
                          {saveStatus === 'saved' ? (
                            <>
                              <Check className="h-4 w-4" />
                              Saved!
                            </>
                          ) : saveStatus === 'saving' ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </motion.div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </motion.div>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  ✕ Close
                </Button>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <Tabs value={modalActiveTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2" onClick={(e) => e.stopPropagation()}>
                <TabsTrigger 
                  value="details" 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  Ticket Details
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Clock className="h-4 w-4" />
                  History & Audit Trail
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">Request Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> 
                    <Badge 
                      className={`${getStatusColor(selectedTicket.status)} ${!isTicketEditable(selectedTicket) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'} ml-2`}
                      onClick={() => isTicketEditable(selectedTicket) && cycleStatus()}
                      title={!isTicketEditable(selectedTicket) ? 'Completed tickets cannot be modified' : 'Click to cycle status'}
                    >
                      {formatStatus(selectedTicket.status)}
                    </Badge>
                  </div>
                  <div><strong>Priority:</strong> 
                    <Badge 
                      className={`${getPriorityColor(selectedTicket.priority)} ${!isTicketEditable(selectedTicket) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'} ml-2`}
                      onClick={() => isTicketEditable(selectedTicket) && cyclePriority()}
                      title={!isTicketEditable(selectedTicket) ? 'Completed tickets cannot be modified' : 'Click to cycle priority'}
                    >
                      {formatPriority(selectedTicket.priority)}
                    </Badge>
                  </div>
                  <div><strong>Submitted:</strong> {formatDate(selectedTicket.submitted_at)}</div>
                  <div><strong>Ticket ID:</strong> {selectedTicket.submission_id}</div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To:</label>
                    <FormControl size="small" className="w-full">
                      <InputLabel id="assigned-to-label">Select Assignee</InputLabel>
                      <Select
                        labelId="assigned-to-label"
                        id="assigned-to-select"
                        value={selectedTicket.assigned_to || ''}
                        label="Select Assignee"
                        onChange={(e) => updateTicketField('assigned_to', e.target.value)}
                        disabled={loadingAssignableUsers || !isTicketEditable(selectedTicket)}
                      >
                        <MenuItem value="">
                          <em>Unassigned</em>
                        </MenuItem>
                        {assignableUsers.map((user) => (
                          <MenuItem key={user.username} value={user.username}>
                            {user.display_label || `${user.display_name} (${user.username})`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                  
                  {/* Team Assignment - Only for helpdesk users */}
                  {canAssignCrossTeam() && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assigned Team:
                        <Badge variant="outline" className="ml-2 text-xs">
                          Helpdesk
                        </Badge>
                      </label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="assigned-team-label">Select Team</InputLabel>
                        <Select
                          labelId="assigned-team-label"
                          id="assigned-team-select"
                          value={selectedTicket.assigned_team || ''}
                          label="Select Team"
                          onChange={(e) => updateTicketField('assigned_team', e.target.value)}
                          disabled={loadingTeams || !isTicketEditable(selectedTicket)}
                        >
                          <MenuItem value="">
                            <em>Unassigned</em>
                          </MenuItem>
                          {availableTeams.map((team) => (
                            <MenuItem key={team.id} value={team.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{team.name}</span>
                                <span className="text-xs text-gray-500">
                                  {team.section_name} • {team.active_tickets} active tickets
                                  {team.team_lead_name && ` • Lead: ${team.team_lead_name}`}
                                </span>
                              </div>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedTicket.user_name}</div>
                  <div><strong>Employee #:</strong> {selectedTicket.employee_number}</div>
                  <div><strong>Phone:</strong> {selectedTicket.phone_number}</div>
                  {selectedTicket.cubicle_room && (
                    <div><strong>Cubicle/Room:</strong> {selectedTicket.cubicle_room}</div>
                  )}
                  {selectedTicket.request_creator_display_name && (
                    <div><strong>Request Creator:</strong> {selectedTicket.request_creator_display_name}</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Organizational Information Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organizational Information
                </h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={openOrgBrowser} 
                  className="flex items-center gap-2"
                  disabled={selectedTicket.status === 'completed'}
                >
                  <Search className="h-4 w-4" />
                  Browse Organizational Paths
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Office:</label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="office-select-label">Select Office</InputLabel>
                        <Select
                          labelId="office-select-label"
                          id="office-select"
                          value={selectedTicket.office || ''}
                          label="Select Office"
                          onChange={(e) => updateTicketField('office', e.target.value)}
                          disabled={!isTicketEditable(selectedTicket)}
                        >
                          {organizationalData.offices?.map((office: string, index: number) => (
                            <MenuItem key={`office-${index}`} value={office}>
                              {office}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bureau:</label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="bureau-select-label">Select Bureau</InputLabel>
                        <Select
                          labelId="bureau-select-label"
                          id="bureau-select"
                          value={selectedTicket.bureau || ''}
                          label="Select Bureau"
                          onChange={(e) => updateTicketField('bureau', e.target.value)}
                          disabled={!isTicketEditable(selectedTicket)}
                        >
                          {organizationalData.bureaus?.map((bureau: string, index: number) => (
                            <MenuItem key={`bureau-${index}`} value={bureau}>
                              {bureau}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Division:</label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="division-select-label">Select Division</InputLabel>
                        <Select
                          labelId="division-select-label"
                          id="division-select"
                          value={selectedTicket.division || ''}
                          label="Select Division"
                          onChange={(e) => updateTicketField('division', e.target.value)}
                          disabled={!isTicketEditable(selectedTicket)}
                        >
                          {organizationalData.divisions?.map((division: string, index: number) => (
                            <MenuItem key={`division-${index}`} value={division}>
                              {division}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section:</label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="section-select-label">Select Section</InputLabel>
                        <Select
                          labelId="section-select-label"
                          id="section-select"
                          value={selectedTicket.section || ''}
                          label="Select Section"
                          onChange={(e) => updateTicketField('section', e.target.value)}
                          disabled={!isTicketEditable(selectedTicket)}
                        >
                          {organizationalData?.sections?.map((section: string, index: number) => (
                            <MenuItem key={`section-${index}`} value={section}>
                              {section}
                            </MenuItem>
                          )) || []}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Information Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Category Information
                </h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={openCategoryBrowser} 
                  className="flex items-center gap-2"
                  disabled={selectedTicket.status === 'completed'}
                >
                  <FolderOpen className="h-4 w-4" />
                  Browse Category Paths
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="category-select-label">Select Category</InputLabel>
                        <Select
                          labelId="category-select-label"
                          id="category-select"
                          value={selectedTicket.category || ''}
                          label="Select Category"
                          onChange={(e) => updateTicketField('category', e.target.value)}
                          disabled={!isTicketEditable(selectedTicket)}
                        >
                          {Object.entries(categories || {}).map(([key, value]) => (
                            <MenuItem key={key} value={key}>
                              {String(value)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Request Type:</label>
                      <FormControl size="small" className="w-full" disabled={!selectedTicket.category}>
                        <InputLabel id="request-type-select-label">Select Request Type</InputLabel>
                        <Select
                          labelId="request-type-select-label"
                          id="request-type-select"
                          value={selectedTicket.request_type || ''}
                          label="Select Request Type"
                          onChange={(e) => updateTicketField('request_type', e.target.value)}
                          disabled={!selectedTicket.category || !isTicketEditable(selectedTicket)}
                        >
                          {selectedTicket.category && requestTypes[selectedTicket.category]?.map((type: any) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.text}
                            </MenuItem>
                          )) || []}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory:</label>
                      <FormControl size="small" className="w-full" disabled={!selectedTicket.request_type}>
                        <InputLabel id="subcategory-select-label">Select Subcategory</InputLabel>
                        <Select
                          labelId="subcategory-select-label"
                          id="subcategory-select"
                          value={selectedTicket.subcategory || ''}
                          label="Select Subcategory"
                          onChange={(e) => updateTicketField('subcategory', e.target.value)}
                          disabled={!selectedTicket.request_type || !isTicketEditable(selectedTicket)}
                        >
                          {selectedTicket.category && selectedTicket.request_type && 
                           subcategories[selectedTicket.category]?.[selectedTicket.request_type]?.map((subcat: any) => (
                            <MenuItem key={subcat.value} value={subcat.value}>
                              {subcat.text}
                            </MenuItem>
                          )) || []}
                        </Select>
                      </FormControl>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Implementation:</label>
                      <FormControl size="small" className="w-full">
                        <InputLabel id="implementation-select-label">Select Implementation</InputLabel>
                        <Select
                          labelId="implementation-select-label"
                          id="implementation-select"
                          value={selectedTicket.implementation || ''}
                          label="Select Implementation"
                          onChange={(e) => updateTicketField('implementation', e.target.value)}
                          disabled={!isTicketEditable(selectedTicket)}
                        >
                          <MenuItem value="immediate">Immediate</MenuItem>
                          <MenuItem value="scheduled">Scheduled</MenuItem>
                          <MenuItem value="planned">Planned</MenuItem>
                          <MenuItem value="future">Future</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
              </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-semibold text-blue-600 mb-2">Issue Details</h3>
                  <div className="bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                    {selectedTicket.issue_description}
                  </div>
                </div>
                
                {/* System Information Section */}
                {selectedTicket.computer_info && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      System Information
                    </h3>
                    <div className="bg-gray-50 p-4 rounded border-l-4 border-green-500">
                      <div className="space-y-2 text-sm">
                        {(() => {
                          try {
                            const computerInfo = JSON.parse(selectedTicket.computer_info);
                            return (
                              <>
                                {computerInfo.ip && <div><strong>IP Address:</strong> {computerInfo.ip}</div>}
                                {computerInfo.domain && <div><strong>Domain:</strong> {computerInfo.domain}</div>}
                                {computerInfo.browser && <div><strong>Browser:</strong> {computerInfo.browser}</div>}
                                {computerInfo.platform && <div><strong>Platform:</strong> {computerInfo.platform}</div>}
                                {computerInfo.timestamp && <div><strong>Captured:</strong> {new Date(computerInfo.timestamp).toLocaleString()}</div>}
                              </>
                            );
                          } catch (error) {
                            return <div>System information unavailable</div>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4" onClick={(e) => e.stopPropagation()}>
                <TicketHistoryComponent 
                  ticketId={selectedTicket.id} 
                  isVisible={modalActiveTab === 'history'}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Browse Modals */}
      <CategoryBrowserModal
        isOpen={showCategoryBrowser}
        onClose={() => setShowCategoryBrowser(false)}
        categoriesData={{ categories, requestTypes, subcategories }}
        onSelect={(selection) => {
          if (selectedTicket && isTicketEditable(selectedTicket)) {
            updateTicketField('category', selection.category || '');
            if (selection.requestType) updateTicketField('request_type', selection.requestType);
            if (selection.subcategory) updateTicketField('subcategory', selection.subcategory);
          }
        }}
      />

      <OrganizationalBrowserModal
        isOpen={showOrgBrowser}
        onClose={() => setShowOrgBrowser(false)}
        organizationalData={organizationalData}
        onSelect={(selection) => {
          if (selectedTicket && isTicketEditable(selectedTicket)) {
            if (selection.office) updateTicketField('office', selection.office);
            if (selection.bureau) updateTicketField('bureau', selection.bureau);
            if (selection.division) updateTicketField('division', selection.division);
            if (selection.section) updateTicketField('section', selection.section);
          }
        }}
      />
    </div>
  );
}