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
  userEmployeeNumber: string;
  userPhone: string;
  userLocation: string;
  userCubicleRoom: string;
  userOffice: string;
  userBureau: string;
  userDivision: string;
  userSection: string;
  
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

interface NewUserFormData {
  displayName: string;
  username: string;
  email: string;
  employeeNumber: string;
  phone: string;
  location: string;
  cubicleRoom: string;
  office: string;
  bureau: string;
  division: string;
  section: string;
}

interface OrganizationData {
  offices: string[];
  bureaus: string[];
  divisions: string[];
  sections: string[];
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
  active?: boolean;
  employee_number?: string;
  phone?: string;
  location?: string;
  cubicle_room?: string;
  office?: string;
  bureau?: string;
  division?: string;
  section?: string;
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
    userEmployeeNumber: '',
    userPhone: '',
    userLocation: '',
    userCubicleRoom: '',
    userOffice: '',
    userBureau: '',
    userDivision: '',
    userSection: '',
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
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState<NewUserFormData>({
    displayName: '',
    username: '',
    email: '',
    employeeNumber: '',
    phone: '',
    location: '',
    cubicleRoom: '',
    office: '',
    bureau: '',
    division: '',
    section: ''
  });
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    offices: [],
    bureaus: [],
    divisions: [],
    sections: []
  });

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
      loadOrganizationData();
      
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
      
      // Load users from the current user's team only
      if (currentUser?.team_id) {
        const response = await fetch(`/api/developer/teams/${currentUser.team_id}/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          const filteredUsers = userData.filter((user: User) => user.username && user.active !== false);
          setUsers(filteredUsers);
        } else {
          console.error('Failed to load team users:', response.status);
          // No fallback - if the user doesn't have proper permissions, they shouldn't see any users
          setUsers([]);
        }
      } else {
        // User has no team assignment - they can't create tickets for others
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // No fallback for security - users without proper access get empty list
      setUsers([]);
    }
  };

  const loadOrganizationData = async () => {
    try {
      const response = await fetch('/api/ticket-data/organization');
      if (response.ok) {
        const data = await response.json();
        setOrganizationData(data);
      }
    } catch (error) {
      console.error('Failed to load organization data:', error);
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
      userEmployeeNumber: user.employee_number || '',
      userPhone: user.phone || '',
      userLocation: user.location || '',
      userCubicleRoom: user.cubicle_room || '',
      userOffice: user.office || '',
      userBureau: user.bureau || '',
      userDivision: user.division || '',
      userSection: user.section || user.team_name || ''
    }));
    setShowUserSearch(false);
    setUserSearchTerm('');
  };

  // Handle new user creation
  const handleNewUserSubmit = async () => {
    try {
      // Validate required fields
      if (!newUserData.displayName || !newUserData.username || !newUserData.email) {
        toast({
          title: 'Validation Error',
          description: 'Name, Username, and Email are required fields.',
          variant: 'destructive'
        });
        return;
      }

      // Create the user in the database
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUserData.username,
          display_name: newUserData.displayName,
          email: newUserData.email,
          employee_number: newUserData.employeeNumber,
          phone: newUserData.phone,
          location: newUserData.location,
          cubicle_room: newUserData.cubicleRoom,
          office: newUserData.office,
          bureau: newUserData.bureau,
          division: newUserData.division,
          section: newUserData.section,
          role_id: 4, // Default to 'user' role
          active: true
        })
      });

      if (response.ok) {
        const createdUser = await response.json();
        
        // Select the newly created user
        setFormData(prev => ({
          ...prev,
          submittedBy: newUserData.username,
          userDisplayName: newUserData.displayName,
          userEmail: newUserData.email,
          userEmployeeNumber: newUserData.employeeNumber,
          userPhone: newUserData.phone,
          userLocation: newUserData.location,
          userCubicleRoom: newUserData.cubicleRoom,
          userOffice: newUserData.office,
          userBureau: newUserData.bureau,
          userDivision: newUserData.division,
          userSection: newUserData.section
        }));
        
        // Reset form and close dialog
        setNewUserData({
          displayName: '',
          username: '',
          email: '',
          employeeNumber: '',
          phone: '',
          location: '',
          cubicleRoom: '',
          office: '',
          bureau: '',
          division: '',
          section: ''
        });
        setShowNewUserDialog(false);
        
        toast({
          title: 'User Created',
          description: `User ${newUserData.displayName} has been created and selected.`
        });
        
        // Reload users list
        loadUsers();
      } else {
        const error = await response.text();
        toast({
          title: 'Error Creating User',
          description: error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        title: 'Error Creating User',
        description: 'Failed to create user. Please try again.',
        variant: 'destructive'
      });
    }
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

  // Format phone number for display (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, 10);
    
    if (limited.length === 0) return '';
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  // Format employee number (e/c/t + 6 digits)
  const formatEmployeeNumber = (value: string) => {
    let formatted = value.toLowerCase();
    
    // Limit to 7 characters max
    if (formatted.length > 7) {
      formatted = formatted.slice(0, 7);
    }
    
    if (formatted.length > 0) {
      // Ensure first character is e, c, or t
      const firstChar = formatted.charAt(0);
      if (firstChar !== 'e' && firstChar !== 'c' && firstChar !== 't') {
        formatted = '';
      } else if (formatted.length > 1) {
        // Ensure characters 2-7 are digits only
        const numberPart = formatted.slice(1).replace(/\D/g, '');
        formatted = firstChar + numberPart;
        
        // Limit to 6 digits after the letter
        if (numberPart.length > 6) {
          formatted = firstChar + numberPart.slice(0, 6);
        }
      }
    }
    
    return formatted;
  };

  // Handle phone number change
  const handlePhoneChange = (field: 'userPhone' | 'phone', value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    if (field === 'userPhone') {
      handleFieldChange('userPhone', cleaned);
    } else {
      setNewUserData(prev => ({ ...prev, phone: cleaned }));
    }
  };

  // Handle employee number change
  const handleEmployeeNumberChange = (field: 'userEmployeeNumber' | 'employeeNumber', value: string) => {
    const formatted = formatEmployeeNumber(value);
    if (field === 'userEmployeeNumber') {
      handleFieldChange('userEmployeeNumber', formatted);
    } else {
      setNewUserData(prev => ({ 
        ...prev, 
        employeeNumber: formatted,
        // Auto-populate username from employee number if username is empty
        username: prev.username === '' ? formatted : prev.username
      }));
    }
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
      userEmployeeNumber: '',
      userPhone: '',
      userLocation: '',
      userCubicleRoom: '',
      userOffice: '',
      userBureau: '',
      userDivision: '',
      userSection: '',
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
    <>
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
                    {/* Only show New User button if user has permission */}
                    {(currentUser?.permissions?.includes('ticket.create_new_users') || 
                      currentUser?.permissions?.includes('admin.manage_users')) && (
                      <Button 
                        variant="outlined" 
                        sx={{ minWidth: 'auto' }}
                        onClick={() => setShowNewUserDialog(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        New User
                      </Button>
                    )}
                  </Box>
                  
                  {formData.submittedBy && (
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <User className="h-4 w-4" />
                        Selected User
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                        <Typography variant="body2"><strong>Name:</strong> {formData.userDisplayName}</Typography>
                        <Typography variant="body2"><strong>Username:</strong> @{formData.submittedBy}</Typography>
                        <Typography variant="body2"><strong>Email:</strong> {formData.userEmail}</Typography>
                        {formData.userEmployeeNumber && (
                          <Typography variant="body2"><strong>Employee #:</strong> {formData.userEmployeeNumber}</Typography>
                        )}
                        {formData.userPhone && (
                          <Typography variant="body2"><strong>Phone:</strong> {formatPhoneNumber(formData.userPhone)}</Typography>
                        )}
                        {formData.userLocation && (
                          <Typography variant="body2"><strong>Location:</strong> {formData.userLocation}</Typography>
                        )}
                        {formData.userCubicleRoom && (
                          <Typography variant="body2"><strong>Cubicle/Room:</strong> {formData.userCubicleRoom}</Typography>
                        )}
                        {formData.userOffice && (
                          <Typography variant="body2"><strong>Office:</strong> {formData.userOffice}</Typography>
                        )}
                        {formData.userBureau && (
                          <Typography variant="body2"><strong>Bureau:</strong> {formData.userBureau}</Typography>
                        )}
                        {formData.userDivision && (
                          <Typography variant="body2"><strong>Division:</strong> {formData.userDivision}</Typography>
                        )}
                        {formData.userSection && (
                          <Typography variant="body2"><strong>Section:</strong> {formData.userSection}</Typography>
                        )}
                      </Box>
                    </Paper>
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                  <TextField
                    label="Employee Number"
                    value={formData.userEmployeeNumber}
                    onChange={(e) => handleEmployeeNumberChange('userEmployeeNumber', e.target.value)}
                    placeholder="e123456"
                    size="small"
                    fullWidth
                    inputProps={{ maxLength: 7, pattern: '[ect][0-9]{6}' }}
                    helperText="Format: e/c/t followed by 6 digits"
                  />
                  <TextField
                    label="Phone (10 digits)"
                    value={formatPhoneNumber(formData.userPhone)}
                    onChange={(e) => handlePhoneChange('userPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    size="small"
                    fullWidth
                    helperText={formData.userPhone.length > 0 && formData.userPhone.length < 10 ? 'Phone number must be 10 digits' : ''}
                    error={formData.userPhone.length > 0 && formData.userPhone.length < 10}
                  />
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                  <TextField
                    label="Location"
                    value={formData.userLocation}
                    onChange={(e) => handleFieldChange('userLocation', e.target.value)}
                    placeholder="Building name or address"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Cubicle/Room #"
                    value={formData.userCubicleRoom}
                    onChange={(e) => handleFieldChange('userCubicleRoom', e.target.value)}
                    placeholder="Room 123 or Cubicle A-45"
                    size="small"
                    fullWidth
                  />
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Office</InputLabel>
                    <Select
                      value={formData.userOffice}
                      onChange={(e) => handleFieldChange('userOffice', e.target.value)}
                      label="Office"
                    >
                      <MenuItem value="">Select Office</MenuItem>
                      {organizationData.offices.map((office) => (
                        <MenuItem key={office} value={office}>{office}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Bureau</InputLabel>
                    <Select
                      value={formData.userBureau}
                      onChange={(e) => handleFieldChange('userBureau', e.target.value)}
                      label="Bureau"
                    >
                      <MenuItem value="">Select Bureau</MenuItem>
                      {organizationData.bureaus.map((bureau) => (
                        <MenuItem key={bureau} value={bureau}>{bureau}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Division</InputLabel>
                    <Select
                      value={formData.userDivision}
                      onChange={(e) => handleFieldChange('userDivision', e.target.value)}
                      label="Division"
                    >
                      <MenuItem value="">Select Division</MenuItem>
                      {organizationData.divisions.map((division) => (
                        <MenuItem key={division} value={division}>{division}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Section</InputLabel>
                    <Select
                      value={formData.userSection}
                      onChange={(e) => handleFieldChange('userSection', e.target.value)}
                      label="Section"
                    >
                      <MenuItem value="">Select Section</MenuItem>
                      {organizationData.sections.map((section) => (
                        <MenuItem key={section} value={section}>{section}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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

    {/* New User Creation Dialog */}
    <Dialog open={showNewUserDialog} onClose={() => setShowNewUserDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <UserPlus className="h-5 w-5" />
        Create New User
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a new user account for the ticket system. Required fields are marked with *.
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <TextField
            label="Full Name *"
            value={newUserData.displayName}
            onChange={(e) => setNewUserData(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="John Doe"
            size="small"
            fullWidth
            required
          />
          <TextField
            label="Username *"
            value={newUserData.username}
            onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="john.doe"
            size="small"
            fullWidth
            required
          />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <TextField
            label="Email *"
            value={newUserData.email}
            onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john.doe@company.com"
            type="email"
            size="small"
            fullWidth
            required
          />
          <TextField
            label="Employee Number"
            value={newUserData.employeeNumber}
            onChange={(e) => handleEmployeeNumberChange('employeeNumber', e.target.value)}
            placeholder="e123456"
            size="small"
            fullWidth
            inputProps={{ maxLength: 7, pattern: '[ect][0-9]{6}' }}
            helperText="Format: e/c/t followed by 6 digits"
          />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <TextField
            label="Phone (10 digits)"
            value={formatPhoneNumber(newUserData.phone)}
            onChange={(e) => handlePhoneChange('phone', e.target.value)}
            placeholder="(555) 123-4567"
            size="small"
            fullWidth
            helperText={newUserData.phone.length > 0 && newUserData.phone.length < 10 ? 'Phone number must be 10 digits' : ''}
            error={newUserData.phone.length > 0 && newUserData.phone.length < 10}
          />
          <TextField
            label="Location"
            value={newUserData.location}
            onChange={(e) => setNewUserData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Building name or address"
            size="small"
            fullWidth
          />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 2, mb: 2 }}>
          <TextField
            label="Cubicle/Room #"
            value={newUserData.cubicleRoom}
            onChange={(e) => setNewUserData(prev => ({ ...prev, cubicleRoom: e.target.value }))}
            placeholder="Room 123 or Cubicle A-45"
            size="small"
            fullWidth
          />
        </Box>
        
        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          DPSS Organizational Information
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Office</InputLabel>
            <Select
              value={newUserData.office}
              onChange={(e) => setNewUserData(prev => ({ ...prev, office: e.target.value }))}
              label="Office"
            >
              <MenuItem value="">Select Office</MenuItem>
              {organizationData.offices.map((office) => (
                <MenuItem key={office} value={office}>{office}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Bureau</InputLabel>
            <Select
              value={newUserData.bureau}
              onChange={(e) => setNewUserData(prev => ({ ...prev, bureau: e.target.value }))}
              label="Bureau"
            >
              <MenuItem value="">Select Bureau</MenuItem>
              {organizationData.bureaus.map((bureau) => (
                <MenuItem key={bureau} value={bureau}>{bureau}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Division</InputLabel>
            <Select
              value={newUserData.division}
              onChange={(e) => setNewUserData(prev => ({ ...prev, division: e.target.value }))}
              label="Division"
            >
              <MenuItem value="">Select Division</MenuItem>
              {organizationData.divisions.map((division) => (
                <MenuItem key={division} value={division}>{division}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Section</InputLabel>
            <Select
              value={newUserData.section}
              onChange={(e) => setNewUserData(prev => ({ ...prev, section: e.target.value }))}
              label="Section"
            >
              <MenuItem value="">Select Section</MenuItem>
              {organizationData.sections.map((section) => (
                <MenuItem key={section} value={section}>{section}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={() => setShowNewUserDialog(false)} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleNewUserSubmit}
          variant="contained" 
          color="primary"
          disabled={!newUserData.displayName || !newUserData.username || !newUserData.email}
        >
          Create User
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}