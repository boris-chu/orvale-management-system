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
  Plus,
  Paperclip,
  FileText,
  Download,
  ExternalLink,
  Upload,
  X,
  Trash2
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
import { SharedTicketDetailsModal } from '@/components/SharedTicketDetailsModal';

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
  
  // Attachments state
  const [ticketAttachments, setTicketAttachments] = useState<TicketAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<number[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  
  // Comments state
  const [ticketComments, setTicketComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSummaryData();
      loadDropdownData();
    }
  }, [currentUser]);

  // Load attachments when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      loadTicketAttachments(selectedTicket.id);
      loadAssignableUsers();
      // Don't set originalTicket here - it should only be set when opening the modal
    } else {
      setTicketAttachments([]);
    }
    // Reset attachment editing states
    setNewAttachments([]);
    setAttachmentsToDelete([]);
  }, [selectedTicket]);

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
  
  // Handle new file selection
  const handleAttachmentFileSelect = (files: FileList) => {
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        showNotification(`${file.name} exceeds 10MB limit`, 'error');
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        showNotification(`${file.name} - Only documents, images, and archives are allowed`, 'error');
        return;
      }
      
      validFiles.push(file);
    });
    
    if (validFiles.length > 0) {
      setNewAttachments(prev => [...prev, ...validFiles]);
      showNotification(`${validFiles.length} file(s) added`, 'success');
    }
  };
  
  // Remove new attachment before upload
  const removeNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Mark existing attachment for deletion
  const markAttachmentForDeletion = (attachmentId: number) => {
    setAttachmentsToDelete(prev => [...prev, attachmentId]);
  };
  
  // Unmark attachment for deletion
  const unmarkAttachmentForDeletion = (attachmentId: number) => {
    setAttachmentsToDelete(prev => prev.filter(id => id !== attachmentId));
  };
  
  // Save attachment changes
  const saveAttachmentChanges = async () => {
    if (!selectedTicket || (newAttachments.length === 0 && attachmentsToDelete.length === 0)) {
      return;
    }
    
    setUploadingAttachments(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Delete marked attachments
      for (const attachmentId of attachmentsToDelete) {
        const deleteResponse = await fetch(`/api/staff/tickets/attachments/${attachmentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete attachment ${attachmentId}`);
        }
      }
      
      // Upload new attachments
      if (newAttachments.length > 0) {
        const formData = new FormData();
        newAttachments.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('ticketId', selectedTicket.id);
        
        const uploadResponse = await fetch('/api/staff/tickets/attachments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload new attachments');
        }
      }
      
      // Reset states
      setNewAttachments([]);
      setAttachmentsToDelete([]);
      
      // Reload attachments
      await loadTicketAttachments(selectedTicket.id);
      
      showNotification('Attachments updated successfully', 'success');
      
    } catch (error) {
      console.error('Error updating attachments:', error);
      showNotification('Failed to update attachments', 'error');
    } finally {
      setUploadingAttachments(false);
    }
  };
  
  // Handle drag and drop for new attachments
  const handleAttachmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAttachmentFileSelect(files);
    }
  };
  
  // Check if user can edit attachments
  const canEditAttachments = () => {
    return isTicketEditable(selectedTicket) && (
      currentUser?.permissions?.includes('ticket.create_for_users') ||
      currentUser?.permissions?.includes('admin.system_settings')
    );
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
    loadTicketComments(ticket.id);
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
    const hasChanges = JSON.stringify(selectedTicket) !== JSON.stringify(originalTicket);
    
    // Debug logging
    if (hasChanges) {
      console.log('🔍 Changes detected in helpdesk queue:', {
        selectedTicket: selectedTicket,
        originalTicket: originalTicket,
        differences: Object.keys(selectedTicket).filter(key => 
          JSON.stringify(selectedTicket[key as keyof Ticket]) !== JSON.stringify(originalTicket[key as keyof Ticket])
        )
      });
    }
    
    return hasChanges;
  };
  
  const saveTicketChanges = async () => {
    console.log('💾 Save function called!', {
      selectedTicket: selectedTicket?.id,
      hasChanges: hasChanges(),
      saveStatus
    });
    
    if (!selectedTicket || !hasChanges()) {
      console.log('❌ Save aborted - no ticket or no changes', {
        hasTicket: !!selectedTicket,
        hasChanges: hasChanges()
      });
      return;
    }
    
    console.log('🔄 Starting save process for ticket:', selectedTicket.id);
    setSaveStatus('saving');
    
    try {
      const token = localStorage.getItem('authToken');
      console.log('📤 Sending PUT request with data:', selectedTicket);
      
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(selectedTicket)
      });
      
      console.log('📥 Server response:', response.status, response.statusText);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Save successful:', responseData);
        
        setSaveStatus('saved');
        setOriginalTicket({...selectedTicket});
        showNotification('Ticket updated successfully', 'success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const errorText = await response.text();
        console.error('❌ Save failed:', response.status, errorText);
        throw new Error(`Failed to save ticket: ${response.status}`);
      }
    } catch (error) {
      console.error('💥 Save error:', error);
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

  // Comment management functions
  const loadTicketComments = async (ticketId: string) => {
    setLoadingComments(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTicketComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const addTicketComment = async (commentText: string) => {
    if (!selectedTicket) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment_text: commentText })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTicketComments(prev => [...prev, data.comment]);
        showNotification('Comment added successfully', 'success');
      } else {
        const errorData = await response.text();
        console.error('Comment API error:', response.status, errorData);
        throw new Error(`Failed to add comment: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification('Failed to add comment', 'error');
      throw error;
    }
  };

  const deleteTicketComment = async (commentId: number) => {
    if (!selectedTicket) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tickets/${selectedTicket.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setTicketComments(prev => prev.filter(comment => comment.id !== commentId));
        showNotification('Comment deleted successfully', 'success');
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showNotification('Failed to delete comment', 'error');
      throw error;
    }
  };
  
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
            try {
              console.log('🎫 Creating ticket via helpdesk queue onSubmit:', ticketData);
              
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
              await handleRefresh();
              showNotification(`Ticket ${result.ticketId} created successfully`, 'success');
            } catch (error) {
              console.error('❌ Error creating ticket:', error);
              showNotification('Failed to create ticket. Please try again.', 'error');
              throw error; // Re-throw so the modal can handle it
            }
          }}
        />
      )}

      {/* Ticket Detail Modal - Using Shared Working Component */}
      <SharedTicketDetailsModal
        ticket={selectedTicket}
        originalTicket={originalTicket}
        onClose={() => setSelectedTicket(null)}
        onSave={saveTicketChanges}
        currentUser={currentUser}
        isHelpdesk={true}
        modalActiveTab={modalActiveTab}
        onTabChange={handleTabChange}
        saveStatus={saveStatus}
        hasChanges={hasChanges}
        isTicketEditable={isTicketEditable}
        updateTicketField={updateTicketField}
        cycleStatus={cycleStatus}
        cyclePriority={cyclePriority}
        formatDate={formatDate}
        formatStatus={formatStatus}
        formatPriority={formatPriority}
        getStatusColor={getStatusColor}
        getPriorityColor={getPriorityColor}
        canAssignCrossTeam={canAssignCrossTeam}
        assignableUsers={assignableUsers}
        loadingAssignableUsers={loadingAssignableUsers}
        availableTeams={availableTeams}
        loadingTeams={loadingTeams}
        ticketAttachments={ticketAttachments}
        loadingAttachments={loadingAttachments}
        organizationalData={organizationalData}
        categories={categories}
        requestTypes={requestTypes}
        subcategories={subcategories}
        openOrgBrowser={openOrgBrowser}
        openCategoryBrowser={openCategoryBrowser}
        formatFileSize={formatFileSize}
        downloadAttachment={downloadAttachment}
        onFileUpload={async (files: FileList) => {
          if (!selectedTicket) return;
          
          try {
            console.log(`📎 Uploading ${files.length} files for ticket ${selectedTicket.id}...`);
            
            const token = localStorage.getItem('authToken');
            const uploadFormData = new FormData();
            
            // Add all files to form data
            Array.from(files).forEach((file) => {
              // Validate file size (max 10MB)
              if (file.size > 10 * 1024 * 1024) {
                throw new Error(`${file.name} exceeds 10MB limit`);
              }
              
              // Validate file type
              const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'text/csv',
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/bmp',
                'application/zip',
                'application/x-zip-compressed'
              ];
              
              if (!allowedTypes.includes(file.type)) {
                throw new Error(`${file.name} - File type not allowed`);
              }
              
              uploadFormData.append('files', file);
            });
            
            uploadFormData.append('ticketId', selectedTicket.id);
            
            // Upload files
            const uploadResponse = await fetch('/api/staff/tickets/attachments', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: uploadFormData
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
            }
            
            const uploadResult = await uploadResponse.json();
            console.log('✅ Files uploaded successfully:', uploadResult);
            
            showNotification(`${uploadResult.files?.length || 0} file(s) uploaded successfully`, 'success');
            
            // Refresh attachments list
            loadTicketAttachments(selectedTicket.id);
            
            if (uploadResult.errors && uploadResult.errors.length > 0) {
              showNotification(`Some files failed: ${uploadResult.errors.join(', ')}`, 'error');
            }
          } catch (error) {
            console.error('❌ File upload error:', error);
            showNotification(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        }}
        onFileDelete={async (attachmentId: number) => {
          if (!selectedTicket) return;
          
          try {
            console.log(`🗑️ Deleting attachment ${attachmentId}...`);
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/staff/tickets/attachments/${attachmentId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Delete failed: ${response.status} ${errorText}`);
            }
            
            const result = await response.json();
            console.log('✅ Attachment deleted successfully:', result);
            
            showNotification('File deleted successfully', 'success');
            
            // Refresh attachments list
            loadTicketAttachments(selectedTicket.id);
          } catch (error) {
            console.error('❌ File delete error:', error);
            showNotification(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        }}
        ticketComments={ticketComments}
        loadingComments={loadingComments}
        onAddComment={addTicketComment}
        onDeleteComment={deleteTicketComment}
      />
      {/* Browse Modals */}
      <CategoryBrowserModal
        isOpen={showCategoryBrowser}
        onClose={() => setShowCategoryBrowser(false)}
        categoriesData={{
          categories,
          requestTypes,
          subcategories,
          subSubcategories: {}, // Add if available
          implementationTypes: {} // Add if available
        }}
        onSelect={(selection) => {
          if (selectedTicket && isTicketEditable(selectedTicket)) {
            if (selection.categoryKey) updateTicketField('category', selection.categoryKey);
            if (selection.requestTypeKey) updateTicketField('request_type', selection.requestTypeKey);
            if (selection.subcategoryKey) updateTicketField('subcategory', selection.subcategoryKey);
            if (selection.subSubcategoryKey) updateTicketField('sub_subcategory', selection.subSubcategoryKey);
            if (selection.implementationKey) updateTicketField('implementation', selection.implementationKey);
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