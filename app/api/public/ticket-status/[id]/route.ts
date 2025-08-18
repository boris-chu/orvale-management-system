import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ticketId = params.id;
        console.log('🔍 Public ticket lookup:', ticketId);
        
        // Query ticket by submission_id (confirmation number)
        const tickets = await queryAsync(
            'SELECT submission_id, issue_title, status, submitted_at, assigned_team FROM user_tickets WHERE submission_id = ?', 
            [ticketId]
        );
        
        if (tickets.length === 0) {
            return NextResponse.json({
                error: 'Ticket not found',
                message: 'No ticket found with this confirmation number'
            }, { status: 404 });
        }

        const ticket = tickets[0];
        
        // Return limited public information (no sensitive data)
        return NextResponse.json({
            success: true,
            ticket: {
                submission_id: ticket.submission_id,
                issue_title: ticket.issue_title,
                status: ticket.status,
                submitted_at: ticket.submitted_at,
                assigned_team: ticket.assigned_team
            }
        });

    } catch (error) {
        console.error('❌ Error in public ticket lookup:', error);
        return NextResponse.json({
            error: 'Server error',
            message: 'An error occurred while looking up the ticket'
        }, { status: 500 });
    }
}