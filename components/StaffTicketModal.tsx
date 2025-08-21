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
  Chip,
  Breadcrumbs
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
  FolderOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface StaffTicketFormData {
  // Request Information
  title: string;
  category: string;
  requestType: string;
  subcategory: string;
  subSubcategory: string;
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
}

interface RequestType {
  value: string;
  text: string;
}

interface Subcategory {
  value: string;
  text: string;
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
    requestType: '',
    subcategory: '',
    subSubcategory: '',
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
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [requestTypes, setRequestTypes] = useState<Record<string, RequestType[]>>({});
  const [subcategories, setSubcategories] = useState<Record<string, Record<string, Subcategory[]>>>({});
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

  // Category browser state
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
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
      const response = await fetch('/api/ticket-data/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        setRequestTypes(data.requestTypes);
        setSubcategories(data.subcategories);
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
      const allUsers: User[] = [];
      
      // Load system users from the current user's team
      if (currentUser?.team_id) {
        try {
          const systemUsersResponse = await fetch(`/api/developer/teams/${currentUser.team_id}/users`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (systemUsersResponse.ok) {
            const systemUserData = await systemUsersResponse.json();
            const filteredSystemUsers = systemUserData.filter((user: User) => user.username && user.active !== false);
            allUsers.push(...filteredSystemUsers);
          }
        } catch (error) {
          console.warn('Failed to load system users:', error);
        }
      }
      
      // Load ticket users (available to all staff who can create tickets)
      try {
        const ticketUsersResponse = await fetch('/api/staff/ticket-users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (ticketUsersResponse.ok) {
          const ticketUsersData = await ticketUsersResponse.json();
          if (ticketUsersData.success && ticketUsersData.users) {
            // Convert ticket user format to User format
            const formattedTicketUsers = ticketUsersData.users.map((ticketUser: any) => ({
              ...ticketUser,
              team_name: ticketUser.section || 'Ticket User', // Show section as team
              active: true
            }));
            allUsers.push(...formattedTicketUsers);
          }
        }
      } catch (error) {
        console.warn('Failed to load ticket users:', error);
      }
      
      // Remove duplicates (prefer system users over ticket users)
      const uniqueUsers = allUsers.reduce((acc: User[], current: User) => {
        const existing = acc.find(user => user.username === current.username);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error loading users:', error);
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

      console.log('💾 Creating new ticket user:', newUserData);
      
      // Create ticket user in database so they can be searched next time
      const token = localStorage.getItem('authToken');
      
      // Map form field names to API field names
      const apiUserData = {
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
        section: newUserData.section
      };
      
      console.log('📤 Sending API data:', apiUserData);
      
      const response = await fetch('/api/staff/ticket-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiUserData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error creating ticket user:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to create ticket user');
        } catch {
          throw new Error(`Failed to create ticket user: ${response.status} ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('✅ Ticket user created:', result);

      // Populate the form with the new user information
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
      
      // Refresh the user list to include the new ticket user
      await loadUsers();
      
      toast({
        title: 'Ticket User Created',
        description: `${newUserData.displayName} has been created as a ticket user and added to the ticket.`
      });

    } catch (error) {
      console.error('Failed to add user information:', error);
      toast({
        title: 'Error Adding User Information',
        description: 'Failed to add user information. Please try again.',
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

  // Get request types for selected category
  const currentRequestTypes = formData.category ? (requestTypes[formData.category] || []) : [];
  
  // Get subcategories for selected request type
  const currentSubcategories = formData.category && formData.requestType 
    ? (subcategories[formData.category]?.[formData.requestType] || [])
    : [];

  // Helper functions to get display names for breadcrumb
  const getCategoryName = (categoryId: string) => categories[categoryId] || '';
  const getRequestTypeName = (categoryId: string, requestTypeId: string) => {
    const requestTypesList = requestTypes[categoryId] || [];
    const requestType = requestTypesList.find(rt => rt.value === requestTypeId);
    return requestType?.text || '';
  };
  const getSubcategoryName = (categoryId: string, requestTypeId: string, subcategoryId: string) => {
    const subcategoriesList = subcategories[categoryId]?.[requestTypeId] || [];
    const subcategory = subcategoriesList.find(sc => sc.value === subcategoryId);
    return subcategory?.text || '';
  };

  // Build breadcrumb path
  const buildCategoryPath = () => {
    const path = [];
    if (formData.category) {
      path.push({ label: getCategoryName(formData.category), level: 'category' });
      if (formData.requestType) {
        path.push({ label: getRequestTypeName(formData.category, formData.requestType), level: 'requestType' });
        if (formData.subcategory) {
          path.push({ label: getSubcategoryName(formData.category, formData.requestType, formData.subcategory), level: 'subcategory' });
          if (formData.subSubcategory) {
            path.push({ label: formData.subSubcategory, level: 'subSubcategory' });
          }
        }
      }
    }
    return path;
  };

  const categoryPath = buildCategoryPath();

  // Filter and score categories based on search term
  const filterCategoriesBySearch = () => {
    if (!categorySearchTerm.trim()) {
      return Object.entries(categories).map(([categoryId, categoryName]) => ({
        categoryId,
        categoryName,
        matchScore: 0,
        matches: []
      }));
    }

    const searchLower = categorySearchTerm.toLowerCase();
    const results = [];

    for (const [categoryId, categoryName] of Object.entries(categories)) {
      let matchScore = 0;
      const matches = [];
      
      // Check if category name matches (highest priority)
      if (categoryName.toLowerCase().includes(searchLower)) {
        matchScore += 100;
        matches.push({ type: 'category', text: categoryName });
      }
      
      // Check request types
      const categoryRequestTypes = requestTypes[categoryId] || [];
      for (const requestType of categoryRequestTypes) {
        if (requestType.text.toLowerCase().includes(searchLower)) {
          matchScore += 50;
          matches.push({ type: 'requestType', text: requestType.text });
        }
        
        // Check subcategories for this request type
        const requestTypeSubcategories = subcategories[categoryId]?.[requestType.value] || [];
        for (const subcategory of requestTypeSubcategories) {
          if (subcategory.text.toLowerCase().includes(searchLower)) {
            matchScore += 25;
            matches.push({ type: 'subcategory', text: subcategory.text, requestType: requestType.text });
          }
        }
      }
      
      // Only include categories that have matches
      if (matchScore > 0) {
        results.push({
          categoryId,
          categoryName,
          matchScore,
          matches
        });
      }
    }

    // Sort by match score (highest first), then by category name
    return results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return a.categoryName.localeCompare(b.categoryName);
    });
  };

  const filteredCategories = filterCategoriesBySearch();

  // Validate form
  const isFormValid = () => {
    return !!(formData.title && 
             formData.category && 
             formData.description && 
             formData.submittedBy);
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
    console.log('🚀 handleSubmit called - Form Data:', formData);
    console.log('✅ Form validation check:', {
      title: !!formData.title,
      category: !!formData.category,
      description: !!formData.description,
      submittedBy: !!formData.submittedBy,
      isValid: isFormValid()
    });
    
    if (!isFormValid()) {
      console.log('❌ Form validation failed');
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    console.log('🔄 Starting ticket creation...');
    setSaving(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission logic
        const token = localStorage.getItem('authToken');
        const payload = {
          ...formData,
          createdByStaff: currentUser?.username,
          submittedDate: new Date().toISOString()
        };
        
        console.log('📤 Sending API request to /api/staff/tickets with payload:', payload);
        
        const response = await fetch('/api/staff/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        console.log('📥 API Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error response:', errorText);
          throw new Error(`Failed to create ticket: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ API Success response:', result);
        
        toast({
          title: 'Success',
          description: `Ticket ${result.ticketId} created successfully`,
        });
        
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('❌ Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Ticket creation process finished, setting saving to false');
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      requestType: '',
      subcategory: '',
      subSubcategory: '',
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

                {/* Category Path Section - Always visible */}
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {categoryPath.length > 0 ? 'Category Path:' : 'Category Selection:'}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FolderOpen className="h-4 w-4" />}
                      sx={{ 
                        fontSize: '0.75rem',
                        py: 0.5,
                        px: 1,
                        minWidth: 'auto',
                        flexShrink: 0 // Prevents button from shrinking
                      }}
                      onClick={() => setShowCategoryBrowser(true)}
                    >
                      Browse Category Paths
                    </Button>
                  </Box>
                  
                  {categoryPath.length > 0 ? (
                    <Box sx={{ flex: 1, minWidth: 0 }}> {/* Allow breadcrumbs to shrink if needed */}
                      <Breadcrumbs separator="→" sx={{ fontSize: '0.875rem' }}>
                        {categoryPath.map((item, index) => (
                          <Chip
                            key={index}
                            label={item.label}
                            size="small"
                            variant="outlined"
                            color={index === categoryPath.length - 1 ? 'primary' : 'default'}
                            sx={{ 
                              height: 'auto',
                              '& .MuiChip-label': { 
                                whiteSpace: 'normal',
                                py: 0.5
                              }
                            }}
                          />
                        ))}
                      </Breadcrumbs>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No category selected. Use the dropdown menus below or browse all available paths.
                    </Typography>
                  )}
                </Paper>
                
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
                      onChange={(e) => {
                        handleFieldChange('category', e.target.value);
                        // Reset dependent fields when category changes
                        setFormData(prev => ({ ...prev, requestType: '', subcategory: '', subSubcategory: '' }));
                      }}
                      label="Category *"
                    >
                      {Object.entries(categories).map(([categoryId, categoryName]) => (
                        <MenuItem key={categoryId} value={categoryId}>
                          {categoryName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Request Type</InputLabel>
                    <Select 
                      value={formData.requestType} 
                      onChange={(e) => {
                        handleFieldChange('requestType', e.target.value);
                        // Reset subcategory when request type changes
                        setFormData(prev => ({ ...prev, subcategory: '', subSubcategory: '' }));
                      }}
                      disabled={!formData.category}
                      label="Request Type"
                    >
                      {currentRequestTypes.map((requestType) => (
                        <MenuItem key={requestType.value} value={requestType.value}>
                          {requestType.text}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Subcategory</InputLabel>
                    <Select 
                      value={formData.subcategory} 
                      onChange={(e) => handleFieldChange('subcategory', e.target.value)}
                      disabled={!formData.requestType}
                      label="Subcategory"
                    >
                      {currentSubcategories.map((subcategory) => (
                        <MenuItem key={subcategory.value} value={subcategory.value}>
                          {subcategory.text}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sub-subcategory</InputLabel>
                    <Select 
                      value={formData.subSubcategory} 
                      onChange={(e) => handleFieldChange('subSubcategory', e.target.value)}
                      disabled={!formData.subcategory}
                      label="Sub-subcategory"
                    >
                      {/* For now, this will be empty until we add implementations to the API */}
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
                                key={user.username}
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
                    <Box sx={{ mb: 3 }}>
                      <Chip 
                        icon={<User className="h-4 w-4" />}
                        label={`${formData.userDisplayName} (${formData.submittedBy})`}
                        variant="outlined"
                        color="primary"
                        sx={{ 
                          height: 'auto',
                          '& .MuiChip-label': { 
                            display: 'block',
                            whiteSpace: 'normal',
                            py: 1
                          }
                        }}
                        onDelete={() => {
                          setFormData(prev => ({
                            ...prev,
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
                            userSection: ''
                          }));
                        }}
                      />
                    </Box>
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

    {/* Category Browser Dialog */}
    <Dialog 
      open={showCategoryBrowser} 
      onClose={() => {
        setShowCategoryBrowser(false);
        setCategorySearchTerm(''); // Clear search when closing
      }} 
      maxWidth="lg" 
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FolderOpen className="h-5 w-5" />
        Browse Category Paths
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Browse and select from all available category paths. Click on any path to apply it to your ticket.
        </Typography>
        
        {/* Search Input */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search categories, request types, or subcategories..."
            value={categorySearchTerm}
            onChange={(e) => setCategorySearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  <Search className="h-4 w-4 text-gray-400" />
                </Box>
              ),
              endAdornment: categorySearchTerm && (
                <Button
                  size="small"
                  onClick={() => setCategorySearchTerm('')}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50'
              }
            }}
          />
          {categorySearchTerm && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Showing results for &quot;{categorySearchTerm}&quot; ({filteredCategories.length} categories found)
            </Typography>
          )}
        </Box>
        
        <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
          {filteredCategories.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No category paths found matching &quot;{categorySearchTerm}&quot;
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try searching for different terms or clear the search to see all categories.
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Quick Actions Section - Show clickable paths for search matches */}
              {categorySearchTerm && (
                <Paper 
                  sx={{ 
                    mb: 3, 
                    p: 2, 
                    bgcolor: 'primary.50',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {filteredCategories.slice(0, 5).map((category) => 
                      category.matches.map((match, matchIndex) => {
                        if (match.type === 'subcategory') {
                          // Find the request type for this subcategory
                          const requestType = requestTypes[category.categoryId]?.find(rt => 
                            subcategories[category.categoryId]?.[rt.value]?.some(sub => sub.text === match.text)
                          );
                          if (requestType) {
                            const subcategory = subcategories[category.categoryId][requestType.value]?.find(sub => sub.text === match.text);
                            return (
                              <Button
                                key={`${category.categoryId}-${matchIndex}`}
                                variant="contained"
                                size="small"
                                fullWidth
                                sx={{ 
                                  justifyContent: 'flex-start',
                                  textTransform: 'none',
                                  fontSize: '0.875rem',
                                  bgcolor: 'primary.main',
                                  transition: 'all 0.2s ease-in-out',
                                  transform: 'translateX(0)',
                                  '&:hover': {
                                    transform: 'translateX(4px)',
                                    bgcolor: 'primary.dark'
                                  }
                                }}
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    category: category.categoryId,
                                    requestType: requestType.value,
                                    subcategory: subcategory?.value || '',
                                    subSubcategory: ''
                                  }));
                                  setShowCategoryBrowser(false);
                                  setCategorySearchTerm('');
                                  toast({
                                    title: 'Category Path Applied',
                                    description: `${category.categoryName} → ${requestType.text} → ${match.text}`,
                                  });
                                }}
                              >
                                🎯 {category.categoryName} → {requestType.text} → <strong>{match.text}</strong>
                              </Button>
                            );
                          }
                        } else if (match.type === 'requestType') {
                          const requestType = requestTypes[category.categoryId]?.find(rt => rt.text === match.text);
                          return (
                            <Button
                              key={`${category.categoryId}-${matchIndex}`}
                              variant="contained"
                              size="small"
                              fullWidth
                              sx={{ 
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                bgcolor: 'primary.main',
                                transition: 'all 0.2s ease-in-out',
                                transform: 'translateX(0)',
                                '&:hover': {
                                  transform: 'translateX(4px)',
                                  bgcolor: 'primary.dark'
                                }
                              }}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  category: category.categoryId,
                                  requestType: requestType?.value || '',
                                  subcategory: '',
                                  subSubcategory: ''
                                }));
                                setShowCategoryBrowser(false);
                                setCategorySearchTerm('');
                                toast({
                                  title: 'Category Path Applied',
                                  description: `${category.categoryName} → ${match.text}`,
                                });
                              }}
                            >
                              🎯 {category.categoryName} → <strong>{match.text}</strong>
                            </Button>
                          );
                        } else if (match.type === 'category') {
                          return (
                            <Button
                              key={`${category.categoryId}-${matchIndex}`}
                              variant="contained"
                              size="small"
                              fullWidth
                              sx={{ 
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                bgcolor: 'primary.main',
                                transition: 'all 0.2s ease-in-out',
                                transform: 'translateX(0)',
                                '&:hover': {
                                  transform: 'translateX(4px)',
                                  bgcolor: 'primary.dark'
                                }
                              }}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  category: category.categoryId,
                                  requestType: '',
                                  subcategory: '',
                                  subSubcategory: ''
                                }));
                                setShowCategoryBrowser(false);
                                setCategorySearchTerm('');
                                toast({
                                  title: 'Category Path Applied',
                                  description: `${match.text}`,
                                });
                              }}
                            >
                              🎯 <strong>{match.text}</strong>
                            </Button>
                          );
                        }
                        return null;
                      })
                    ).flat().filter(Boolean)}
                  </Box>
                  
                  {filteredCategories.length > 5 && (
                    <Typography variant="caption" color="primary.dark" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                      Showing top 5 matches. Scroll down to see all {filteredCategories.length} categories.
                    </Typography>
                  )}
                </Paper>
              )}
              
              {/* Full Category Browser Section */}
              <Typography variant="h6" sx={{ mb: 2, color: categorySearchTerm ? 'text.secondary' : 'primary.main' }}>
                {categorySearchTerm ? 'All Search Results' : 'All Categories'}
              </Typography>
            
            {filteredCategories.map((category) => (
            <Paper key={category.categoryId} sx={{ mb: 2, p: 2, ...(categorySearchTerm && { border: '1px solid', borderColor: 'primary.light' }) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'primary.main' }}>
                  {category.categoryName}
                </Typography>
                {categorySearchTerm && category.matches.length > 0 && (
                  <Chip 
                    size="small" 
                    label={`${category.matches.length} match${category.matches.length > 1 ? 'es' : ''}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              
              {/* Show matches when searching */}
              {categorySearchTerm && category.matches.length > 0 && (
                <Box sx={{ mb: 2, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
                    Matches found:
                  </Typography>
                  {category.matches.map((match, index) => (
                    <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem', color: 'primary.dark' }}>
                      • {match.type === 'category' && 'Category: '}
                      {match.type === 'requestType' && 'Request Type: '}
                      {match.type === 'subcategory' && `Subcategory (${match.requestType}): `}
                      <strong>{match.text}</strong>
                    </Typography>
                  ))}
                </Box>
              )}
              
              {requestTypes[category.categoryId]?.map((requestType) => (
                <Box key={requestType.value} sx={{ ml: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    → {requestType.text}
                  </Typography>
                  
                  {subcategories[category.categoryId]?.[requestType.value]?.map((subcategory) => (
                    <Box key={subcategory.value} sx={{ ml: 4, mb: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{ 
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          fontSize: '0.875rem'
                        }}
                        onClick={() => {
                          // Apply the selected path
                          setFormData(prev => ({
                            ...prev,
                            category: category.categoryId,
                            requestType: requestType.value,
                            subcategory: subcategory.value,
                            subSubcategory: ''
                          }));
                          setShowCategoryBrowser(false);
                          setCategorySearchTerm(''); // Clear search when path applied
                          toast({
                            title: 'Category Path Applied',
                            description: `${category.categoryName} → ${requestType.text} → ${subcategory.text}`,
                          });
                        }}
                      >
                        → → {subcategory.text}
                      </Button>
                    </Box>
                  ))}
                  
                  {!subcategories[category.categoryId]?.[requestType.value] && (
                    <Box sx={{ ml: 4, mb: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{ 
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          fontSize: '0.875rem'
                        }}
                        onClick={() => {
                          // Apply the path without subcategory
                          setFormData(prev => ({
                            ...prev,
                            category: category.categoryId,
                            requestType: requestType.value,
                            subcategory: '',
                            subSubcategory: ''
                          }));
                          setShowCategoryBrowser(false);
                          setCategorySearchTerm(''); // Clear search when path applied
                          toast({
                            title: 'Category Path Applied',
                            description: `${category.categoryName} → ${requestType.text}`,
                          });
                        }}
                      >
                        → → (No subcategories available)
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
              
              {!requestTypes[category.categoryId] && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic' }}>
                  No request types available for this category
                </Typography>
              )}
            </Paper>
            ))}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={() => {
            setShowCategoryBrowser(false);
            setCategorySearchTerm(''); // Clear search when closing
          }} 
          color="inherit"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}