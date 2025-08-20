import { NextRequest, NextResponse } from 'next/server';
import { queryAsync, runAsync } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import { generateTicketNumber } from '@/lib/ticket-numbering';
import { ticketLogger, apiLogger } from '@/lib/logger';

// Helper function to add history entry
async function addHistoryEntry(ticketId: string, actionType: string, user: any, fromValue?: string, toValue?: string, fromTeam?: string, toTeam?: string, reason?: string, details?: any) {
    try {
        await runAsync(`
            INSERT INTO ticket_history (
                ticket_id, action_type, performed_by, performed_by_display,
                from_value, to_value, from_team, to_team, reason, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ticketId,
            actionType,
            user.username || user.submitted_by || 'system',
            user.display_name || user.submitted_by || 'System User',
            fromValue,
            toValue,
            fromTeam,
            toTeam,
            reason,
            details ? JSON.stringify(details) : null
        ]);
    } catch (error) {
        console.error('Warning: Failed to add history entry:', error);
    }
}

// Middleware to verify authentication with permissions
async function authenticateRequest(request: NextRequest) {
    const authResult = await verifyAuth(request);
    return authResult.success ? authResult.user : null;
}

export async function GET(request: NextRequest) {
    try {
        const user = await authenticateRequest(request);
        if (!user) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || '';
        const queue = searchParams.get('queue') || 'team_tickets';
        const priority = searchParams.get('priority') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        // Filter by status if specified
        if (status && status !== 'all') {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Filter by priority if specified
        if (priority && priority !== 'all') {
            whereClause += ' AND priority = ?';
            params.push(priority);
        }

        // Queue filtering logic
        if (user.role !== 'admin') {
            const canManageEscalated = user.permissions?.includes('ticket.manage_escalated') || false;
            
            if (queue === 'my_tickets') {
                if (canManageEscalated) {
                    // Users who can manage escalated tickets see their assigned tickets AND escalated tickets
                    whereClause += ' AND (assigned_to = ? OR status = \'escalated\')';
                    params.push(user.username);
                } else {
                    whereClause += ' AND assigned_to = ?';
                    params.push(user.username);
                }
            } else if (queue === 'team_tickets') {
                if (canManageEscalated) {
                    // Include escalated tickets for users who can manage them
                    whereClause += ' AND (assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL) OR status = \'escalated\')';
                    params.push(user.team_id);
                } else {
                    whereClause += ' AND (assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL))';
                    params.push(user.team_id);
                }
            }
            // For 'all_tickets', add basic team filtering for non-admin users
            else if (queue === 'all_tickets') {
                if (canManageEscalated) {
                    whereClause += ' AND (assigned_to = ? OR assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL) OR status = \'escalated\')';
                    params.push(user.username, user.team_id);
                } else {
                    whereClause += ' AND (assigned_to = ? OR assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL))';
                    params.push(user.username, user.team_id);
                }
            }
        }
        // Admin users see everything regardless of queue setting

        const sql = `
            SELECT * FROM user_tickets 
            ${whereClause}
            ORDER BY submitted_at DESC
            LIMIT ?
        `;
        params.push(limit);

        const tickets = await queryAsync(sql, params);

        // Get status counts - use same filtering logic as main query
        let countWhereClause = 'WHERE 1=1';
        const countParams: any[] = [];
        
        if (user.role !== 'admin') {
            const canManageEscalated = user.permissions?.includes('ticket.manage_escalated') || false;
            
            if (queue === 'my_tickets') {
                if (canManageEscalated) {
                    countWhereClause += ' AND (assigned_to = ? OR status = \'escalated\')';
                    countParams.push(user.username);
                } else {
                    countWhereClause += ' AND assigned_to = ?';
                    countParams.push(user.username);
                }
            } else if (queue === 'team_tickets') {
                if (canManageEscalated) {
                    countWhereClause += ' AND (assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL) OR status = \'escalated\')';
                    countParams.push(user.team_id);
                } else {
                    countWhereClause += ' AND (assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL))';
                    countParams.push(user.team_id);
                }
            } else if (queue === 'all_tickets') {
                if (canManageEscalated) {
                    countWhereClause += ' AND (assigned_to = ? OR assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL) OR status = \'escalated\')';
                    countParams.push(user.username, user.team_id);
                } else {
                    countWhereClause += ' AND (assigned_to = ? OR assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL))';
                    countParams.push(user.username, user.team_id);
                }
            }
        }
        
        const statusCounts = await queryAsync(`
            SELECT status, COUNT(*) as count 
            FROM user_tickets 
            ${countWhereClause}
            GROUP BY status
        `, countParams);

        const counts: any = {};
        statusCounts.forEach((row: any) => {
            counts[row.status] = row.count;
        });

        return NextResponse.json({
            success: true,
            tickets,
            status_counts: counts,
            pagination: {
                total: tickets.length,
                limit,
                page: 1
            }
        });

    } catch (error) {
        console.error('❌ Error fetching tickets:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'An error occurred while fetching tickets'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const {
            user_name,
            employee_number,
            phone_number,
            location,
            cubicle_room,
            section,
            teleworking,
            request_creator_display_name,
            issue_title,
            issue_description,
            computer_info,
            priority = 'medium',
            assigned_team = 'ITTS_Region7',
            email_recipient = 'itts@orvale.gov',
            email_recipient_display = 'ITTS: Region 7'
        } = body;

        // Generate team-based ticket number
        const submissionId = await generateTicketNumber(assigned_team);

        const result = await runAsync(`
            INSERT INTO user_tickets (
                submission_id, user_name, employee_number, phone_number, location, cubicle_room, section,
                teleworking, request_creator_display_name,
                issue_title, issue_description, computer_info, priority, status,
                assigned_team, email_recipient, email_recipient_display, original_submitting_team
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `, [
            submissionId, user_name, employee_number, phone_number, location, cubicle_room, section,
            teleworking, request_creator_display_name,
            issue_title, issue_description, JSON.stringify(computer_info), priority,
            assigned_team, email_recipient, email_recipient_display, assigned_team
        ]);

        // Add initial history entry
        await addHistoryEntry(
            result.lastID.toString(),
            'created',
            { submitted_by: request_creator_display_name || user_name, display_name: request_creator_display_name || user_name },
            null,
            'pending',
            null,
            assigned_team || 'UNASSIGNED',
            `Ticket created and assigned to ${assigned_team}`,
            {
                submission_id: submissionId,
                issue_title,
                priority,
                initial_assignment: assigned_team
            }
        );

        // Log ticket creation
        ticketLogger.created(submissionId, request_creator_display_name || user_name, assigned_team);

        return NextResponse.json({
            success: true,
            message: 'Ticket submitted successfully',
            ticket_id: submissionId,
            id: result.lastID
        });

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'An error occurred while creating the ticket'
        }, { status: 500 });
    }
}