'use client';

import React, { useState, useEffect } from 'react';
// Use Material-UI for all modal and form components to avoid focus issues
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Tab,
  Tabs,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip
} from '@mui/material';
import { 
  Ticket, 
  FileText, 
  User, 
  Settings, 
  Info,
  X, 
  Save,
  RefreshCw,
  Search,
  UserPlus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface StaffTicketFormData {
  // Request Information
  title: string;
  category: string;
  subcategory: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // User Information
  submittedBy: string;
  userDisplayName: string;
  userEmail: string;
  userDepartment: string;
  userLocation: string;
  
  // Staff Controls
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assignedTeam: string;
  assignedTo: string;
  internalNotes: string;
  
  // System Information (auto-populated)
  ticketId?: string;
  submittedDate?: string;
  createdByStaff?: string;
  ticketSource: 'staff_created';
}

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string; }[];
}

interface Team {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  team_name?: string;
}

interface StaffTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (ticketData: StaffTicketFormData) => Promise<void>;
  defaultValues?: Partial<StaffTicketFormData>;
}

export function StaffTicketModal({
  open,
  onOpenChange,
  onSubmit,
  defaultValues
}: StaffTicketModalProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState('request');
  
  // Form state
  const [formData, setFormData] = useState<StaffTicketFormData>({
    title: '',
    category: '',
    subcategory: '',
    description: '',
    priority: 'medium',
    submittedBy: '',
    userDisplayName: '',
    userEmail: '',
    userDepartment: '',
    userLocation: '',
    status: 'open',
    assignedTeam: '',
    assignedTo: '',
    internalNotes: '',
    ticketSource: 'staff_created'
  });

  // Loading states
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Auto-generated system info
  const [systemInfo, setSystemInfo] = useState({
    ticketId: 'AUTO-GENERATED',
    submittedDate: new Date().toLocaleString(),
    createdByStaff: currentUser?.display_name || 'Unknown Staff',
    ticketSource: 'Staff Created'
  });

  // Load initial data
  useEffect(() => {
    if (open) {
      loadCategories();
      loadTeams();
      loadUsers();
      
      // Apply default values if provided
      if (defaultValues) {
        setFormData(prev => ({ ...prev, ...defaultValues }));
      }
      
      // Update system info
      setSystemInfo({
        ticketId: 'AUTO-GENERATED',
        submittedDate: new Date().toLocaleString(),
        createdByStaff: currentUser?.display_name || 'Unknown Staff',
        ticketSource: 'Staff Created'
      });
    }
  }, [open, defaultValues, currentUser]);

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      } else {
        console.error('Failed to load categories');
        toast({
          title: 'Warning',
          description: 'Failed to load ticket categories',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load ticket categories',
        variant: 'destructive',
      });
    }
  };

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const teamData = await response.json();
        setTeams(teamData.filter((team: Team) => team.id)); // Filter active teams
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // First, get the current user's team
      if (currentUser?.team_id) {
        // Load only users from the same team
        const response = await fetch(`/api/developer/teams/${currentUser.team_id}/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setUsers(userData.filter((user: User) => user.username)); // Filter active users
        }
      } else {
        // If no team, just load the current user
        setUsers(currentUser ? [{
          id: currentUser.id,
          username: currentUser.username,
          display_name: currentUser.display_name,
          email: currentUser.email
        }] : []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // Fallback to loading current user only
      if (currentUser) {
        setUsers([{
          id: currentUser.id,
          username: currentUser.username,
          display_name: currentUser.display_name,
          email: currentUser.email
        }]);
      }
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof StaffTicketFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  };

  // Handle user selection from search
  const handleUserSelect = (user: User) => {
    setFormData(prev => ({
      ...prev,
      submittedBy: user.username,
      userDisplayName: user.display_name,
      userEmail: user.email,
      userDepartment: user.team_name || ''
    }));
    setShowUserSearch(false);
    setUserSearchTerm('');
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.display_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // Get subcategories for selected category
  const currentSubcategories = categories
    .find(cat => cat.id === formData.category)?.subcategories || [];

  // Validate form
  const isFormValid = () => {
    return formData.title && 
           formData.category && 
           formData.description && 
           formData.submittedBy;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission logic
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/staff/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            createdByStaff: currentUser?.username,
            submittedDate: new Date().toISOString()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create ticket');
        }

        const result = await response.json();
        
        toast({
          title: 'Success',
          description: `Ticket ${result.ticketId} created successfully`,
        });
        
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      subcategory: '',
      description: '',
      priority: 'medium',
      submittedBy: '',
      userDisplayName: '',
      userEmail: '',
      userDepartment: '',
      userLocation: '',
      status: 'open',
      assignedTeam: '',
      assignedTo: '',
      internalNotes: '',
      ticketSource: 'staff_created'
    });
    setUserSearchTerm('');
    setShowUserSearch(false);
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onOpenChange(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh', overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Ticket className="h-5 w-5 text-blue-600" />
        Create New Ticket
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
          Create a ticket on behalf of a user or for internal issues
        </Typography>
        
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
          >
            <Tab 
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FileText className="h-4 w-4" />Request</Box>} 
              value="request" 
            />
            <Tab 
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><User className="h-4 w-4" />User</Box>} 
              value="user" 
            />
            <Tab 
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Settings className="h-4 w-4" />Staff Controls</Box>} 
              value="staff" 
            />
            <Tab 
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Info className="h-4 w-4" />System Info</Box>} 
              value="system" 
            />
          </Tabs>

          {/* Request Information Tab */}
          {activeTab === 'request' && (
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileText className="h-5 w-5" />
                  Request Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Basic ticket details and issue description
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                  <TextField
                    label="Issue Title *"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Brief description of the issue"
                    size="small"
                    fullWidth
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select 
                      value={formData.priority} 
                      onChange={(e) => handleFieldChange('priority', e.target.value)}
                      label="Priority"
                    >
                      <MenuItem value="low">
                        <Chip label="Low" size="small" color="success" variant="outlined" />
                      </MenuItem>
                      <MenuItem value="medium">
                        <Chip label="Medium" size="small" color="primary" variant="outlined" />
                      </MenuItem>
                      <MenuItem value="high">
                        <Chip label="High" size="small" color="warning" variant="outlined" />
                      </MenuItem>
                      <MenuItem value="urgent">
                        <Chip label="Urgent" size="small" color="error" variant="outlined" />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category *</InputLabel>
                    <Select 
                      value={formData.category} 
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      label="Category *"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Subcategory</InputLabel>
                    <Select 
                      value={formData.subcategory} 
                      onChange={(e) => handleFieldChange('subcategory', e.target.value)}
                      disabled={!formData.category}
                      label="Subcategory"
                    >
                      {currentSubcategories.map((subcategory) => (
                        <MenuItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Description *"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Detailed description of the issue, steps to reproduce, or additional context"
                  multiline
                  rows={4}
                  fullWidth
                  size="small"
                />
              </Paper>
            </Box>
          )}

          {/* User Information Tab */}
          {activeTab === 'user' && (
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <User className="h-5 w-5" />
                  User Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select the user this ticket is being created for
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flexGrow: 1, position: 'relative' }}>
                      <TextField
                        label="User Search *"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Search by name, username, or email"
                        onFocus={() => setShowUserSearch(true)}
                        size="small"
                        fullWidth
                        InputProps={{
                          endAdornment: <Search className="h-4 w-4 text-gray-400" />
                        }}
                      />
                      
                      {showUserSearch && userSearchTerm && (
                        <Paper 
                          sx={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            zIndex: 50, 
                            maxHeight: 200, 
                            overflow: 'auto',
                            mt: 1
                          }}
                        >
                          {filteredUsers.length > 0 ? (
                            filteredUsers.slice(0, 10).map((user) => (
                              <Box
                                key={user.id}
                                sx={{
                                  p: 2,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                                onClick={() => handleUserSelect(user)}
                              >
                                <Typography variant="body2" fontWeight="medium">{user.display_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{user.username} • {user.email}
                                </Typography>
                                {user.team_name && (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {user.team_name}
                                  </Typography>
                                )}
                              </Box>
                            ))
                          ) : (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                              <Typography color="text.secondary">No users found</Typography>
                            </Box>
                          )}
                        </Paper>
                      )}
                    </Box>
                    <Button variant="outlined" sx={{ minWidth: 'auto' }}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      New User
                    </Button>
                  </Box>
                  
                  {formData.submittedBy && (
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <User className="h-4 w-4" />
                        Selected User
                      </Typography>
                      <Box sx={{ '& > div': { mb: 0.5 } }}>
                        <Typography variant="body2"><strong>Name:</strong> {formData.userDisplayName}</Typography>
                        <Typography variant="body2"><strong>Username:</strong> @{formData.submittedBy}</Typography>
                        <Typography variant="body2"><strong>Email:</strong> {formData.userEmail}</Typography>
                        {formData.userDepartment && (
                          <Typography variant="body2"><strong>Department:</strong> {formData.userDepartment}</Typography>
                        )}
                      </Box>
                    </Paper>
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <TextField
                    label="Location"
                    value={formData.userLocation}
                    onChange={(e) => handleFieldChange('userLocation', e.target.value)}
                    placeholder="Office, building, or room number"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Department"
                    value={formData.userDepartment}
                    onChange={(e) => handleFieldChange('userDepartment', e.target.value)}
                    placeholder="User's department or team"
                    size="small"
                    fullWidth
                  />
                </Box>
              </Paper>
            </Box>
          )}

          {/* Staff Controls Tab */}
          {activeTab === 'staff' && (
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings className="h-5 w-5" />
                  Staff Controls
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Set initial status, assignment, and internal notes
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Initial Status</InputLabel>
                    <Select 
                      value={formData.status} 
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      label="Initial Status"
                    >
                      <MenuItem value="open">Open</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {/* Only show Assign to Team if user has cross-team assignment permissions */}
                  {(currentUser?.permissions?.includes('ticket.assign_cross_team') || 
                    currentUser?.permissions?.includes('helpdesk.assign_cross_team') ||
                    currentUser?.permissions?.includes('ticket.assign_any')) ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>Assign to Team</InputLabel>
                      <Select 
                        value={formData.assignedTeam} 
                        onChange={(e) => handleFieldChange('assignedTeam', e.target.value)}
                        label="Assign to Team"
                      >
                        {teams.map((team) => (
                          <MenuItem key={team.id} value={team.id}>
                            {team.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Assign to Team
                      </Typography>
                      <Paper sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                        <Typography variant="body2" color="text.secondary">
                          Your Team (Default)
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Box>

                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>
                      Assign to User
                    </InputLabel>
                    <Select 
                      value={formData.assignedTo} 
                      onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                      label="Assign to User"
                    >
                      <MenuItem value="">
                        <em>No assignment</em>
                      </MenuItem>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <MenuItem key={user.id} value={user.username}>
                            {user.display_name} (@{user.username})
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          <em>No team members available</em>
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Internal Notes"
                  value={formData.internalNotes}
                  onChange={(e) => handleFieldChange('internalNotes', e.target.value)}
                  placeholder="Staff-only notes about this ticket (not visible to user)"
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                />
              </Paper>
            </Box>
          )}

          {/* System Information Tab */}
          {activeTab === 'system' && (
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info className="h-5 w-5" />
                  System Information
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Auto-generated system details (read-only)
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Ticket ID</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                      <Typography variant="body2">{systemInfo.ticketId}</Typography>
                    </Paper>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Submitted Date</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                      <Typography variant="body2">{systemInfo.submittedDate}</Typography>
                    </Paper>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Created By Staff</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                      <Typography variant="body2">{systemInfo.createdByStaff}</Typography>
                    </Paper>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Ticket Source</Typography>
                    <Paper sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                      <Chip label={systemInfo.ticketSource} size="small" color="primary" variant="outlined" />
                    </Paper>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>

      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button 
          variant="outlined" 
          onClick={handleCancel} 
          disabled={saving}
          sx={{ mr: 2 }}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={!isFormValid() || saving}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating Ticket...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Create Ticket
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}