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
  Monitor,
  Check,
  Eye
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
import CategoryBrowserModal from './CategoryBrowserModal';
import OrganizationalBrowserModal from './OrganizationalBrowserModal';
import TicketHistoryComponent from './TicketHistoryComponent';

interface TicketAttachment {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface TicketComment {
  id: number;
  ticket_id: number;
  comment_text: string;
  commented_by: string;
  commented_by_name: string;
  created_at: string;
  updated_at: string;
  is_internal: boolean;
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
  assigned_to_name?: string;
  assigned_team?: string;
  assigned_team_name?: string;
  assigned_team_label?: string;
  submitted_at: string;
  updated_at: string;
  escalated_at?: string;
  completed_at?: string;
  escalation_reason?: string;
  completion_notes?: string;
  internal_notes?: string;
  activity_count: number;
}

interface SharedTicketDetailsModalProps {
  ticket: Ticket | null;
  originalTicket: Ticket | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  currentUser: any;
  isHelpdesk?: boolean;
  
  // State and functions that need to be passed from parent
  modalActiveTab: string;
  onTabChange: (tab: string) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  
  // Functions
  hasChanges: () => boolean;
  isTicketEditable: (ticket: Ticket | null) => boolean;
  updateTicketField: (field: string, value: string) => void;
  cycleStatus: () => void;
  cyclePriority: () => void;
  formatDate: (dateString: string) => string;
  formatStatus: (status: string) => string;
  formatPriority: (priority: string) => string;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  canAssignCrossTeam: () => boolean;
  
  // Data
  assignableUsers: any[];
  loadingAssignableUsers: boolean;
  availableTeams: any[];
  loadingTeams: boolean;
  ticketAttachments: TicketAttachment[];
  loadingAttachments: boolean;
  organizationalData: any;
  categories: any;
  requestTypes: any;
  subcategories: any;
  
  // Browser functions
  openOrgBrowser: () => void;
  openCategoryBrowser: () => void;
  
  // Attachment functions
  formatFileSize: (bytes: number) => string;
  downloadAttachment: (id: number, filename: string) => Promise<void>;
  
  // File upload functions
  onFileUpload?: (files: FileList) => Promise<void>;
  onFileDelete?: (attachmentId: number) => Promise<void>;
  
  // Comment functions
  ticketComments: TicketComment[];
  loadingComments: boolean;
  unreadCommentsCount?: number;
  onAddComment?: (commentText: string) => Promise<void>;
  onDeleteComment?: (commentId: number) => Promise<void>;
  onMarkCommentsRead?: () => Promise<void>;
}

export function SharedTicketDetailsModal({
  ticket,
  originalTicket,
  onClose,
  onSave,
  currentUser,
  isHelpdesk = false,
  modalActiveTab,
  onTabChange,
  saveStatus,
  hasChanges,
  isTicketEditable,
  updateTicketField,
  cycleStatus,
  cyclePriority,
  formatDate,
  formatStatus,
  formatPriority,
  getStatusColor,
  getPriorityColor,
  canAssignCrossTeam,
  assignableUsers,
  loadingAssignableUsers,
  availableTeams,
  loadingTeams,
  ticketAttachments,
  loadingAttachments,
  organizationalData,
  categories,
  requestTypes,
  subcategories,
  openOrgBrowser,
  openCategoryBrowser,
  formatFileSize,
  downloadAttachment,
  onFileUpload,
  onFileDelete,
  ticketComments,
  loadingComments,
  unreadCommentsCount = 0,
  onAddComment,
  onDeleteComment,
  onMarkCommentsRead,
}: SharedTicketDetailsModalProps) {
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [deletingComment, setDeletingComment] = useState<number | null>(null);
  if (!ticket) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] min-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold">{ticket.issue_title}</h2>
            {ticket.status === 'completed' && (
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
            {(() => {
              const changes = hasChanges();
              const editable = isTicketEditable(ticket);
              console.log('🎯 Save button condition check:', {
                hasChanges: changes,
                isTicketEditable: editable,
                shouldShow: changes && editable,
                selectedTicketId: ticket?.id
              });
              return null;
            })()}
            <AnimatePresence mode="wait">
              {hasChanges() && isTicketEditable(ticket) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button 
                    onClick={onSave} 
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
            <Button variant="outline" onClick={onClose}>
              ✕ Close
            </Button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <Tabs value={modalActiveTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3" onClick={(e) => e.stopPropagation()}>
            <TabsTrigger 
              value="details" 
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="h-4 w-4" />
              Ticket Details
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                // Mark comments as read when user clicks on comments tab
                if (unreadCommentsCount > 0 && onMarkCommentsRead) {
                  onMarkCommentsRead();
                }
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Comments
              {unreadCommentsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-semibold"
                >
                  {unreadCommentsCount}
                </Badge>
              )}
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
                      className={`${getStatusColor(ticket.status)} ${!isTicketEditable(ticket) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'} ml-2`}
                      onClick={() => isTicketEditable(ticket) && cycleStatus()}
                      title={!isTicketEditable(ticket) ? 'Completed tickets cannot be modified' : 'Click to cycle status'}
                    >
                      {formatStatus(ticket.status)}
                    </Badge>
                  </div>
                  <div><strong>Priority:</strong> 
                    <Badge 
                      className={`${getPriorityColor(ticket.priority)} ${!isTicketEditable(ticket) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'} ml-2`}
                      onClick={() => isTicketEditable(ticket) && cyclePriority()}
                      title={!isTicketEditable(ticket) ? 'Completed tickets cannot be modified' : 'Click to cycle priority'}
                    >
                      {formatPriority(ticket.priority)}
                    </Badge>
                  </div>
                  <div><strong>Submitted:</strong> {formatDate(ticket.submitted_at)}</div>
                  {ticket.request_creator_display_name && (
                    <div><strong>Request Creator:</strong> {ticket.request_creator_display_name}</div>
                  )}
                  <div><strong>Ticket ID:</strong> {ticket.submission_id}</div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To:</label>
                    <FormControl size="small" className="w-full">
                      <InputLabel id="assigned-to-label">Select Assignee</InputLabel>
                      <Select
                        labelId="assigned-to-label"
                        id="assigned-to-select"
                        value={ticket.assigned_to || ''}
                        label="Select Assignee"
                        onChange={(e) => updateTicketField('assigned_to', e.target.value)}
                        disabled={loadingAssignableUsers || !isTicketEditable(ticket)}
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
                          value={ticket.assigned_team || ''}
                          label="Select Team"
                          onChange={(e) => updateTicketField('assigned_team', e.target.value)}
                          disabled={loadingTeams || !isTicketEditable(ticket)}
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
                  <div><strong>Name:</strong> {ticket.user_name}</div>
                  <div><strong>Employee #:</strong> {ticket.employee_number}</div>
                  <div><strong>Phone:</strong> {ticket.phone_number}</div>
                  <div><strong>Location:</strong> {ticket.location}</div>
                  {ticket.cubicle_room && (
                    <div><strong>Cubicle/Room:</strong> {ticket.cubicle_room}</div>
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
                  disabled={ticket.status === 'completed'}
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
                          value={ticket.office || ''}
                          label="Select Office"
                          onChange={(e) => updateTicketField('office', e.target.value)}
                          disabled={!isTicketEditable(ticket)}
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
                          value={ticket.bureau || ''}
                          label="Select Bureau"
                          onChange={(e) => updateTicketField('bureau', e.target.value)}
                          disabled={!isTicketEditable(ticket)}
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
                          value={ticket.division || ''}
                          label="Select Division"
                          onChange={(e) => updateTicketField('division', e.target.value)}
                          disabled={!isTicketEditable(ticket)}
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
                          value={ticket.section || ''}
                          label="Select Section"
                          onChange={(e) => updateTicketField('section', e.target.value)}
                          disabled={!isTicketEditable(ticket)}
                        >
                          {organizationalData.sections?.map((section: string, index: number) => (
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
                  disabled={ticket.status === 'completed'}
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
                          value={ticket.category || ''}
                          label="Select Category"
                          onChange={(e) => updateTicketField('category', e.target.value)}
                          disabled={!isTicketEditable(ticket)}
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
                      <FormControl size="small" className="w-full" disabled={!ticket.category}>
                        <InputLabel id="request-type-select-label">Select Request Type</InputLabel>
                        <Select
                          labelId="request-type-select-label"
                          id="request-type-select"
                          value={ticket.request_type || ''}
                          label="Select Request Type"
                          onChange={(e) => updateTicketField('request_type', e.target.value)}
                          disabled={!ticket.category || !isTicketEditable(ticket)}
                        >
                          {ticket.category && requestTypes[ticket.category]?.map((type: any) => (
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
                      <FormControl size="small" className="w-full" disabled={!ticket.request_type}>
                        <InputLabel id="subcategory-select-label">Select Subcategory</InputLabel>
                        <Select
                          labelId="subcategory-select-label"
                          id="subcategory-select"
                          value={ticket.subcategory || ''}
                          label="Select Subcategory"
                          onChange={(e) => updateTicketField('subcategory', e.target.value)}
                          disabled={!ticket.request_type || !isTicketEditable(ticket)}
                        >
                          {ticket.category && ticket.request_type && 
                           subcategories[ticket.category]?.[ticket.request_type]?.map((subcat: any) => (
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
                          value={ticket.implementation || ''}
                          label="Select Implementation"
                          onChange={(e) => updateTicketField('implementation', e.target.value)}
                          disabled={!isTicketEditable(ticket)}
                        >
                          {/* Implementation options would be populated based on subcategory */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-800">{ticket.issue_description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Computer Information */}
            {ticket.computer_info && (
              <div className="mt-6">
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Computer Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {(() => {
                    try {
                      const computerInfo = JSON.parse(ticket.computer_info);
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

          <TabsContent value="notes" className="mt-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              {/* Comments Section */}
              <div>
                <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Internal
                  </Badge>
                </h3>
                
                {/* Add Comment Form */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Add Comment</span>
                  </div>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment about this ticket..."
                    disabled={!isTicketEditable(ticket) || addingComment}
                    className="min-h-[80px] w-full resize-none mb-3"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Comments are visible to all IT staff working on this ticket
                    </p>
                    <Button
                      onClick={async () => {
                        if (!newComment.trim() || !onAddComment) return;
                        setAddingComment(true);
                        try {
                          await onAddComment(newComment.trim());
                          setNewComment('');
                        } catch (error) {
                          console.error('Error adding comment:', error);
                        } finally {
                          setAddingComment(false);
                        }
                      }}
                      disabled={!newComment.trim() || addingComment || !isTicketEditable(ticket)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {addingComment ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Comment
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {loadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-500">Loading comments...</span>
                    </div>
                  ) : ticketComments.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {ticketComments.length} Comment{ticketComments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {ticketComments.map((comment) => {
                        const isOwner = comment.commented_by === currentUser?.username;
                        const canDeleteOwn = currentUser?.permissions?.includes('ticket.comment_delete_own');
                        const canDeleteAny = currentUser?.permissions?.includes('ticket.comment_delete_any');
                        const canDelete = (canDeleteOwn && isOwner) || canDeleteAny;
                        
                        return (
                          <div
                            key={comment.id}
                            className="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-900">
                                  {comment.commented_by_name || comment.commented_by}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {comment.commented_by}
                                </Badge>
                                {isOwner && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {formatDate(comment.created_at)}
                                </span>
                                {canDelete && onDeleteComment && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      if (!confirm('Are you sure you want to delete this comment?')) return;
                                      setDeletingComment(comment.id);
                                      try {
                                        await onDeleteComment(comment.id);
                                      } catch (error) {
                                        console.error('Error deleting comment:', error);
                                      } finally {
                                        setDeletingComment(null);
                                      }
                                    }}
                                    disabled={deletingComment === comment.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    {deletingComment === comment.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {comment.comment_text}
                            </p>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No comments yet. Be the first to add a comment!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* File Upload Section */}
              <div>
                <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Additional Files
                </h3>
                {isTicketEditable(ticket) ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        if (e.target.files && typeof onFileUpload === 'function') {
                          onFileUpload(e.target.files);
                        }
                      }}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-3">
                        <Paperclip className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Click to upload files or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Supports multiple files (max 10MB each)
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">File uploads disabled for completed tickets</p>
                  </div>
                )}
              </div>

              {/* Current Attachments with Delete Options */}
              {ticketAttachments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Current Attachments
                  </h3>
                  <div className="space-y-3">
                    {ticketAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
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
                        <div className="flex items-center gap-2 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadAttachment(attachment.id, attachment.original_filename)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                          {isTicketEditable(ticket) && typeof onFileDelete === 'function' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onFileDelete(attachment.id)}
                              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4" onClick={(e) => e.stopPropagation()}>
            <TicketHistoryComponent 
              ticketId={ticket.id} 
              isVisible={modalActiveTab === 'history'}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}