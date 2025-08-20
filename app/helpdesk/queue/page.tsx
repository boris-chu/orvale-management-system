'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/UserAvatar';
import { formatRegularTime } from '@/lib/time-utils';

interface Ticket {
  id: string;
  submission_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'escalated' | 'deleted';
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_team?: string;
  assigned_team_name?: string;
  assigned_team_label?: string;
  submitted_by: string;
  submitted_by_name?: string;
  submitted_at: string;
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

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadSummaryData();
    }
  }, [currentUser]);

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

  const filterTickets = (tickets: Ticket[]) => {
    return tickets.filter(ticket => 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.submission_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.submitted_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
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
          </div>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
            {ticket.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {ticket.description}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{ticket.submitted_by_name || ticket.submitted_by}</span>
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

  const currentTickets = activeMainTab === 'escalated' 
    ? escalatedTickets 
    : teamTickets[activeMainTab]?.[activeTeamTabs[activeMainTab] || 'pending'] || [];

  const filteredTickets = filterTickets(currentTickets);

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
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              <Button 
                variant="ghost"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
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
                <TabsList className="h-12 overflow-x-auto min-w-0 flex-1 justify-start">
                  {/* ESCALATED Tab */}
                  <TabsTrigger 
                    value="escalated" 
                    className="flex items-center space-x-2 px-4 data-[state=active]:bg-red-100 data-[state=active]:text-red-800"
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
                      className="flex items-center space-x-2 px-4"
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
                    <h3 className="text-lg font-medium">Escalated Tickets</h3>
                    <span className="text-sm text-gray-500">
                      {filteredTickets.length} of {escalatedTickets.length} tickets
                    </span>
                  </div>
                  
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No escalated tickets found.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} />
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
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="pending" className="flex items-center space-x-2">
                          <span>Pending</span>
                          {team.statusCounts.pending > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {team.statusCounts.pending}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="flex items-center space-x-2">
                          <span>In Progress</span>
                          {team.statusCounts.in_progress > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {team.statusCounts.in_progress}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="flex items-center space-x-2">
                          <span>Completed</span>
                          {team.statusCounts.completed > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {team.statusCounts.completed}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="escalated" className="flex items-center space-x-2">
                          <span>Escalated</span>
                          {team.statusCounts.escalated > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {team.statusCounts.escalated}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="deleted" className="flex items-center space-x-2">
                          <span>Deleted</span>
                          {team.statusCounts.deleted > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {team.statusCounts.deleted}
                            </Badge>
                          )}
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
                                <TicketCard key={ticket.id} ticket={ticket} />
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
    </div>
  );
}