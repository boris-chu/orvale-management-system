import { NextRequest, NextResponse } from 'next/server';
import { queryAsync, runAsync } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

// Middleware to verify authentication
async function authenticateRequest(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    return decoded;
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
        const limit = parseInt(searchParams.get('limit') || '50');
        const sort = searchParams.get('sort') || 'submitted_at';
        const order = searchParams.get('order') || 'DESC';

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        // Filter by status if specified
        if (status && status !== 'all') {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Basic role-based filtering (can be enhanced)
        if (user.role !== 'admin') {
            whereClause += ' AND (assigned_to = ? OR assigned_team = ?)';
            params.push(user.username, user.team_id);
        }

        const sql = `
            SELECT * FROM user_tickets 
            ${whereClause}
            ORDER BY ${sort} ${order}
            LIMIT ?
        `;
        params.push(limit);

        const tickets = await queryAsync(sql, params);

        // Get status counts
        const statusCounts = await queryAsync(`
            SELECT status, COUNT(*) as count 
            FROM user_tickets 
            ${user.role === 'admin' ? '' : 'WHERE (assigned_to = ? OR assigned_team = ?)'}
            GROUP BY status
        `, user.role === 'admin' ? [] : [user.username, user.team_id]);

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
        
        // Generate submission ID
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = String(Date.now()).slice(-3);
        const submissionId = `TKT-${dateStr}-${timeStr}`;

        const {
            user_name,
            employee_number,
            phone_number,
            location,
            section,
            teleworking,
            submitted_by,
            submitted_by_employee_number,
            on_behalf,
            issue_title,
            issue_description,
            computer_info,
            priority = 'medium',
            assigned_team = 'ITTS_Main',
            email_recipient = 'itts@orvale.gov',
            email_recipient_display = 'ITTS: Main Office'
        } = body;

        const result = await runAsync(`
            INSERT INTO user_tickets (
                submission_id, user_name, employee_number, phone_number, location, section,
                teleworking, submitted_by, submitted_by_employee_number, on_behalf,
                issue_title, issue_description, computer_info, priority, status,
                assigned_team, email_recipient, email_recipient_display
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `, [
            submissionId, user_name, employee_number, phone_number, location, section,
            teleworking, submitted_by, submitted_by_employee_number, on_behalf,
            issue_title, issue_description, JSON.stringify(computer_info), priority,
            assigned_team, email_recipient, email_recipient_display
        ]);

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