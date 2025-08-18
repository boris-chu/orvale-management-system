'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Load tickets
  const loadTickets = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        status: activeTab === 'all' ? '' : activeTab,
        limit: '50',
        sort: 'submitted_at',
        order: 'DESC'
      });

      const response = await fetch(`/api/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Calculate stats
        const stats = data.status_counts || {};
        const today = new Date().toDateString();
        const todayCount = (data.tickets || []).filter((ticket: Ticket) => 
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
  }, [currentUser, activeTab]);

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
      case 'escalated': return 'bg-red-100 text-red-800';
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
            <Select value={filters.queue} onValueChange={(value) => setFilters({...filters, queue: value})}>
              <SelectTrigger className="w-48">
                <User className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my_tickets">My Tickets</SelectItem>
                <SelectItem value="team_tickets">Team Tickets</SelectItem>
                <SelectItem value="all_tickets">All Tickets</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
              <SelectTrigger className="w-48">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sort} onValueChange={(value) => setFilters({...filters, sort: value})}>
              <SelectTrigger className="w-48">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest_first">Newest First</SelectItem>
                <SelectItem value="oldest_first">Oldest First</SelectItem>
                <SelectItem value="priority_high">Priority: High to Low</SelectItem>
                <SelectItem value="priority_low">Priority: Low to High</SelectItem>
              </SelectContent>
            </Select>
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
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white rounded-t-lg"
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

                    {/* Action Buttons */}
                    <div className="flex space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {ticket.status === 'pending' || ticket.status === 'assigned' ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleTicketAction(ticket.id, 'complete', { completion_notes: 'Completed via queue' })}
                          >
                            ✓ Complete
                          </Button>
                          <Button
                            size="sm"
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                            onClick={() => handleTicketAction(ticket.id, 'escalate', { escalation_reason: 'Escalated from queue' })}
                          >
                            <ArrowUp className="h-4 w-4 mr-1" />
                            Escalate
                          </Button>
                        </>
                      ) : null}
                      
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
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                ✕ Close
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">Request Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> <Badge className={getStatusColor(selectedTicket.status)}>{selectedTicket.status}</Badge></div>
                  <div><strong>Priority:</strong> <Badge className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge></div>
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
                        <Select value={selectedTicket.office || ''} onValueChange={(value) => updateTicketField('office', value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Office..." />
                          </SelectTrigger>
                          <SelectContent>
                            {organizationalData.offices.map((office, index) => (
                              <SelectItem key={`office-${index}`} value={office}>
                                {office}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => openOrgBrowser('offices')}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bureau:</label>
                      <div className="flex gap-2">
                        <Select value={selectedTicket.bureau || ''} onValueChange={(value) => updateTicketField('bureau', value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Bureau..." />
                          </SelectTrigger>
                          <SelectContent>
                            {organizationalData.bureaus.map((bureau, index) => (
                              <SelectItem key={`bureau-${index}`} value={bureau}>
                                {bureau}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select value={selectedTicket.division || ''} onValueChange={(value) => updateTicketField('division', value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Division..." />
                          </SelectTrigger>
                          <SelectContent>
                            {organizationalData.divisions.map((division, index) => (
                              <SelectItem key={`division-${index}`} value={division}>
                                {division}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => openOrgBrowser('divisions')}>
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section:</label>
                      <div className="flex gap-2">
                        <Select value={selectedTicket.section || ''} onValueChange={(value) => updateTicketField('section', value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Section..." />
                          </SelectTrigger>
                          <SelectContent>
                            {organizationalData.sections.map((section, index) => (
                              <SelectItem key={`section-${index}`} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select value={selectedTicket.category || ''} onValueChange={(value) => updateTicketField('category', value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categories).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => openCategoryBrowser('categories')}>
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Request Type:</label>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedTicket.request_type || ''} 
                          onValueChange={(value) => updateTicketField('request_type', value)}
                          disabled={!selectedTicket.category}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Request Type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTicket.category && requestTypes[selectedTicket.category as keyof typeof requestTypes]?.map((type: any) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select 
                          value={selectedTicket.subcategory || ''} 
                          onValueChange={(value) => updateTicketField('subcategory', value)}
                          disabled={!selectedTicket.request_type}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Subcategory..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTicket.category && selectedTicket.request_type && 
                             subcategories[selectedTicket.category as keyof typeof subcategories]?.[selectedTicket.request_type as string]?.map((subcat: any) => (
                              <SelectItem key={subcat.value} value={subcat.value}>
                                {subcat.text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => openCategoryBrowser('subcategories')} disabled={!selectedTicket.request_type}>
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Implementation:</label>
                      <div className="flex gap-2">
                        <Select value={selectedTicket.implementation || ''} onValueChange={(value) => updateTicketField('implementation', value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select Implementation..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="future">Future</SelectItem>
                          </SelectContent>
                        </Select>
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