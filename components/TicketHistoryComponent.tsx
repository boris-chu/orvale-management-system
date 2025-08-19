'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ArrowRight, AlertTriangle, CheckCircle, UserCheck, Users, Tag, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoryEntry {
  id: number;
  ticket_id: number;
  action_type: string;
  performed_by: string;
  performed_by_display: string;
  from_value?: string;
  to_value?: string;
  from_team?: string;
  to_team?: string;
  reason?: string;
  details?: string;
  performed_at: string;
  issue_title?: string;
  submission_id?: string;
}

interface TicketHistoryProps {
  ticketId: string;
  isVisible: boolean;
}

export default function TicketHistoryComponent({ ticketId, isVisible }: TicketHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && ticketId) {
      fetchHistory();
    }
  }, [ticketId, isVisible]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tickets/${ticketId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch ticket history');
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching ticket history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Zap className="h-4 w-4" />;
      case 'assigned':
        return <UserCheck className="h-4 w-4" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'status_changed':
        return <ArrowRight className="h-4 w-4" />;
      case 'priority_changed':
        return <Zap className="h-4 w-4" />;
      case 'category_changed':
        return <Tag className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-blue-500';
      case 'assigned':
        return 'bg-green-500';
      case 'escalated':
        return 'bg-red-500';
      case 'completed':
        return 'bg-emerald-500';
      case 'status_changed':
        return 'bg-amber-500';
      case 'priority_changed':
        return 'bg-purple-500';
      case 'category_changed':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatActionTitle = (entry: HistoryEntry) => {
    switch (entry.action_type) {
      case 'created':
        return 'Ticket Created';
      case 'assigned':
        if (entry.from_value === 'unassigned' && entry.to_value && entry.to_value !== 'unassigned') {
          return `Assigned to ${entry.to_value}`;
        } else if (entry.from_value && entry.to_value && entry.from_value !== entry.to_value) {
          return `Reassigned`;
        }
        return 'Assignment Updated';
      case 'escalated':
        return 'Escalated to Helpdesk';
      case 'completed':
        return 'Ticket Completed';
      case 'status_changed':
        return 'Status Updated';
      case 'priority_changed':
        return 'Priority Changed';
      case 'category_changed':
        return 'Category Updated';
      default:
        return entry.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatActionDetails = (entry: HistoryEntry) => {
    const details = [];

    if (entry.from_value && entry.to_value && entry.from_value !== entry.to_value) {
      details.push(`${entry.from_value} → ${entry.to_value}`);
    } else if (entry.to_value && !entry.from_value) {
      details.push(entry.to_value);
    }

    if (entry.from_team && entry.to_team && entry.from_team !== entry.to_team) {
      details.push(`Team: ${entry.from_team} → ${entry.to_team}`);
    } else if (entry.to_team && !entry.from_team) {
      details.push(`Team: ${entry.to_team}`);
    }

    return details.join(' • ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isVisible) return null;

  if (loading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ticket History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ticket History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Error loading history: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Ticket History
          <Badge variant="secondary" className="ml-2">
            {history.length} {history.length === 1 ? 'event' : 'events'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No history events found for this ticket.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <AnimatePresence>
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${getActionColor(entry.action_type)} text-white flex-shrink-0`}>
                    {getActionIcon(entry.action_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {formatActionTitle(entry)}
                        </h4>
                        
                        <div className="mt-1 space-y-1">
                          {formatActionDetails(entry) && (
                            <p className="text-sm text-gray-600 font-mono">
                              {formatActionDetails(entry)}
                            </p>
                          )}
                          
                          {entry.reason && (
                            <p className="text-sm text-gray-700 italic">
                              "{entry.reason}"
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span>{entry.performed_by_display || entry.performed_by}</span>
                          </div>
                        </div>
                        
                        {/* Additional details */}
                        {entry.details && entry.details !== 'null' && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            <details>
                              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                Additional Details
                              </summary>
                              <pre className="mt-1 text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(JSON.parse(entry.details), null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                        {formatTimestamp(entry.performed_at)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}