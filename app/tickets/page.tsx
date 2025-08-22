'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
// Material-UI imports for working Select components
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, User, Clock, AlertTriangle, Trash2, ArrowUp, Search, Eye, FolderOpen, Building2, Tag, Check, Save, Settings, LogOut, CheckCircle, Monitor, Plus, Paperclip, FileText, Download, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
// Removed static imports - will load dynamically from database APIs
import CategoryBrowserModal from '../../components/CategoryBrowserModal';
import OrganizationalBrowserModal from '../../components/OrganizationalBrowserModal';
import { formatRegularTime } from '@/lib/time-utils';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { StaffTicketModal } from '@/components/StaffTicketModal';
import TicketHistoryComponent from '../../components/TicketHistoryComponent';

interface TicketAttachment {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface Ticket {
  id: string;
  submission_id: string;
  user_name: string;
  employee_number: string;
  phone_number: string;
  location: string;
  cubicle_room?: string;
  section: string;
  request_creator_display_name?: string;
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
  assigned_team?: string;
  submitted_at: string;
  updated_at: string;
  escalated_at?: string;
  completed_at?: string;
  escalation_reason?: string;
  completion_notes?: string;
}

interface QueueStats {
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  escalated: number;
  deleted: number;
  today: number;
  total: number;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    escalated: 0,
    deleted: 0,
    today: 0,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState({
    queue: 'my_tickets',
    priority: 'all',
    sort: 'newest_first'
  });

  // Modal states for browse functionality
  const [showOrgBrowser, setShowOrgBrowser] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('details'); // 'details' or 'history'

  // Notification state
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  // Save button state
  const [originalTicket, setOriginalTicket] = useState<Ticket | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Dynamic data from database
  const [organizationalData, setOrganizationalData] = useState<any>(null);
  const [categories, setCategories] = useState<any>({});
  const [requestTypes, setRequestTypes] = useState<any>({});
  const [subcategories, setSubcategories] = useState<any>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStaffTicketModal, setShowStaffTicketModal] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // Attachments state
  const [ticketAttachments, setTicketAttachments] = useState<TicketAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Show notification helper
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  // Check if current user can edit a completed ticket
  const canEditCompletedTicket = () => {
    return currentUser?.permissions?.includes('ticket.edit_completed');
  };

  // Check if current user can override ticket assignments
  const canOverrideAssignment = () => {
    return currentUser?.permissions?.includes('ticket.override_assignment');
  };

  // Check if current user can assign tickets to different teams
  const canAssignCrossTeam = () => {
    return currentUser?.permissions?.includes('helpdesk.assign_cross_team');
  };

  // Check if ticket is editable based on status, assignment, and permissions
  const isTicketEditable = (ticket: Ticket | null) => {
    if (!ticket) return false;
    
    // Completed tickets require special permission
    if (ticket.status === 'completed') {
      return canEditCompletedTicket();
    }
    
    // Escalated tickets require manage_escalated permission
    if (ticket.status === 'escalated') {
      return currentUser?.permissions?.includes('ticket.manage_escalated');
    }
    
    // Check assignment ownership
    if (ticket.assigned_to) {
      // If assigned to someone else, check for override permission
      if (ticket.assigned_to !== currentUser?.username) {
        return canOverrideAssignment();
      }
      // If assigned to current user, they can edit
      return true;
    }
    
    // Unassigned tickets are editable by anyone (will auto-assign on first edit)
    return true;
  };

  // Load dynamic data from database APIs
  const loadTicketData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Load organizational data and categories in parallel
      const [orgResponse, categoriesResponse] = await Promise.all([
        fetch('/api/ticket-data/organization', { headers }),
        fetch('/api/ticket-data/categories', { headers })
      ]);

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganizationalData(orgData);
      } else {
        console.error('Failed to load organizational data');
        setOrganizationalData({ offices: [], bureaus: [], divisions: [], sections: [] });
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        
        // Transform the data to match the expected format
        setCategories(categoriesData.categories || {});
        setRequestTypes(categoriesData.requestTypes || {});
        setSubcategories(categoriesData.subcategories || {});
      } else {
        console.error('Failed to load ticket categories');
        setCategories({});
        setRequestTypes({});
        setSubcategories({});
      }

    } catch (error) {
      console.error('Error loading ticket data:', error);
      setOrganizationalData({ offices: [], bureaus: [], divisions: [], sections: [] });
      setCategories({});
      setRequestTypes({});
      setSubcategories({});
    } finally {
      setDataLoading(false);
    }
  };

  // Check if ticket has changes
  const hasChanges = () => {
    if (!originalTicket || !selectedTicket) return false;
    
    // Compare key fields that can be modified
    const fieldsToCompare = [
      'office', 'bureau', 'division', 'section',
      'category', 'request_type', 'subcategory', 'sub_subcategory', 'implementation',
      'priority', 'status', 'assigned_to', 'assigned_team'
    ];
    
    return fieldsToCompare.some(field => {
      return originalTicket[field as keyof Ticket] !== selectedTicket[field as keyof Ticket];
    });
  };

  // Store original ticket when modal opens
  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setOriginalTicket({...ticket}); // Store original state
    setSaveStatus('idle');
    setModalActiveTab('details'); // Reset to details tab
    loadAssignableUsers(); // Load users that can be assigned to
    loadAvailableTeams(); // Load teams for helpdesk users
  };

  // Handle tab change with proper event handling
  const handleTabChange = (value: string) => {
    setModalActiveTab(value);
  };

  // Load assignable users
  const loadAssignableUsers = async () => {
    setLoadingAssignableUsers(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users/assignable', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignableUsers(data.users || []);
      } else {
        console.error('Failed to load assignable users');
        setAssignableUsers([]);
      }
    } catch (error) {
      console.error('Error loading assignable users:', error);
      setAssignableUsers([]);
    } finally {
      setLoadingAssignableUsers(false);
    }
  };

  // Load available teams for helpdesk users
  const loadAvailableTeams = async () => {
    if (!canAssignCrossTeam()) return;
    
    setLoadingTeams(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/helpdesk/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTeams(data.data?.all_teams || []);
      } else {
        console.error('Failed to load available teams');
        setAvailableTeams([]);
      }
    } catch (error) {
      console.error('Error loading available teams:', error);
      setAvailableTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Load ticket attachments
  const loadTicketAttachments = async (ticketId: string) => {
    if (!ticketId) return;
    
    try {
      setLoadingAttachments(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/staff/tickets/attachments?ticketId=${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicketAttachments(data.attachments || []);
      } else {
        console.error('Failed to load attachments');
        setTicketAttachments([]);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
      setTicketAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };
  
  // Download attachment
  const downloadAttachment = async (attachmentId: number, filename: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/staff/tickets/attachments/${attachmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification(`Downloaded ${filename}`, 'success');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      showNotification('Failed to download file', 'error');
    }
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check authentication on load
  // Load current user with fresh permissions
  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔍 Loading current user, token exists:', !!token);
      
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Auth API response status:', response.status);

      if (response.ok) {
        const user = await response.json();
        console.log('✅ User loaded successfully:', user.display_name, 'Permissions:', user.permissions?.length || 0);
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        console.log('❌ Token invalid, status:', response.status);
        // Token invalid, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Error loading user:', error);
      // Don't redirect immediately on error - might be a temporary network issue
      // Instead, try to use cached user data as fallback
      const userData = localStorage.getItem('currentUser');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('🔄 Using cached user data as fallback:', user.display_name);
          setCurrentUser(user);
        } catch (parseError) {
          console.error('❌ Error parsing cached user data:', parseError);
          window.location.href = '/';
        }
      } else {
        window.location.href = '/';
      }
    }
  };

  useEffect(() => {
    // Check if auth data is passed via URL (from public portal login)
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    
    if (authParam) {
      try {
        // Decode auth data from URL
        const authData = JSON.parse(atob(authParam));
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('currentUser', JSON.stringify(authData.user));
        setCurrentUser(authData.user);
        
        // Clean URL by removing auth param
        window.history.replaceState({}, '', '/tickets');
        // Load fresh user data with permissions
        loadCurrentUser();
        return;
      } catch (error) {
        console.error('Error processing auth data:', error);
      }
    }
    
    // Check existing localStorage and load fresh user data
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/';
      return;
    }

    // Load current user with fresh permissions
    loadCurrentUser();
    
    // Load ticket category and organizational data
    loadTicketData();
  }, []);

  // Load tickets with filtering logic
  const loadTickets = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        status: activeTab === 'all' ? '' : activeTab,
        queue: filters.queue,
        priority: filters.priority === 'all' ? '' : filters.priority,
        sort: filters.sort,
        limit: '50'
      });

      const response = await fetch(`/api/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let filteredTickets = data.tickets || [];
        
        // Apply client-side filtering for queue logic
        if (filters.queue === 'my_tickets') {
          filteredTickets = filteredTickets.filter((ticket: Ticket) => 
            ticket.assigned_to === currentUser.username
          );
        } else if (filters.queue === 'team_tickets') {
          // Show tickets assigned to user's team or unassigned tickets for the team
          filteredTickets = filteredTickets.filter((ticket: Ticket) => 
            ticket.assigned_team === currentUser.team_id || 
            (!ticket.assigned_to && !ticket.assigned_team)
          );
        }
        // 'all_tickets' shows everything (no additional filtering)
        
        // Apply client-side sorting
        filteredTickets.sort((a: Ticket, b: Ticket) => {
          switch (filters.sort) {
            case 'newest_first':
              return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
            case 'oldest_first':
              return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
            case 'priority_high':
              const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
              return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                     (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
            case 'priority_low':
              const priorityOrderLow = { urgent: 4, high: 3, medium: 2, low: 1 };
              return (priorityOrderLow[a.priority as keyof typeof priorityOrderLow] || 0) - 
                     (priorityOrderLow[b.priority as keyof typeof priorityOrderLow] || 0);
            default:
              return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
          }
        });
        
        setTickets(filteredTickets);
        
        // Calculate stats from all tickets (not filtered)
        const allTickets = data.tickets || [];
        const stats = data.status_counts || {};
        const today = new Date().toDateString();
        const todayCount = allTickets.filter((ticket: Ticket) => 
          new Date(ticket.submitted_at).toDateString() === today
        ).length;

        setQueueStats({
          pending: stats.pending || 0,
          assigned: stats.assigned || 0,
          in_progress: stats.in_progress || 0,
          completed: stats.completed || 0,
          escalated: stats.escalated || 0,
          deleted: stats.deleted || 0,
          today: todayCount,
          total: data.pagination?.total || 0
        });
      } else {
        console.error('Failed to load tickets');
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadTickets();
    }
  }, [currentUser, activeTab, filters]);

  // Real-time polling for new tickets assigned to user's team
  useEffect(() => {
    if (!currentUser) return;

    const pollInterval = setInterval(() => {
      // Only poll if user is on pending tab and team_tickets queue (most common scenario)
      if (activeTab === 'pending' && filters.queue === 'team_tickets') {
        console.log('🔄 Polling for new team tickets...');
        loadTickets();
      }
    }, 30000); // Poll every 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [currentUser, activeTab, filters.queue]);

  // Load attachments when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      loadTicketAttachments(selectedTicket.id);
      setOriginalTicket({ ...selectedTicket });
    } else {
      setTicketAttachments([]);
    }
  }, [selectedTicket]);

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

  // Handle ticket actions
  const handleTicketAction = async (ticketId: string, action: string, data?: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tickets/${ticketId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data || {})
      });

      if (response.ok) {
        // Reload tickets to show updated state
        loadTickets();
      } else {
        console.error(`Failed to ${action} ticket`);
      }
    } catch (error) {
      console.error(`Error ${action} ticket:`, error);
    }
  };

  const formatDate = (dateString: string) => {
    return formatRegularTime(dateString);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800';
      case 'complete': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalate': return 'bg-orange-100 text-orange-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'deleted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Update ticket field helper
  const updateTicketField = (field: string, value: string) => {
    if (selectedTicket) {
      // Don't allow field updates if ticket is not editable
      if (!isTicketEditable(selectedTicket)) return;
      
      // Auto-assign ticket to current user if unassigned (except when changing assignment directly)
      let updatedTicket = { ...selectedTicket, [field]: value };
      
      if (!selectedTicket.assigned_to && field !== 'assigned_to' && currentUser?.username) {
        updatedTicket.assigned_to = currentUser.username;
        showNotification(`Ticket automatically assigned to you`, 'success');
      }
      
      setSelectedTicket(updatedTicket);
      
      // Special handling for team changes - clear assigned user and reload assignable users
      if (field === 'assigned_team' && value !== selectedTicket.assigned_team) {
        setSelectedTicket(prev => prev ? {
          ...prev,
          assigned_team: value,
          assigned_to: '' // Clear assigned user when team changes
        } : null);
        // Reload assignable users for the new team
        setTimeout(() => loadAssignableUsers(), 100);
        showNotification('Team changed - assigned user cleared', 'success');
        return; // Exit early since we've handled the update
      }
      
      // Clear dependent fields when parent category changes
      if (field === 'category') {
        setSelectedTicket(prev => prev ? {
          ...prev,
          category: value,
          request_type: '',
          subcategory: '',
          sub_subcategory: ''
        } : null);
      } else if (field === 'request_type') {
        setSelectedTicket(prev => prev ? {
          ...prev,
          request_type: value,
          subcategory: '',
          sub_subcategory: ''
        } : null);
      }
      
      // TODO: Call API to update ticket in database
      console.log(`Updating ticket ${selectedTicket.id}: ${field} = ${value}`);
    }
  };

  // Open organizational data browser
  const openOrgBrowser = () => {
    setShowOrgBrowser(true);
  };

  // Open category data browser
  const openCategoryBrowser = () => {
    setShowCategoryBrowser(true);
  };

  // Handle organizational path selection
  const handleOrgPathSelection = (pathData: any) => {
    if (!selectedTicket) return;
    
    // Update all organizational fields at once
    setSelectedTicket(prev => prev ? {
      ...prev,
      office: pathData.officeValue || '',
      bureau: pathData.bureauValue || '',
      division: pathData.divisionValue || '',
      section: pathData.sectionValue || ''
    } : null);
    
    console.log('✅ Organizational path selected:', pathData);
  };

  // Handle category path selection
  const handleCategoryPathSelection = (pathData: any) => {
    if (!selectedTicket) return;
    
    // Update only available category fields (non-empty values)
    const updates: any = {};
    
    if (pathData.categoryKey) updates.category = pathData.categoryKey;
    if (pathData.requestTypeKey) updates.request_type = pathData.requestTypeKey;
    if (pathData.subcategoryKey) updates.subcategory = pathData.subcategoryKey;
    if (pathData.subSubcategoryKey) updates.sub_subcategory = pathData.subSubcategoryKey;
    if (pathData.implementationKey) updates.implementation = pathData.implementationKey;
    
    setSelectedTicket(prev => prev ? {
      ...prev,
      ...updates
    } : null);
    
    console.log('✅ Category path selected:', pathData, 'Updates:', updates);
  };

  // Save ticket changes to backend
  const saveTicketChanges = async () => {
    if (!selectedTicket || !hasChanges()) return;
    
    // Check if status is being changed to 'complete'
    if (selectedTicket.status === 'complete' && originalTicket?.status !== 'complete') {
      // Show completion modal instead of saving immediately
      setShowCompletionModal(true);
      return;
    }
    
    // Check if status is being changed to 'escalate' - auto-escalate to helpdesk
    let ticketToSave = selectedTicket;
    if (selectedTicket.status === 'escalate' && originalTicket?.status !== 'escalate') {
      // Automatically change status to 'escalated' and assign to Helpdesk team
      ticketToSave = {
        ...selectedTicket,
        status: 'escalated' as const,
        assigned_team: 'HELPDESK',
        assigned_to: '', // Clear individual assignment when escalating
        escalated_at: new Date().toISOString(),
        escalation_reason: 'Ticket escalated to Helpdesk team'
      };
      
      // Update the selected ticket state immediately for UI
      setSelectedTicket(ticketToSave);
    }
    
    setSaveStatus('saving');
    
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token from localStorage:', token ? `Present (${token.length} chars)` : 'Missing');
      console.log('📝 Updating ticket:', selectedTicket.id);
      
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ticketToSave)
      });
      
      if (response.ok) {
        // Update the ticket in the main list
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketToSave.id ? ticketToSave : ticket
        ));
        
        // Update original ticket state
        setOriginalTicket({...ticketToSave});
        setSaveStatus('saved');
        
        // Show appropriate notification
        if (ticketToSave.status === 'escalated' && originalTicket?.status !== 'escalated') {
          showNotification('Ticket escalated to Helpdesk team successfully!', 'success');
        } else {
          showNotification('Ticket updated successfully!', 'success');
        }
        
        // Reset to idle after showing success
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const error = await response.json();
        setSaveStatus('idle');
        showNotification(`Failed to update ticket: ${error.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving ticket:', error);
      setSaveStatus('idle');
      showNotification('Error saving ticket changes', 'error');
    }
  };

  // Handle completion with notes
  const handleCompletion = async () => {
    if (!selectedTicket || !completionNotes.trim()) {
      showNotification('Please provide completion notes', 'error');
      return;
    }
    
    setSaveStatus('saving');
    setShowCompletionModal(false);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Update ticket status to 'completed' and add completion notes
      const completedTicket = {
        ...selectedTicket,
        status: 'completed' as const,
        completion_notes: completionNotes,
        completed_at: new Date().toISOString()
      };
      
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(completedTicket)
      });
      
      if (response.ok) {
        // Update the ticket in the main list
        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id ? completedTicket : ticket
        ));
        
        // Update selected ticket and original ticket state
        setSelectedTicket(completedTicket);
        setOriginalTicket({...completedTicket});
        setSaveStatus('saved');
        showNotification('Ticket completed successfully!', 'success');
        setCompletionNotes('');
        
        // Reset to idle after showing success
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const error = await response.json();
        setSaveStatus('idle');
        showNotification(`Failed to complete ticket: ${error.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error completing ticket:', error);
      setSaveStatus('idle');
      showNotification('Error completing ticket', 'error');
    }
  };

  // Cycle through status values
  const cycleStatus = () => {
    if (!selectedTicket) return;
    
    // Don't allow status changes if ticket is not editable (completed or escalated without permission)
    if (!isTicketEditable(selectedTicket)) return;
    
    const statusOrder: Array<'pending' | 'in_progress' | 'complete' | 'escalate'> = ['pending', 'in_progress', 'complete', 'escalate'];
    const currentIndex = statusOrder.indexOf(selectedTicket.status as any);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];
    
    // Auto-assign if unassigned
    let updatedTicket = { ...selectedTicket, status: nextStatus };
    if (!selectedTicket.assigned_to && currentUser?.username) {
      updatedTicket.assigned_to = currentUser.username;
      showNotification(`Ticket automatically assigned to you`, 'success');
    }
    
    setSelectedTicket(updatedTicket);
  };

  // Cycle through priority values  
  const cyclePriority = () => {
    if (!selectedTicket) return;
    
    // Don't allow priority changes if ticket is not editable
    if (!isTicketEditable(selectedTicket)) return;
    
    const priorityOrder: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityOrder.indexOf(selectedTicket.priority);
    const nextIndex = (currentIndex + 1) % priorityOrder.length;
    const nextPriority = priorityOrder[nextIndex];
    
    // Auto-assign if unassigned
    let updatedTicket = { ...selectedTicket, priority: nextPriority };
    if (!selectedTicket.assigned_to && currentUser?.username) {
      updatedTicket.assigned_to = currentUser.username;
      showNotification(`Ticket automatically assigned to you`, 'success');
    }
    
    setSelectedTicket(updatedTicket);
  };

  // Format status for display (consistent with queue view)
  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  // Format priority for display (consistent with queue view)
  const formatPriority = (priority: string) => {
    return priority.toUpperCase();
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Blue bar matching screenshot */}
      <div className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">📋 Support Ticket Queue</h1>
            <div className="flex items-center space-x-4">
              {/* Create Ticket Button - only show if user has staff ticket creation permissions */}
              {currentUser?.permissions?.includes('ticket.create_for_users') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowStaffTicketModal(true)}
                        variant="outline"
                        className="bg-white text-blue-600 border-white hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Ticket
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create ticket for user or internal issue</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Helpdesk Queue Button - only show if user has helpdesk permissions */}
              {currentUser?.permissions?.includes('helpdesk.multi_queue_access') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => window.location.href = '/helpdesk/queue'}
                        variant="outline"
                        className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-200"
                        size="sm"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Helpdesk Queue
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Multi-Team Helpdesk Queue</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Admin Dashboard Button - only show if user has admin permissions */}
              {currentUser?.permissions?.some((perm: string) => 
                ['admin.manage_users', 'admin.view_users', 'admin.manage_teams', 'admin.view_teams', 
                 'admin.manage_organization', 'admin.view_organization', 'admin.manage_categories', 
                 'admin.view_categories', 'admin.view_analytics', 'admin.system_settings'].includes(perm)
              ) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => window.location.href = '/developer'}
                        variant="outline"
                        className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-200"
                        size="sm"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>System Administration</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Enhanced User Menu */}
              <TooltipProvider>
                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUserMenu(!showUserMenu);
                        }}
                        className="flex items-center rounded-full p-1 hover:bg-blue-700 transition-colors duration-200"
                      >
                        <UserAvatar 
                          user={currentUser}
                          size="lg"
                          showOnlineIndicator={true}
                          className="border-2 border-white/30 hover:border-white transition-colors duration-200"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
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

      {/* Filters */}
      <div className="bg-white border-b p-4">
        <div className="container mx-auto">
          <div className="flex items-center space-x-4">
            <FormControl size="small" className="w-48">
              <InputLabel id="queue-filter-label">Queue</InputLabel>
              <Select
                labelId="queue-filter-label"
                id="queue-filter"
                value={filters.queue}
                label="Queue"
                onChange={(e) => setFilters({...filters, queue: e.target.value})}
              >
                <MenuItem value="my_tickets">My Tickets</MenuItem>
                <MenuItem value="team_tickets">Team Tickets</MenuItem>
                <MenuItem value="all_tickets">All Tickets</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" className="w-48">
              <InputLabel id="priority-filter-label">Priority</InputLabel>
              <Select
                labelId="priority-filter-label"
                id="priority-filter"
                value={filters.priority}
                label="Priority"
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" className="w-48">
              <InputLabel id="sort-filter-label">Sort</InputLabel>
              <Select
                labelId="sort-filter-label"
                id="sort-filter"
                value={filters.sort}
                label="Sort"
                onChange={(e) => setFilters({...filters, sort: e.target.value})}
              >
                <MenuItem value="newest_first">Newest First</MenuItem>
                <MenuItem value="oldest_first">Oldest First</MenuItem>
                <MenuItem value="priority_high">Priority: High to Low</MenuItem>
                <MenuItem value="priority_low">Priority: Low to High</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white">
        <div className="container mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-12 w-full justify-start rounded-none border-b bg-transparent">
              <TabsTrigger 
                value="pending" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-t-lg"
              >
                Pending ({queueStats.pending})
              </TabsTrigger>
              <TabsTrigger 
                value="in_progress" 
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-t-lg"
              >
                In Progress ({queueStats.in_progress})
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-t-lg"
              >
                Completed ({queueStats.completed})
              </TabsTrigger>
              <TabsTrigger 
                value="escalated" 
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-t-lg"
              >
                Escalated ({queueStats.escalated})
              </TabsTrigger>
              <TabsTrigger 
                value="deleted" 
                className="data-[state=active]:bg-gray-500 data-[state=active]:text-white rounded-t-lg"
              >
                Deleted ({queueStats.deleted})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Ticket List */}
      <div className="container mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No tickets found for the selected criteria.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => openTicketModal(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {ticket.assigned_to && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <User className="h-3 w-3 mr-1" />
                            {ticket.assigned_to}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">{ticket.issue_title}</h3>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {ticket.user_name} • #{ticket.employee_number} • {ticket.location}
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {ticket.issue_description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Submitted: {formatDate(ticket.submitted_at)} | TKT:{ticket.submission_id}</span>
                        {ticket.assigned_to && (
                          <span className="text-purple-600 font-medium">
                            Assigned to: {ticket.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View Button */}
                    <div className="flex space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        onClick={() => openTicketModal(ticket)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {currentUser?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTicketAction(ticket.id, 'delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Simple ticket detail view (could be expanded into a full modal later) */}
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
                  <div><strong>Location:</strong> {selectedTicket.location}</div>
                  {selectedTicket.cubicle_room && (
                    <div><strong>Cubicle/Room:</strong> {selectedTicket.cubicle_room}</div>
                  )}
                  {selectedTicket.request_creator_display_name && (
                    <div><strong>Request Creator:</strong> {selectedTicket.request_creator_display_name}</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* File Attachments Section */}
            <div className="mt-6">
              <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                File Attachments
              </h3>
              
              {loadingAttachments ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading attachments...</span>
                </div>
              ) : ticketAttachments.length > 0 ? (
                <div className="grid gap-3">
                  {ticketAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {attachment.original_filename}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatFileSize(attachment.file_size)} • {attachment.mime_type.split('/')[1].toUpperCase()} • 
                            Uploaded by {attachment.uploaded_by} on {new Date(attachment.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAttachment(attachment.id, attachment.original_filename)}
                        className="flex items-center gap-2 ml-3"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No attachments found for this ticket.</p>
                </div>
              )}
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
                          {organizationalData.offices.map((office, index) => (
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
                          {organizationalData.bureaus.map((bureau, index) => (
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
                          {organizationalData.divisions.map((division, index) => (
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
                          {organizationalData?.sections?.map((section, index) => (
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

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? '✅' : '❌'}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Browser Modals */}
      <OrganizationalBrowserModal
        isOpen={showOrgBrowser}
        onClose={() => setShowOrgBrowser(false)}
        onSelect={handleOrgPathSelection}
        organizationalData={organizationalData}
      />

      <CategoryBrowserModal
        isOpen={showCategoryBrowser}
        onClose={() => setShowCategoryBrowser(false)}
        onSelect={handleCategoryPathSelection}
        categoriesData={{
          categories,
          requestTypes,
          subcategories,
          subSubcategories: {}, // Add if available
          implementationTypes: {} // Add if available
        }}
      />

      {/* Profile Edit Modal */}
      {currentUser && (
        <ProfileEditModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          user={currentUser}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Staff Ticket Creation Modal */}
      {currentUser && (
        <StaffTicketModal
          open={showStaffTicketModal}
          onOpenChange={setShowStaffTicketModal}
          onSubmit={async (ticketData) => {
            try {
              console.log('🎫 Creating ticket via tickets page onSubmit:', ticketData);
              
              // Create the ticket via API
              const token = localStorage.getItem('authToken');
              const response = await fetch('/api/staff/tickets', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  ...ticketData,
                  createdByStaff: currentUser?.username,
                  submittedDate: new Date().toISOString()
                })
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create ticket: ${response.status} ${errorText}`);
              }

              const result = await response.json();
              console.log('✅ Ticket created successfully:', result);

              // After successful ticket creation, refresh the tickets
              await loadTickets();
              showNotification(`Ticket ${result.ticketId} created successfully`, 'success');
            } catch (error) {
              console.error('❌ Error creating ticket:', error);
              showNotification('Failed to create ticket. Please try again.', 'error');
              throw error; // Re-throw so the modal can handle it
            }
          }}
        />
      )}

      {/* Completion Notes Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowCompletionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold">Complete Ticket</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Please provide notes on how this issue was resolved:
              </p>
              
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                autoFocus
              />
              
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletionNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompletion}
                  disabled={!completionNotes.trim() || saveStatus === 'saving'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="mr-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Ticket
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}