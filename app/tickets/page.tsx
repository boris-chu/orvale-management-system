'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
// Material-UI imports for working Select components
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, User, Clock, AlertTriangle, Trash2, ArrowUp, Search, Eye, FolderOpen, Building2, Tag } from 'lucide-react';
import { organizationalData } from '../../config/organizational-data';
import { categories } from '../../project-ticket-development/resources/main-categories';
import { requestTypes } from '../../project-ticket-development/resources/request-types';
import { subcategories } from '../../project-ticket-development/resources/ticket-categories';

interface Ticket {
  id: string;
  submission_id: string;
  user_name: string;
  employee_number: string;
  phone_number: string;
  location: string;
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'escalated' | 'deleted';
  assigned_to?: string;
  assigned_team?: string;
  submitted_at: string;
  updated_at: string;
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

  // Check authentication on load
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
        return;
      } catch (error) {
        console.error('Error processing auth data:', error);
      }
    }
    
    // Check existing localStorage
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('currentUser');

    if (!token || !userData) {
      // Redirect to home page for login
      window.location.href = '/';
      return;
    }

    try {
      const user = JSON.parse(userData);
      setCurrentUser(user);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
    }
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
    return new Date(dateString).toLocaleString();
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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      case 'deleted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Update ticket field helper
  const updateTicketField = (field: string, value: string) => {
    if (selectedTicket) {
      setSelectedTicket({
        ...selectedTicket,
        [field]: value
      });
      
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
  const openOrgBrowser = (type: string) => {
    // Create a simple modal/alert for browsing data
    const data = organizationalData[type as keyof typeof organizationalData];
    const selection = prompt(`Select ${type}:\n\n${data.slice(0, 10).join('\n')}\n\n(Showing first 10 items. Type the exact name or cancel)`);
    
    if (selection && data.includes(selection)) {
      const fieldMap: {[key: string]: string} = {
        'offices': 'office',
        'bureaus': 'bureau', 
        'divisions': 'division',
        'sections': 'section'
      };
      updateTicketField(fieldMap[type], selection);
    }
  };

  // Open category data browser
  const openCategoryBrowser = (type: string) => {
    let data: string[] = [];
    let fieldName = '';
    
    switch (type) {
      case 'categories':
        data = Object.values(categories);
        fieldName = 'category';
        break;
      case 'requestTypes':
        if (selectedTicket?.category) {
          const types = requestTypes[selectedTicket.category as keyof typeof requestTypes] || [];
          data = types.map((t: any) => t.text);
          fieldName = 'request_type';
        }
        break;
      case 'subcategories':
        if (selectedTicket?.category && selectedTicket?.request_type) {
          const subcats = subcategories[selectedTicket.category as keyof typeof subcategories]?.[selectedTicket.request_type] || [];
          data = subcats.map((s: any) => s.text);
          fieldName = 'subcategory';
        }
        break;
      case 'implementation':
        data = ['Immediate', 'Scheduled', 'Planned', 'Future'];
        fieldName = 'implementation';
        break;
    }
    
    if (data.length > 0) {
      const selection = prompt(`Select ${type}:\n\n${data.slice(0, 15).join('\n')}\n\n(Showing first 15 items. Type the exact name or cancel)`);
      
      if (selection && data.includes(selection)) {
        // Map display text back to value for categories/types
        if (type === 'categories') {
          const categoryKey = Object.entries(categories).find(([, value]) => value === selection)?.[0];
          if (categoryKey) updateTicketField(fieldName, categoryKey);
        } else if (type === 'requestTypes' && selectedTicket?.category) {
          const typeObj = requestTypes[selectedTicket.category as keyof typeof requestTypes]?.find((t: any) => t.text === selection);
          if (typeObj) updateTicketField(fieldName, typeObj.value);
        } else if (type === 'subcategories' && selectedTicket?.category && selectedTicket?.request_type) {
          const subcatObj = subcategories[selectedTicket.category as keyof typeof subcategories]?.[selectedTicket.request_type]?.find((s: any) => s.text === selection);
          if (subcatObj) updateTicketField(fieldName, subcatObj.value);
        } else {
          updateTicketField(fieldName, selection.toLowerCase());
        }
      }
    } else {
      alert(`No ${type} available. Please select the parent category first.`);
    }
  };

  // Save ticket changes to backend
  const saveTicketChanges = async () => {
    if (!selectedTicket) return;
    
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
        body: JSON.stringify(selectedTicket)
      });
      
      if (response.ok) {
        // Update the ticket in the main list
        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id ? selectedTicket : ticket
        ));
        alert('✅ Ticket updated successfully!');
      } else {
        const error = await response.json();
        alert(`❌ Failed to update ticket: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('❌ Error saving ticket changes');
    }
  };

  // Cycle through status values
  const cycleStatus = () => {
    if (!selectedTicket) return;
    
    const statusOrder = ['pending', 'in_progress', 'completed', 'escalated'];
    const currentIndex = statusOrder.indexOf(selectedTicket.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];
    
    setSelectedTicket(prev => prev ? { ...prev, status: nextStatus } : null);
  };

  // Cycle through priority values  
  const cyclePriority = () => {
    if (!selectedTicket) return;
    
    const priorityOrder = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityOrder.indexOf(selectedTicket.priority);
    const nextIndex = (currentIndex + 1) % priorityOrder.length;
    const nextPriority = priorityOrder[nextIndex];
    
    setSelectedTicket(prev => prev ? { ...prev, priority: nextPriority } : null);
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
              <span className="text-sm opacity-90">Welcome, {currentUser?.display_name}</span>
              <Button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('currentUser');
                  window.location.href = '/';
                }}
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-6 text-sm">
              <span>{queueStats.pending} pending</span>
              <span>•</span>
              <span>{queueStats.assigned} assigned</span>
              <span>•</span>
              <span>{queueStats.today} today</span>
              <span>•</span>
              <span>{queueStats.total} total</span>
            </div>
            <Button
              onClick={loadTickets}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh Now
            </Button>
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
                onClick={() => setSelectedTicket(ticket)}
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
                          <Badge variant="outline">
                            ASSIGNED
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
                      
                      <div className="text-xs text-gray-500">
                        Submitted: {formatDate(ticket.submitted_at)} | TKT:{ticket.submission_id}
                      </div>
                    </div>

                    {/* View Button */}
                    <div className="flex space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        onClick={() => setSelectedTicket(ticket)}
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
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{selectedTicket.issue_title}</h2>
              <div className="flex gap-2">
                <Button onClick={saveTicketChanges} className="bg-blue-600 hover:bg-blue-700 text-white">
                  💾 Save Changes
                </Button>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  ✕ Close
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">Request Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> 
                    <Badge 
                      className={`${getStatusColor(selectedTicket.status)} cursor-pointer hover:opacity-80 ml-2`}
                      onClick={() => cycleStatus()}
                      title="Click to cycle status"
                    >
                      {formatStatus(selectedTicket.status)}
                    </Badge>
                  </div>
                  <div><strong>Priority:</strong> 
                    <Badge 
                      className={`${getPriorityColor(selectedTicket.priority)} cursor-pointer hover:opacity-80 ml-2`}
                      onClick={() => cyclePriority()}
                      title="Click to cycle priority"
                    >
                      {formatPriority(selectedTicket.priority)}
                    </Badge>
                  </div>
                  <div><strong>Submitted:</strong> {formatDate(selectedTicket.submitted_at)}</div>
                  <div><strong>Ticket ID:</strong> {selectedTicket.submission_id}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">User Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedTicket.user_name}</div>
                  <div><strong>Employee #:</strong> {selectedTicket.employee_number}</div>
                  <div><strong>Phone:</strong> {selectedTicket.phone_number}</div>
                  <div><strong>Location:</strong> {selectedTicket.location}</div>
                  <div><strong>Section:</strong> {selectedTicket.section}</div>
                </div>
              </div>
            </div>
            
            {/* Organizational Information Section */}
            <div className="mt-6">
              <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizational Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Office:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1">
                          <InputLabel id="office-select-label">Select Office</InputLabel>
                          <Select
                            labelId="office-select-label"
                            id="office-select"
                            value={selectedTicket.office || ''}
                            label="Select Office"
                            onChange={(e) => updateTicketField('office', e.target.value)}
                          >
                            {organizationalData.offices.map((office, index) => (
                              <MenuItem key={`office-${index}`} value={office}>
                                {office}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openOrgBrowser('offices')}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bureau:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1">
                          <InputLabel id="bureau-select-label">Select Bureau</InputLabel>
                          <Select
                            labelId="bureau-select-label"
                            id="bureau-select"
                            value={selectedTicket.bureau || ''}
                            label="Select Bureau"
                            onChange={(e) => updateTicketField('bureau', e.target.value)}
                          >
                            {organizationalData.bureaus.map((bureau, index) => (
                              <MenuItem key={`bureau-${index}`} value={bureau}>
                                {bureau}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openOrgBrowser('bureaus')}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Division:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1">
                          <InputLabel id="division-select-label">Select Division</InputLabel>
                          <Select
                            labelId="division-select-label"
                            id="division-select"
                            value={selectedTicket.division || ''}
                            label="Select Division"
                            onChange={(e) => updateTicketField('division', e.target.value)}
                          >
                            {organizationalData.divisions.map((division, index) => (
                              <MenuItem key={`division-${index}`} value={division}>
                                {division}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openOrgBrowser('divisions')}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1">
                          <InputLabel id="section-select-label">Select Section</InputLabel>
                          <Select
                            labelId="section-select-label"
                            id="section-select"
                            value={selectedTicket.section || ''}
                            label="Select Section"
                            onChange={(e) => updateTicketField('section', e.target.value)}
                          >
                            {organizationalData.sections.map((section, index) => (
                              <MenuItem key={`section-${index}`} value={section}>
                                {section}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openOrgBrowser('sections')}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Information Section */}
            <div className="mt-6">
              <h3 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Category Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1">
                          <InputLabel id="category-select-label">Select Category</InputLabel>
                          <Select
                            labelId="category-select-label"
                            id="category-select"
                            value={selectedTicket.category || ''}
                            label="Select Category"
                            onChange={(e) => updateTicketField('category', e.target.value)}
                          >
                            {Object.entries(categories).map(([key, value]) => (
                              <MenuItem key={key} value={key}>
                                {value}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openCategoryBrowser('categories')}>
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Request Type:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1" disabled={!selectedTicket.category}>
                          <InputLabel id="request-type-select-label">Select Request Type</InputLabel>
                          <Select
                            labelId="request-type-select-label"
                            id="request-type-select"
                            value={selectedTicket.request_type || ''}
                            label="Select Request Type"
                            onChange={(e) => updateTicketField('request_type', e.target.value)}
                            disabled={!selectedTicket.category}
                          >
                            {selectedTicket.category && requestTypes[selectedTicket.category as keyof typeof requestTypes]?.map((type: any) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.text}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openCategoryBrowser('requestTypes')} disabled={!selectedTicket.category}>
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1" disabled={!selectedTicket.request_type}>
                          <InputLabel id="subcategory-select-label">Select Subcategory</InputLabel>
                          <Select
                            labelId="subcategory-select-label"
                            id="subcategory-select"
                            value={selectedTicket.subcategory || ''}
                            label="Select Subcategory"
                            onChange={(e) => updateTicketField('subcategory', e.target.value)}
                            disabled={!selectedTicket.request_type}
                          >
                            {selectedTicket.category && selectedTicket.request_type && 
                             subcategories[selectedTicket.category as keyof typeof subcategories]?.[selectedTicket.request_type as string]?.map((subcat: any) => (
                              <MenuItem key={subcat.value} value={subcat.value}>
                                {subcat.text}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openCategoryBrowser('subcategories')} disabled={!selectedTicket.request_type}>
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Implementation:</label>
                      <div className="flex gap-2">
                        <FormControl size="small" className="flex-1">
                          <InputLabel id="implementation-select-label">Select Implementation</InputLabel>
                          <Select
                            labelId="implementation-select-label"
                            id="implementation-select"
                            value={selectedTicket.implementation || ''}
                            label="Select Implementation"
                            onChange={(e) => updateTicketField('implementation', e.target.value)}
                          >
                            <MenuItem value="immediate">Immediate</MenuItem>
                            <MenuItem value="scheduled">Scheduled</MenuItem>
                            <MenuItem value="planned">Planned</MenuItem>
                            <MenuItem value="future">Future</MenuItem>
                          </Select>
                        </FormControl>
                        <Button size="sm" variant="outline" onClick={() => openCategoryBrowser('implementation')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
          </div>
        </div>
      )}
    </div>
  );
}