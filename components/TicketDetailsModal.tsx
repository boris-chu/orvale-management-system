"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  X, 
  Save, 
  RefreshCw, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  Building2,
  Tag,
  Search,
  Paperclip,
  Download,
  FileText,
  Image,
  File,
  ExternalLink,
  Trash2,
  Upload,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel 
} from '@mui/material';
import OrganizationalBrowserModal from './OrganizationalBrowserModal';
import CategoryBrowserModal from './CategoryBrowserModal';
import TicketHistoryComponent from './TicketHistoryComponent';
import apiClient from '@/lib/api-client';

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

interface TicketDetailsModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onSave: (ticketData: Ticket) => Promise<void>;
  currentUser: any;
  isHelpdesk?: boolean;
}

export function TicketDetailsModal({ 
  ticket, 
  onClose, 
  onSave,
  currentUser,
  isHelpdesk = false
}: TicketDetailsModalProps) {
  if (!ticket) return null;

  // State management
  const [selectedTicket, setSelectedTicket] = useState<Ticket>(ticket);
  const [originalTicket, setOriginalTicket] = useState<Ticket>({...ticket});
  const [modalActiveTab, setModalActiveTab] = useState('details');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  
  // Modal states
  const [showOrgBrowser, setShowOrgBrowser] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  
  // Dropdown data state
  const [dropdownData, setDropdownData] = useState({
    offices: [],
    bureaus: [],
    divisions: [],
    sections: [],
    categories: [],
    requestTypes: [],
    subcategories: [],
    implementations: []
  });

  // Attachment states
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<number[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  // Load initial data
  useEffect(() => {
    if (ticket) {
      loadAssignableUsers();
      loadAvailableTeams();
      loadDropdownData();
      loadAttachments();
    }
  }, [ticket]);

  // Helper functions
  const canAssignCrossTeam = () => {
    return currentUser?.permissions?.includes('helpdesk.assign_cross_team');
  };

  const isTicketEditable = (ticket: Ticket | null) => {
    if (!ticket) return false;
    return ticket.status !== 'completed';
  };

  const hasChanges = () => {
    if (!selectedTicket || !originalTicket) return false;
    return JSON.stringify(selectedTicket) !== JSON.stringify(originalTicket) ||
           newAttachments.length > 0 || 
           attachmentsToDelete.length > 0;
  };

  const hasAttachmentChanges = () => {
    return newAttachments.length > 0 || attachmentsToDelete.length > 0;
  };

  // Helper functions for UI formatting
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const formatPriority = (priority: string) => {
    return priority.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const cyclePriority = () => {
    if (!isTicketEditable(selectedTicket)) return;
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(selectedTicket.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    updateTicketField('priority', priorities[nextIndex]);
  };

  const cycleStatus = () => {
    if (!isTicketEditable(selectedTicket)) return;
    const statuses = ['pending', 'in_progress', 'escalated'];
    const currentIndex = statuses.indexOf(selectedTicket.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    updateTicketField('status', statuses[nextIndex]);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if user can edit attachments
  const canEditAttachments = () => {
    return isTicketEditable(selectedTicket) && (
      currentUser?.permissions?.includes('ticket.create_for_users') ||
      currentUser?.permissions?.includes('admin.system_settings')
    );
  };

  // Download attachment
  const downloadAttachment = async (attachmentId: number, filename: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/staff/tickets/attachments/${attachmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    Array.from(files).forEach((file) => {
      if (file.size > maxSize) return;
      validFiles.push(file);
    });
    
    if (validFiles.length > 0) {
      setNewAttachments(prev => [...prev, ...validFiles]);
    }
  };

  // Handle drag and drop for attachments
  const handleAttachmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  // Save attachment changes
  const saveAttachmentChanges = async () => {
    if (!selectedTicket || (!hasAttachmentChanges())) return;
    
    setUploadingAttachments(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Delete marked attachments
      for (const attachmentId of attachmentsToDelete) {
        await apiClient.deleteStaffTicketAttachment(attachmentId);
      }
      
      // Upload new attachments
      if (newAttachments.length > 0) {
        const formData = new FormData();
        newAttachments.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('ticketId', selectedTicket.id);
        
        await apiClient.uploadTicketAttachment(newAttachments[0], { ticketId: selectedTicket.id });
      }
      
      // Reset states and reload attachments
      setNewAttachments([]);
      setAttachmentsToDelete([]);
      loadAttachments();
      
    } catch (error) {
      console.error('Error updating attachments:', error);
    } finally {
      setUploadingAttachments(false);
    }
  };

  // Data loading functions
  const loadAssignableUsers = async () => {
    setLoadingAssignableUsers(true);
    try {
      const result = await apiClient.getTicketAssignableUsers();
      if (result.success) {
        setAssignableUsers(result.data.users || []);
      }
    } catch (error) {
      console.error('Error loading assignable users:', error);
    } finally {
      setLoadingAssignableUsers(false);
    }
  };

  const loadAvailableTeams = async () => {
    if (!canAssignCrossTeam()) {
      console.log('🔧 loadAvailableTeams - canAssignCrossTeam: false - skipping');
      return;
    }
    console.log('🔧 loadAvailableTeams - canAssignCrossTeam: true');
    setLoadingTeams(true);
    try {
      const result = await apiClient.getHelpdeskTeams();
      if (result.success) {
        console.log('🔧 loadAvailableTeams - API response:', result.data);
        const teams = result.data.all_teams || [];
        console.log('🔧 loadAvailableTeams - extracted teams:', teams);
        setAvailableTeams(teams);
      } else {
        console.error('🔧 loadAvailableTeams - API response failed:', result.message);
      }
    } catch (error) {
      console.error('Error loading available teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const result = await apiClient.getDropdownData();
      if (result.success) {
        setDropdownData(result.data);
      }
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const result = await apiClient.getStaffTicketAttachments(ticket.id);
      if (result.success) {
        setAttachments(result.data.attachments || []);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Update functions
  const updateTicketField = (field: string, value: any) => {
    if (!isTicketEditable(selectedTicket)) return;
    
    // Special handling for team assignment
    if (field === 'assigned_team' && value !== selectedTicket.assigned_team) {
      setSelectedTicket(prev => ({
        ...prev,
        assigned_team: value,
        assigned_to: '' // Clear assigned user when team changes
      }));
    } else {
      setSelectedTicket(prev => ({ ...prev, [field]: value }));
    }
  };

  // Save function
  const saveTicketChanges = async () => {
    if (!hasChanges()) return;
    
    setSaveStatus('saving');
    try {
      await onSave(selectedTicket);
      
      // Handle attachments if needed
      if (newAttachments.length > 0 || attachmentsToDelete.length > 0) {
        // TODO: Handle attachment upload/deletion
      }
      
      setSaveStatus('saved');
      setOriginalTicket({...selectedTicket});
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving ticket:', error);
      setSaveStatus('idle');
    }
  };

  // Handlers
  const handleOrgPathSelection = (pathData: any) => {
    updateTicketField('office', pathData.office || '');
    updateTicketField('bureau', pathData.bureau || '');
    updateTicketField('division', pathData.division || '');
    updateTicketField('section', pathData.section || '');
    setShowOrgBrowser(false);
  };

  const handleCategorySelection = (categoryData: any) => {
    updateTicketField('category', categoryData.category || '');
    updateTicketField('request_type', categoryData.requestType || '');
    updateTicketField('subcategory', categoryData.subcategory || '');
    updateTicketField('implementation', categoryData.implementation || '');
    setShowCategoryBrowser(false);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    setNewAttachments(prev => [...prev, ...files]);
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const markAttachmentForDeletion = (attachmentId: number) => {
    setAttachmentsToDelete(prev => [...prev, attachmentId]);
  };

  const unmarkAttachmentForDeletion = (attachmentId: number) => {
    setAttachmentsToDelete(prev => prev.filter(id => id !== attachmentId));
  };

  // Render the modal - this is a simplified version
  // The full implementation would include all the UI from the original modal
  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] min-h-[60vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
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
              {isHelpdesk && canAssignCrossTeam() && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium">
                    Helpdesk Mode - Cross-team assignment available
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {hasChanges() && isTicketEditable(selectedTicket) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button 
                    onClick={saveTicketChanges}
                    disabled={saveStatus === 'saving'}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
              <Button variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Save Status */}
          <AnimatePresence>
            {saveStatus === 'saved' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Changes saved successfully
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <Tabs value={modalActiveTab} onValueChange={setModalActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="attachments">
                Attachments
                {attachments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {attachments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value="details" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-600 mb-2">Request Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong> 
                      <Badge 
                        className={`${getStatusColor(selectedTicket.status)} ${!isTicketEditable(selectedTicket) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'} ml-2`}
                        onClick={() => isTicketEditable(selectedTicket) && cyclePriority()}
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
                    {selectedTicket.request_creator_display_name && (
                      <div><strong>Request Creator:</strong> {selectedTicket.request_creator_display_name}</div>
                    )}
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
                            onChange={(e) => {
                              console.log('🔧 Team assignment change:', e.target.value);
                              updateTicketField('assigned_team', e.target.value);
                            }}
                            disabled={loadingTeams || !isTicketEditable(selectedTicket)}
                          >
                            <MenuItem value="">
                              <em>Unassigned</em>
                            </MenuItem>
                            {(() => {
                              console.log('🔧 Select render - availableTeams:', availableTeams);
                              return availableTeams.map((team) => (
                                <MenuItem key={team.id} value={team.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{team.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {team.section_name} • {team.active_tickets} active tickets
                                      {team.team_lead_name && ` • Lead: ${team.team_lead_name}`}
                                    </span>
                                  </div>
                                </MenuItem>
                              ));
                            })()}
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
                  </div>
                </div>
              </div>
              
              {/* File Attachments Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    File Attachments
                  </h3>
                  {hasAttachmentChanges() && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewAttachments([]);
                          setAttachmentsToDelete([]);
                        }}
                        disabled={uploadingAttachments}
                      >
                        Cancel Changes
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveAttachmentChanges}
                        disabled={uploadingAttachments}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {uploadingAttachments ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {(attachments.length > 0 || newAttachments.length > 0) ? (
                  <>
                    {/* Existing Attachments */}
                    {attachments.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Current Attachments</h4>
                        <div className="grid gap-3">
                          {attachments.map((attachment) => {
                            const isMarkedForDeletion = attachmentsToDelete.includes(attachment.id);
                            return (
                              <div
                                key={attachment.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                  isMarkedForDeletion 
                                    ? 'bg-red-50 border-red-200 opacity-50' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {attachment.mime_type?.startsWith('image/') ? (
                                    <Image className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-gray-900 truncate">
                                      {attachment.original_filename}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {formatFileSize(attachment.file_size)} • 
                                      {attachment.mime_type} • 
                                      Uploaded by {attachment.uploaded_by} on {new Date(attachment.uploaded_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadAttachment(attachment.id, attachment.original_filename)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {canEditAttachments() && !isMarkedForDeletion && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => markAttachmentForDeletion(attachment.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canEditAttachments() && isMarkedForDeletion && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => unmarkAttachmentForDeletion(attachment.id)}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                    >
                                      Restore
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* New Attachments */}
                    {newAttachments.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">New Attachments</h4>
                        <div className="grid gap-3">
                          {newAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm text-green-900 truncate">
                                    {file.name}
                                  </div>
                                  <div className="text-xs text-green-600 mt-1">
                                    {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()} • New file
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeNewAttachment(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-3"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Attachments Section */}
                    {isTicketEditable(selectedTicket) && (
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                        onDragOver={handleAttachmentDragOver}
                        onDrop={handleAttachmentDrop}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.bmp,.zip';
                          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
                          input.click();
                        }}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Add More Attachments</h4>
                        <p className="text-xs text-gray-500 mb-4">
                          Drag and drop files here, or click to select files
                        </p>
                        <p className="text-xs text-gray-400">
                          Supported: PDF, Word, Excel, Images, ZIP (Max 10MB each)
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  /* No attachments message */
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
                    onClick={() => setShowOrgBrowser(true)} 
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
                            {dropdownData.offices?.map((office: string, index: number) => (
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
                            {dropdownData.bureaus?.map((bureau: string, index: number) => (
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
                            {dropdownData.divisions?.map((division: string, index: number) => (
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
                            {dropdownData.sections?.map((section: string, index: number) => (
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
                    onClick={() => setShowCategoryBrowser(true)} 
                    className="flex items-center gap-2"
                    disabled={selectedTicket.status === 'completed'}
                  >
                    <Search className="h-4 w-4" />
                    Browse Categories
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
                            {dropdownData.categories && Object.keys(dropdownData.categories).map((category) => (
                              <MenuItem key={category} value={category}>
                                {category}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Request Type:</label>
                        <FormControl size="small" className="w-full">
                          <InputLabel id="request-type-select-label">Select Request Type</InputLabel>
                          <Select
                            labelId="request-type-select-label"
                            id="request-type-select"
                            value={selectedTicket.request_type || ''}
                            label="Select Request Type"
                            onChange={(e) => updateTicketField('request_type', e.target.value)}
                            disabled={!isTicketEditable(selectedTicket)}
                          >
                            {dropdownData.requestTypes && selectedTicket.category && 
                              dropdownData.requestTypes[selectedTicket.category]?.map((requestType: string) => (
                                <MenuItem key={requestType} value={requestType}>
                                  {requestType}
                                </MenuItem>
                              ))
                            }
                          </Select>
                        </FormControl>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory:</label>
                        <FormControl size="small" className="w-full">
                          <InputLabel id="subcategory-select-label">Select Subcategory</InputLabel>
                          <Select
                            labelId="subcategory-select-label"
                            id="subcategory-select"
                            value={selectedTicket.subcategory || ''}
                            label="Select Subcategory"
                            onChange={(e) => updateTicketField('subcategory', e.target.value)}
                            disabled={!isTicketEditable(selectedTicket)}
                          >
                            {dropdownData.subcategories && selectedTicket.request_type && 
                              dropdownData.subcategories[selectedTicket.request_type]?.map((subcategory: string) => (
                                <MenuItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </MenuItem>
                              ))
                            }
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
                            {dropdownData.implementations && selectedTicket.subcategory && 
                              dropdownData.implementations[selectedTicket.subcategory]?.map((implementation: string) => (
                                <MenuItem key={implementation} value={implementation}>
                                  {implementation}
                                </MenuItem>
                              ))
                            }
                          </Select>
                        </FormControl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issue Description */}
              <div className="mt-6">
                <h3 className="font-semibold text-blue-600 mb-2">Issue Description</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
                    <Input
                      value={selectedTicket.issue_title}
                      onChange={(e) => updateTicketField('issue_title', e.target.value)}
                      disabled={!isTicketEditable(selectedTicket)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
                    <Textarea
                      value={selectedTicket.issue_description}
                      onChange={(e) => updateTicketField('issue_description', e.target.value)}
                      disabled={!isTicketEditable(selectedTicket)}
                      rows={4}
                      className="w-full resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Computer Information */}
              {selectedTicket.computer_info && (
                <div className="mt-6">
                  <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Computer Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {(() => {
                      try {
                        const computerInfo = JSON.parse(selectedTicket.computer_info);
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {computerInfo.userAgent && <div><strong>User Agent:</strong> {computerInfo.userAgent}</div>}
                            {computerInfo.screen && <div><strong>Screen:</strong> {computerInfo.screen}</div>}
                            {computerInfo.language && <div><strong>Language:</strong> {computerInfo.language}</div>}
                            {computerInfo.timezone && <div><strong>Timezone:</strong> {computerInfo.timezone}</div>}
                            {computerInfo.cookieEnabled !== undefined && <div><strong>Cookies:</strong> {computerInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</div>}
                            {computerInfo.onlineStatus && <div><strong>Online:</strong> {computerInfo.onlineStatus}</div>}
                            {computerInfo.browser && <div><strong>Browser:</strong> {computerInfo.browser}</div>}
                            {computerInfo.platform && <div><strong>Platform:</strong> {computerInfo.platform}</div>}
                            {computerInfo.timestamp && <div><strong>Captured:</strong> {new Date(computerInfo.timestamp).toLocaleString()}</div>}
                          </div>
                        );
                      } catch (error) {
                        return <div>System information unavailable</div>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="communication" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Communication</h3>
                <p className="text-sm text-gray-600">
                  Communication history would go here...
                </p>
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Attachments</h3>
                <p className="text-sm text-gray-600">
                  Attachment management would go here...
                </p>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <TicketHistoryComponent 
                ticketId={selectedTicket.id} 
                isVisible={modalActiveTab === 'history'}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sub-modals */}
      {showOrgBrowser && (
        <OrganizationalBrowserModal
          isOpen={showOrgBrowser}
          onClose={() => setShowOrgBrowser(false)}
          onSelect={handleOrgPathSelection}
          organizationalData={dropdownData}
        />
      )}

      {showCategoryBrowser && (
        <CategoryBrowserModal
          isOpen={showCategoryBrowser}
          onClose={() => setShowCategoryBrowser(false)}
          onSelect={handleCategorySelection}
          categoriesData={{
            categories: dropdownData.categories,
            requestTypes: dropdownData.requestTypes,
            subcategories: dropdownData.subcategories,
            subSubcategories: {},
            implementationTypes: {}
          }}
        />
      )}
    </>
  );
}