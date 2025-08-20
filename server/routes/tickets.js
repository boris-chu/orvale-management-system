const express = require('express');
const { authenticateToken, requireITAccess } = require('../auth');
const { queryAsync, getAsync, runAsync } = require('../database');

const router = express.Router();

/**
 * Generate unique submission ID
 */
const generateSubmissionId = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Math.floor(Date.now() / 1000).toString().slice(-4);
    return `TKT-${dateStr}-${timeStr}`;
};

// ==========================================
// TICKET CRUD OPERATIONS
// ==========================================

/**
 * GET /api/tickets
 * Get tickets with filtering and pagination
 */
router.get('/', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const {
            status,
            priority,
            assigned_to,
            team,
            search,
            limit = 50,
            offset = 0,
            sort = 'submitted_at',
            order = 'DESC'
        } = req.query;

        let query = `
            SELECT 
                id, submission_id, user_name, employee_number, phone_number,
                location, section, issue_title, issue_description,
                priority, status, assigned_to, assigned_team,
                submitted_at, updated_at, completed_at, escalated_at
            FROM user_tickets 
            WHERE 1=1
        `;
        const params = [];

        // Apply filters based on user permissions and query parameters
        if (req.user.role !== 'admin') {
            // Non-admin users can only see tickets for their team/section
            query += ' AND (assigned_team = ? OR assigned_team IS NULL)';
            params.push(req.user.team_id);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (priority) {
            query += ' AND priority = ?';
            params.push(priority);
        }

        if (assigned_to) {
            query += ' AND assigned_to = ?';
            params.push(assigned_to);
        }

        if (team) {
            query += ' AND assigned_team = ?';
            params.push(team);
        }

        if (search) {
            query += ' AND (issue_title LIKE ? OR issue_description LIKE ? OR user_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Add sorting and pagination
        const validSortColumns = ['submitted_at', 'updated_at', 'priority', 'status', 'user_name'];
        const sortColumn = validSortColumns.includes(sort) ? sort : 'submitted_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const tickets = await queryAsync(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM user_tickets WHERE 1=1';
        let countParams = [];

        if (req.user.role !== 'admin') {
            countQuery += ' AND (assigned_team = ? OR assigned_team IS NULL)';
            countParams.push(req.user.team_id);
        }

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        if (search) {
            countQuery += ' AND (issue_title LIKE ? OR issue_description LIKE ? OR user_name LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        const countResult = await getAsync(countQuery, countParams);

        // Get status counts for dashboard
        const statusCountsQuery = `
            SELECT status, COUNT(*) as count 
            FROM user_tickets 
            WHERE ${req.user.role !== 'admin' ? '(assigned_team = ? OR assigned_team IS NULL)' : '1=1'}
            GROUP BY status
        `;
        const statusParams = req.user.role !== 'admin' ? [req.user.team_id] : [];
        const statusCounts = await queryAsync(statusCountsQuery, statusParams);

        res.json({
            success: true,
            tickets,
            pagination: {
                total: countResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
                total_pages: Math.ceil(countResult.total / parseInt(limit))
            },
            status_counts: statusCounts.reduce((acc, item) => {
                acc[item.status] = item.count;
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('❌ Error fetching tickets:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching tickets'
        });
    }
});

/**
 * GET /api/tickets/:id
 * Get single ticket by ID
 */
router.get('/:id', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const ticketId = req.params.id;
        
        const ticket = await getAsync(
            'SELECT * FROM user_tickets WHERE id = ?',
            [ticketId]
        );

        if (!ticket) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Ticket not found'
            });
        }

        // Check if user can access this ticket
        if (req.user.role !== 'admin' && ticket.assigned_team !== req.user.team_id) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You do not have permission to view this ticket'
            });
        }

        // Parse computer_info JSON if it exists
        if (ticket.computer_info) {
            try {
                ticket.computer_info = JSON.parse(ticket.computer_info);
            } catch (e) {
                console.warn('❌ Error parsing computer_info for ticket', ticketId);
            }
        }

        res.json({
            success: true,
            ticket
        });

    } catch (error) {
        console.error('❌ Error fetching ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching ticket'
        });
    }
});

/**
 * POST /api/tickets
 * Create new ticket (public endpoint for user submissions)
 */
router.post('/', async (req, res) => {
    try {
        const {
            user_name,
            employee_number,
            phone_number,
            location,
            cubicle_room,
            section,
            teleworking,
            issue_title,
            issue_description,
            computer_info,
            request_creator_display_name,
            priority = 'medium',
            email_recipient,
            email_recipient_display
        } = req.body;

        // Validation
        if (!user_name || !employee_number || !issue_title || !issue_description) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Required fields: user_name, employee_number, issue_title, issue_description'
            });
        }

        const submission_id = generateSubmissionId();
        const computer_info_json = computer_info ? JSON.stringify(computer_info) : null;

        const result = await runAsync(`
            INSERT INTO user_tickets (
                submission_id, user_name, employee_number, phone_number, location, cubicle_room,
                section, teleworking, request_creator_display_name,
                issue_title, issue_description, computer_info,
                priority, email_recipient, email_recipient_display
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            submission_id, user_name, employee_number, phone_number, location, cubicle_room,
            section, teleworking, request_creator_display_name,
            issue_title, issue_description, computer_info_json,
            priority, email_recipient, email_recipient_display
        ]);

        console.log(`✅ New ticket created: ${submission_id} by ${user_name}`);

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            ticket: {
                id: result.lastID,
                submission_id,
                user_name,
                issue_title,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error creating ticket'
        });
    }
});

/**
 * PUT /api/tickets/:id
 * Update ticket
 */
router.put('/:id', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const updates = req.body;

        // Get current ticket
        const currentTicket = await getAsync(
            'SELECT * FROM user_tickets WHERE id = ?',
            [ticketId]
        );

        if (!currentTicket) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Ticket not found'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && currentTicket.assigned_team !== req.user.team_id) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You do not have permission to update this ticket'
            });
        }

        // Build update query dynamically
        const allowedFields = [
            'priority', 'status', 'assigned_to', 'assigned_team',
            'escalation_reason', 'completion_notes'
        ];
        
        const updateFields = [];
        const updateValues = [];
        
        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'No valid fields to update'
            });
        }

        // Add timestamp updates
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        if (updates.status === 'completed' && !currentTicket.completed_at) {
            updateFields.push('completed_at = CURRENT_TIMESTAMP');
            updateFields.push('completed_by = ?');
            updateValues.push(req.user.username);
        }

        if (updates.status === 'escalated' && !currentTicket.escalated_at) {
            updateFields.push('escalated_at = CURRENT_TIMESTAMP');
        }

        updateValues.push(ticketId);

        await runAsync(
            `UPDATE user_tickets SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Get updated ticket
        const updatedTicket = await getAsync(
            'SELECT * FROM user_tickets WHERE id = ?',
            [ticketId]
        );

        console.log(`✅ Ticket updated: ${currentTicket.submission_id} by ${req.user.username}`);

        res.json({
            success: true,
            message: 'Ticket updated successfully',
            ticket: updatedTicket
        });

    } catch (error) {
        console.error('❌ Error updating ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error updating ticket'
        });
    }
});

/**
 * DELETE /api/tickets/:id
 * Delete ticket (soft delete by changing status)
 */
router.delete('/:id', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const ticketId = req.params.id;

        // Get current ticket
        const ticket = await getAsync(
            'SELECT * FROM user_tickets WHERE id = ?',
            [ticketId]
        );

        if (!ticket) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Ticket not found'
            });
        }

        // Check permissions (only admin can delete)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only administrators can delete tickets'
            });
        }

        // Soft delete by changing status
        await runAsync(
            'UPDATE user_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['deleted', ticketId]
        );

        console.log(`✅ Ticket deleted: ${ticket.submission_id} by ${req.user.username}`);

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error deleting ticket'
        });
    }
});

// ==========================================
// TICKET ACTIONS
// ==========================================

/**
 * POST /api/tickets/:id/assign
 * Assign ticket to user or team
 */
router.post('/:id/assign', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { assigned_to, assigned_team } = req.body;

        if (!assigned_to && !assigned_team) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Either assigned_to or assigned_team must be provided'
            });
        }

        await runAsync(`
            UPDATE user_tickets 
            SET assigned_to = ?, assigned_team = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [assigned_to, assigned_team, ticketId]);

        console.log(`✅ Ticket ${ticketId} assigned to ${assigned_to || assigned_team} by ${req.user.username}`);

        res.json({
            success: true,
            message: 'Ticket assigned successfully'
        });

    } catch (error) {
        console.error('❌ Error assigning ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error assigning ticket'
        });
    }
});

/**
 * POST /api/tickets/:id/complete
 * Complete ticket with notes
 */
router.post('/:id/complete', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { completion_notes } = req.body;

        await runAsync(`
            UPDATE user_tickets 
            SET status = 'completed', completion_notes = ?, completed_at = CURRENT_TIMESTAMP,
                completed_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [completion_notes, req.user.username, ticketId]);

        console.log(`✅ Ticket ${ticketId} completed by ${req.user.username}`);

        res.json({
            success: true,
            message: 'Ticket completed successfully'
        });

    } catch (error) {
        console.error('❌ Error completing ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error completing ticket'
        });
    }
});

/**
 * POST /api/tickets/:id/escalate
 * Escalate ticket to helpdesk
 */
router.post('/:id/escalate', authenticateToken, requireITAccess, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { escalation_reason } = req.body;

        if (!escalation_reason) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Escalation reason is required'
            });
        }

        await runAsync(`
            UPDATE user_tickets 
            SET status = 'escalated', escalation_reason = ?, escalated_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [escalation_reason, ticketId]);

        console.log(`✅ Ticket ${ticketId} escalated by ${req.user.username}: ${escalation_reason}`);

        res.json({
            success: true,
            message: 'Ticket escalated successfully'
        });

    } catch (error) {
        console.error('❌ Error escalating ticket:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error escalating ticket'
        });
    }
});

module.exports = router;