import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

// Get ticket history
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ticketId = params.id;
        
        // Get ticket history with detailed information
        const history = await queryAsync(`
            SELECT 
                th.*,
                ut.issue_title,
                ut.submission_id
            FROM ticket_history th
            JOIN user_tickets ut ON th.ticket_id = ut.id
            WHERE th.ticket_id = ?
            ORDER BY th.performed_at DESC
        `, [ticketId]);

        return NextResponse.json({
            success: true,
            history: history
        });

    } catch (error) {
        console.error('❌ Error fetching ticket history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Add history entry
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ticketId = params.id;
        const {
            action_type,
            from_value,
            to_value,
            from_team,
            to_team,
            reason,
            details
        } = await request.json();

        // Insert history entry
        await queryAsync(`
            INSERT INTO ticket_history (
                ticket_id, action_type, performed_by, performed_by_display,
                from_value, to_value, from_team, to_team, reason, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ticketId,
            action_type,
            authResult.user.username,
            authResult.user.display_name,
            from_value,
            to_value,
            from_team,
            to_team,
            reason,
            JSON.stringify(details)
        ]);

        return NextResponse.json({
            success: true,
            message: 'History entry added'
        });

    } catch (error) {
        console.error('❌ Error adding ticket history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}