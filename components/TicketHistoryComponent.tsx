'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ArrowRight, AlertTriangle, CheckCircle, UserCheck, Users, Tag, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRegularTime } from '@/lib/time-utils';

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

// Format JSON details into human-readable text
const formatDetailsForDisplay = (details: string): string[] => {
  try {
    const parsed = JSON.parse(details);
    const formatted: string[] = [];
    
    // Handle common fields with user-friendly labels
    const fieldLabels: { [key: string]: string } = {
      'initial_status': 'Initial Status',
      'submission_id': 'Submission ID',
      'previous_status': 'Previous Status',
      'new_status': 'New Status',
      'status': 'Status',
      'assigned_team': 'Assigned Team',
      'priority': 'Priority',
      'category': 'Category',
      'subcategory': 'Subcategory',
      'location': 'Location',
      'office': 'Office',
      'bureau': 'Bureau',
      'division': 'Division',
      'section': 'Section',
      'user_name': 'User Name',
      'employee_number': 'Employee Number',
      'phone_number': 'Phone Number',
      // Staff-created ticket fields
      'created_by_staff': 'Created by Staff Member',
      'ticket_source': 'Ticket Source',
      'original_user': 'Original User',
      'internal_notes': 'Internal Notes',
      'assigned_to': 'Assigned To',
      'from_team': 'From Team',
      'to_team': 'To Team',
      'escalated_to': 'Escalated To',
      'resolved_by': 'Resolved By'
    };
    
    // Convert each field to a readable format
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Format specific field values for better readability
        let displayValue: string;
        if (key === 'ticket_source' && value === 'staff_created') {
          displayValue = 'Staff Created';
        } else if (key === 'priority') {
          displayValue = String(value).charAt(0).toUpperCase() + String(value).slice(1);
        } else if (key === 'status' || key === 'initial_status' || key === 'previous_status' || key === 'new_status') {
          displayValue = String(value).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (key === 'category') {
          // Handle camelCase category names
          displayValue = String(value).replace(/([A-Z])/g, ' $1').replace(/^./, l => l.toUpperCase()).trim();
        } else if (key === 'internal_notes' && value === '') {
          displayValue = '(None)';
        } else if (typeof value === 'boolean') {
          displayValue = value ? 'Yes' : 'No';
        } else if (typeof value === 'string') {
          displayValue = value;
        } else {
          displayValue = JSON.stringify(value);
        }
        
        formatted.push(`${label}: ${displayValue}`);
      }
    });
    
    return formatted;
  } catch (error) {
    // If parsing fails, return the raw details as a single item
    return [details];
  }
};

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
    
    // Check for JSON in to_value or from_value fields and format them
    const formatValue = (value: string | undefined): string => {
      if (!value) return '';
      
      // Check if value looks like JSON
      if (value.startsWith('{') && value.includes('"status":')) {
        try {
          const parsed = JSON.parse(value);
          const formatted = [];
          
          if (parsed.status) {
            formatted.push(`Status: ${parsed.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
          }
          if (parsed.priority) {
            formatted.push(`Priority: ${parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1)}`);
          }
          if (parsed.category) {
            const category = parsed.category.replace(/([A-Z])/g, ' $1').replace(/^./, l => l.toUpperCase()).trim();
            formatted.push(`Category: ${category}`);
          }
          if (parsed.assigned_to_display || parsed.assigned_to) {
            formatted.push(`Assigned: ${parsed.assigned_to_display || parsed.assigned_to}`);
          }
          
          return formatted.length > 0 ? formatted.join(' • ') : value;
        } catch (error) {
          // If parsing fails, return the raw value
          return value;
        }
      }
      
      return value;
    };

    if (entry.from_value && entry.to_value && entry.from_value !== entry.to_value) {
      const fromFormatted = formatValue(entry.from_value);
      const toFormatted = formatValue(entry.to_value);
      details.push(`${fromFormatted} → ${toFormatted}`);
    } else if (entry.to_value && !entry.from_value) {
      details.push(formatValue(entry.to_value));
    }

    if (entry.from_team && entry.to_team && entry.from_team !== entry.to_team) {
      details.push(`Team: ${entry.from_team} → ${entry.to_team}`);
    } else if (entry.to_team && !entry.from_team) {
      details.push(`Team: ${entry.to_team}`);
    }

    // If no basic details were found, try to extract key information from JSON details
    if (details.length === 0 && entry.details && entry.details !== 'null') {
      try {
        const parsed = JSON.parse(entry.details);
        
        // Extract most relevant fields for main description
        const relevantFields = [];
        
        if (parsed.status || parsed.new_status) {
          const status = parsed.new_status || parsed.status;
          relevantFields.push(`Status: ${status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
        }
        
        if (parsed.priority) {
          relevantFields.push(`Priority: ${parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1)}`);
        }
        
        if (parsed.assigned_to) {
          relevantFields.push(`Assigned: ${parsed.assigned_to}`);
        }
        
        if (parsed.assigned_team || parsed.to_team) {
          const team = parsed.to_team || parsed.assigned_team;
          relevantFields.push(`Team: ${team}`);
        }
        
        if (parsed.category) {
          const category = parsed.category.replace(/([A-Z])/g, ' $1').replace(/^./, l => l.toUpperCase()).trim();
          relevantFields.push(`Category: ${category}`);
        }
        
        if (parsed.ticket_source === 'staff_created') {
          relevantFields.push('Created by Staff');
        }
        
        if (relevantFields.length > 0) {
          details.push(relevantFields.join(' • '));
        }
      } catch (error) {
        // If parsing fails, don't add anything to main details
        console.warn('Failed to parse details JSON for main description:', error);
      }
    }

    return details.join(' • ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const absDiffMs = Math.abs(diffMs);
    const diffHours = absDiffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    // Handle negative times (future dates) - this shouldn't happen but fix it gracefully
    const timePrefix = diffMs < 0 ? 'in ' : '';
    const timeSuffix = diffMs < 0 ? '' : ' ago';

    if (diffHours < 1) {
      const diffMins = Math.floor(absDiffMs / (1000 * 60));
      return `${timePrefix}${diffMins} minutes${timeSuffix}`;
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (mins > 0 && hours < 6) {
        // Show minutes for recent times under 6 hours
        return `${timePrefix}${hours}h ${mins}m${timeSuffix}`;
      } else {
        return `${timePrefix}${hours} hour${hours !== 1 ? 's' : ''}${timeSuffix}`;
      }
    } else if (diffDays < 7) {
      const days = Math.floor(diffDays);
      return `${timePrefix}${days} day${days !== 1 ? 's' : ''}${timeSuffix}`;
    } else {
      return formatRegularTime(date, {
        dateFormat: 'short',
        includeSeconds: false
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
    <div onClick={(e) => e.stopPropagation()}>
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
                            <p className="text-xs text-gray-700">
                              {formatActionDetails(entry)}
                            </p>
                          )}
                          
                          {entry.reason && (
                            <p className="text-sm text-gray-700 italic">
                              &ldquo;{entry.reason}&rdquo;
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
                              <div className="mt-1 text-gray-700 space-y-1">
                                {formatDetailsForDisplay(entry.details).map((detail, index) => (
                                  <div key={index} className="flex">
                                    <span className="font-medium mr-1">•</span>
                                    <span>{detail}</span>
                                  </div>
                                ))}
                              </div>
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
    </div>
  );
}