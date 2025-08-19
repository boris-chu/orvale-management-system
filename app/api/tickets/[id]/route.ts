import { NextRequest, NextResponse } from 'next/server';
import { queryAsync, runAsync } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

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
            user.username,
            user.display_name,
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

// Middleware to verify authentication
async function authenticateRequest(request: NextRequest) {
    console.log('🔍 Authenticating request...');
    const authHeader = request.headers.get('authorization');
    console.log('📋 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Invalid auth header format');
        return null;
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token length:', token.length);
    
    const decoded = verifyToken(token);
    console.log('🔓 Token decoded:', decoded ? 'Success' : 'Failed');
    
    return decoded;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await authenticateRequest(request);
        if (!user) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        const { id: ticketId } = await params;
        const tickets = await queryAsync('SELECT * FROM user_tickets WHERE id = ?', [ticketId]);
        
        if (tickets.length === 0) {
            return NextResponse.json({
                error: 'Not found',
                message: 'Ticket not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            ticket: tickets[0]
        });

    } catch (error) {
        console.error('❌ Error fetching ticket:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'An error occurred while fetching the ticket'
        }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: ticketId } = await params;
        console.log('🚀 PUT request received for ticket:', ticketId);
        
        const user = await authenticateRequest(request);
        if (!user) {
            console.log('❌ Authentication failed');
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', user.username);

        const body = await request.json();
        console.log('📄 Request body:', JSON.stringify(body, null, 2));
        
        // Get current ticket state for history tracking
        const currentTickets = await queryAsync('SELECT * FROM user_tickets WHERE id = ?', [ticketId]);
        if (currentTickets.length === 0) {
            return NextResponse.json({
                error: 'Not found',
                message: 'Ticket not found'
            }, { status: 404 });
        }
        const currentTicket = currentTickets[0];
        
        // Extract updateable fields
        const {
            status,
            priority,
            assigned_to,
            assigned_team,
            office,
            bureau,
            division,
            section,
            category,
            request_type,
            subcategory,
            sub_subcategory,
            implementation,
            completion_notes,
            escalation_reason,
            escalated_at,
            completed_at
        } = body;

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];

        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        if (priority !== undefined) {
            updateFields.push('priority = ?');
            updateValues.push(priority);
        }
        if (assigned_to !== undefined) {
            updateFields.push('assigned_to = ?');
            updateValues.push(assigned_to);
        }
        if (assigned_team !== undefined) {
            updateFields.push('assigned_team = ?');
            updateValues.push(assigned_team);
        }
        if (office !== undefined) {
            updateFields.push('office = ?');
            updateValues.push(office);
        }
        if (bureau !== undefined) {
            updateFields.push('bureau = ?');
            updateValues.push(bureau);
        }
        if (division !== undefined) {
            updateFields.push('division = ?');
            updateValues.push(division);
        }
        if (section !== undefined) {
            updateFields.push('section = ?');
            updateValues.push(section);
        }
        if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category);
        }
        if (request_type !== undefined) {
            updateFields.push('request_type = ?');
            updateValues.push(request_type);
        }
        if (subcategory !== undefined) {
            updateFields.push('subcategory = ?');
            updateValues.push(subcategory);
        }
        if (sub_subcategory !== undefined) {
            updateFields.push('sub_subcategory = ?');
            updateValues.push(sub_subcategory);
        }
        if (implementation !== undefined) {
            updateFields.push('implementation = ?');
            updateValues.push(implementation);
        }
        if (completion_notes !== undefined) {
            updateFields.push('completion_notes = ?');
            updateValues.push(completion_notes);
        }
        if (escalation_reason !== undefined) {
            updateFields.push('escalation_reason = ?');
            updateValues.push(escalation_reason);
        }
        if (escalated_at !== undefined) {
            updateFields.push('escalated_at = ?');
            updateValues.push(escalated_at);
        }
        if (completed_at !== undefined) {
            updateFields.push('completed_at = ?');
            updateValues.push(completed_at);
        }
        
        // If status is being set to completed, also set completed_by
        if (status === 'completed') {
            updateFields.push('completed_by = ?');
            updateValues.push(user.username);
        }

        // Always update the updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        if (updateFields.length === 1) { // Only timestamp update
            return NextResponse.json({
                error: 'Bad request',
                message: 'No fields to update'
            }, { status: 400 });
        }

        // Add ticket ID for WHERE clause
        updateValues.push(ticketId);

        const sql = `UPDATE user_tickets SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('🗃️ SQL Query:', sql);
        console.log('📊 SQL Values:', updateValues);
        
        const result = await runAsync(sql, updateValues);
        console.log('📈 SQL Result:', result);

        if (result.changes === 0) {
            console.log('⚠️ No rows updated - ticket not found or no changes');
            return NextResponse.json({
                error: 'Not found',
                message: 'Ticket not found or no changes made'
            }, { status: 404 });
        }

        // Track history for significant changes
        const historyPromises = [];

        // Status change history
        if (status !== undefined && status !== currentTicket.status) {
            if (status === 'escalated') {
                historyPromises.push(
                    addHistoryEntry(
                        ticketId,
                        'escalated',
                        user,
                        currentTicket.status,
                        status,
                        currentTicket.assigned_team,
                        'HELPDESK',
                        escalation_reason || 'Escalated to Helpdesk team',
                        { escalated_at: escalated_at }
                    )
                );
            } else if (status === 'completed') {
                historyPromises.push(
                    addHistoryEntry(
                        ticketId,
                        'completed',
                        user,
                        currentTicket.status,
                        status,
                        null,
                        null,
                        'Ticket marked as completed',
                        { completed_at: new Date().toISOString(), completion_notes }
                    )
                );
            } else {
                historyPromises.push(
                    addHistoryEntry(
                        ticketId,
                        'status_changed',
                        user,
                        currentTicket.status,
                        status,
                        null,
                        null,
                        `Status changed from ${currentTicket.status} to ${status}`
                    )
                );
            }
        }

        // Assignment change history
        if ((assigned_to !== undefined && assigned_to !== currentTicket.assigned_to) ||
            (assigned_team !== undefined && assigned_team !== currentTicket.assigned_team)) {
            
            const fromAssignee = currentTicket.assigned_to || 'unassigned';
            const toAssignee = assigned_to !== undefined ? assigned_to : currentTicket.assigned_to;
            const fromTeam = currentTicket.assigned_team || 'UNASSIGNED';
            const toTeam = assigned_team !== undefined ? assigned_team : currentTicket.assigned_team;
            
            let reason = 'Assignment updated';
            if (toAssignee && !fromAssignee) {
                reason = `Assigned to ${toAssignee}`;
            } else if (fromAssignee && !toAssignee) {
                reason = `Unassigned from ${fromAssignee}`;
            } else if (fromAssignee !== toAssignee) {
                reason = `Reassigned from ${fromAssignee} to ${toAssignee}`;
            }
            
            if (fromTeam !== toTeam) {
                reason += ` (team: ${fromTeam} → ${toTeam})`;
            }
            
            historyPromises.push(
                addHistoryEntry(
                    ticketId,
                    'assigned',
                    user,
                    fromAssignee,
                    toAssignee || 'unassigned',
                    fromTeam,
                    toTeam,
                    reason,
                    { team_changed: fromTeam !== toTeam }
                )
            );
        }

        // Priority change history
        if (priority !== undefined && priority !== currentTicket.priority) {
            historyPromises.push(
                addHistoryEntry(
                    ticketId,
                    'priority_changed',
                    user,
                    currentTicket.priority,
                    priority,
                    null,
                    null,
                    `Priority changed from ${currentTicket.priority} to ${priority}`
                )
            );
        }

        // Category/classification change history
        if ((category !== undefined && category !== currentTicket.category) ||
            (request_type !== undefined && request_type !== currentTicket.request_type) ||
            (subcategory !== undefined && subcategory !== currentTicket.subcategory)) {
            
            const changes = [];
            if (category !== undefined && category !== currentTicket.category) {
                changes.push(`category: ${currentTicket.category} → ${category}`);
            }
            if (request_type !== undefined && request_type !== currentTicket.request_type) {
                changes.push(`type: ${currentTicket.request_type} → ${request_type}`);
            }
            if (subcategory !== undefined && subcategory !== currentTicket.subcategory) {
                changes.push(`subcategory: ${currentTicket.subcategory} → ${subcategory}`);
            }
            
            historyPromises.push(
                addHistoryEntry(
                    ticketId,
                    'category_changed',
                    user,
                    null,
                    null,
                    null,
                    null,
                    `Classification updated: ${changes.join(', ')}`,
                    { category, request_type, subcategory }
                )
            );
        }

        // Wait for all history entries to complete (but don't fail the request if they fail)
        await Promise.allSettled(historyPromises);

        // Log the update action
        console.log(`✅ Ticket ${ticketId} updated by ${user.username}`);

        return NextResponse.json({
            success: true,
            message: 'Ticket updated successfully',
            changes: result.changes
        });

    } catch (error) {
        console.error('❌ Error updating ticket:', error);
        console.error('❌ Error stack:', error.stack);
        return NextResponse.json({
            error: 'Server error',
            message: `An error occurred while updating the ticket: ${error.message}`
        }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await authenticateRequest(request);
        if (!user) {
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            }, { status: 401 });
        }

        const { id: ticketId } = await params;
        
        // Check if user has permission to delete tickets
        // For now, only allow deletion by assigned user or admin
        const tickets = await queryAsync('SELECT * FROM user_tickets WHERE id = ?', [ticketId]);
        
        if (tickets.length === 0) {
            return NextResponse.json({
                error: 'Not found',
                message: 'Ticket not found'
            }, { status: 404 });
        }

        const ticket = tickets[0];
        
        // Basic permission check
        if (user.role !== 'admin' && ticket.assigned_to !== user.username) {
            return NextResponse.json({
                error: 'Forbidden',
                message: 'You do not have permission to delete this ticket'
            }, { status: 403 });
        }

        const result = await runAsync('DELETE FROM user_tickets WHERE id = ?', [ticketId]);

        if (result.changes === 0) {
            return NextResponse.json({
                error: 'Not found',
                message: 'Ticket not found'
            }, { status: 404 });
        }

        console.log(`🗑️ Ticket ${ticketId} deleted by ${user.username}`);

        return NextResponse.json({
            success: true,
            message: 'Ticket deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting ticket:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'An error occurred while deleting the ticket'
        }, { status: 500 });
    }
}