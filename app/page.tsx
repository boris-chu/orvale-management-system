'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogIn, Ticket, Users, Search, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MaterialUILoginModal from '@/components/MaterialUILoginModal';


export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [ticketStatus, setTicketStatus] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      window.location.href = '/tickets';
    }
  }, []);

  // Track ticket by confirmation number
  const trackTicket = async () => {
    if (!ticketNumber.trim()) {
      setTrackingError('Please enter a ticket number');
      return;
    }

    setTrackingLoading(true);
    setTrackingError('');
    setTicketStatus(null);

    try {
      // Public API endpoint to get ticket status (no auth required)
      const response = await fetch(`/api/public/ticket-status/${ticketNumber.trim()}`);
      
      if (response.ok) {
        const data = await response.json();
        setTicketStatus(data.ticket);
      } else if (response.status === 404) {
        setTrackingError('Ticket not found. Please check your confirmation number.');
      } else {
        setTrackingError('Unable to retrieve ticket status. Please try again.');
      }
    } catch (error) {
      setTrackingError('Network error. Please check your connection.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const formatTeamName = (teamId: string) => {
    const teamNameMap: { [key: string]: string } = {
      'ITTS_Region7': 'ITTS: Region 7',
      'ITTS_Region1': 'ITTS: Region 1',
      'ITTS_Region2': 'ITTS: Region 2',
      'ITTS_Region3': 'ITTS: Region 3',
      'ITTS_Region4': 'ITTS: Region 4',
      'ITTS_Region5': 'ITTS: Region 5',
      'ITTS_Region6': 'ITTS: Region 6',
      'ITTS_Region8': 'ITTS: Region 8',
      'NET_North': 'Network: North',
      'NET_South': 'Network: South',
      'NET_Central': 'Network: Central',
      'DEV_Alpha': 'Development: Alpha Team',
      'DEV_Beta': 'Development: Beta Team',
      'SEC_Core': 'Security: Core Team',
      'SEC_Perimeter': 'Security: Perimeter Team'
    };
    
    return teamNameMap[teamId] || teamId;
  };

  // Listen for Ctrl+T to open login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setShowLogin(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <Ticket className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Orvale Management System
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            IT Support Portal
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Submit IT support requests and track their progress through our unified management system.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ticket className="h-5 w-5 text-blue-600" />
                <span>Submit Tickets</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Easily submit IT support requests with detailed information and automatic routing.
              </p>
              <div className="mt-4">
                <Button 
                  onClick={() => window.location.href = '/public-portal'}
                  className="w-full"
                >
                  Submit Request
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-green-600" />
                <span>Track Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Enter your confirmation number to check the status of your request.
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. R7-250818-001"
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && trackTicket()}
                    disabled={trackingLoading}
                  />
                  <Button
                    onClick={trackTicket}
                    disabled={trackingLoading || !ticketNumber.trim()}
                    size="sm"
                  >
                    {trackingLoading ? '...' : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {trackingError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {trackingError}
                  </div>
                )}

                {ticketStatus && (
                  <div className="bg-gray-50 p-3 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge className={getStatusColor(ticketStatus.status)}>
                        {formatStatus(ticketStatus.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div><strong>Issue:</strong> {ticketStatus.issue_title}</div>
                      <div><strong>Submitted:</strong> {new Date(ticketStatus.submitted_at).toLocaleDateString()}</div>
                      {ticketStatus.assigned_team && (
                        <div><strong>Team:</strong> {formatTeamName(ticketStatus.assigned_team)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LogIn className="h-5 w-5 text-purple-600" />
                <span>IT Staff Access</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                IT staff can access the queue management system to handle and resolve tickets.
              </p>
              <div className="mt-4">
                <Button 
                  onClick={() => setShowLogin(true)}
                  className="w-full"
                >
                  Access Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Orvale Management System. All rights reserved.</p>
            <p className="mt-2">Created by Boris Chu - ITSD Region 7</p>
          </div>
        </div>
      </footer>

      <MaterialUILoginModal 
        open={showLogin} 
        onClose={() => setShowLogin(false)}
        mode="regular"
        title="Staff Login"
        description="Access the ticket management system"
      />
    </div>
  );
}