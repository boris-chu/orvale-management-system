/**
 * ticket-types.js - Type definitions (~100 lines planned)
 * TypeScript-style type definitions and constants for the ticket system
 */

// === TICKET STATUS TYPES ===
export const TICKET_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    ESCALATED: 'escalated',
    RESOLVED: 'resolved'
};

export const TICKET_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

// === USER ROLES ===
export const USER_ROLES = {
    TEAM_MEMBER: 'team_member',
    SECTION_SUPERVISOR: 'section_supervisor',
    HELPDESK_TECHNICIAN: 'helpdesk_technician',
    HELPDESK_SUPERVISOR: 'helpdesk_supervisor',
    SYSTEM_ADMIN: 'system_admin'
};

// === PERMISSIONS ===
export const PERMISSIONS = {
    // Basic Ticket Access
    TICKET_VIEW: 'ticket.view',
    TICKET_EDIT: 'ticket.edit',
    TICKET_COMPLETE: 'ticket.complete',
    TICKET_DELETE: 'ticket.delete',
    
    // Assignment Permissions
    TICKET_ASSIGN_WITHIN_TEAM: 'ticket.assign_within_team',
    TICKET_ASSIGN_WITHIN_SECTION: 'ticket.assign_within_section',
    TICKET_ASSIGN_CROSS_SECTION: 'ticket.assign_cross_section',
    
    // Queue Access Permissions
    QUEUE_VIEW_OWN_TEAM: 'queue.view_own_team',
    QUEUE_VIEW_SECTION_TEAMS: 'queue.view_section_teams',
    QUEUE_VIEW_ALL_SECTIONS: 'queue.view_all_sections',
    QUEUE_SWITCH_WITHIN_SECTION: 'queue.switch_within_section',
    QUEUE_SWITCH_ALL_SECTIONS: 'queue.switch_all_sections',
    
    // Escalation Permissions
    TICKET_ESCALATE_TO_HELPDESK: 'ticket.escalate_to_helpdesk',
    TICKET_ESCALATE_EMERGENCY: 'ticket.escalate_emergency',
    
    // Helpdesk Permissions
    HELPDESK_RESOLVE_ESCALATED: 'helpdesk.resolve_escalated',
    HELPDESK_ROUTE_BACK_TO_TEAMS: 'helpdesk.route_back_to_teams',
    HELPDESK_EMERGENCY_OVERRIDE: 'helpdesk.emergency_override',
    
    // User Submission Permissions
    USER_SUBMIT_TICKET: 'user.submit_ticket',
    USER_SUBMIT_ON_BEHALF: 'user.submit_on_behalf',
    
    // Administrative Permissions
    ADMIN_MANAGE_TEAM_ASSIGNMENTS: 'admin.manage_team_assignments',
    ADMIN_VIEW_ALL_QUEUES: 'admin.view_all_queues',
    ADMIN_USER_MANAGEMENT: 'admin.user_management'
};

// === TICKET DATA STRUCTURE ===
export const createTicketData = ({
    // PRIMARY USER (person who needs help - ALWAYS)
    user_name,
    employee_number,
    phone_number,
    location,
    section,
    teleworking,
    
    // SUBMISSION TRACKING (who submitted the form)
    submitted_by,
    submitted_by_employee_number,
    on_behalf = false,
    
    // TICKET DETAILS
    issue_title,
    issue_description,
    computer_info = {},
    
    // WORKFLOW
    priority = TICKET_PRIORITY.MEDIUM,
    status = TICKET_STATUS.PENDING,
    email_recipient,
    email_recipient_display,
    
    // PROJECT LINKAGE (extension)
    project_id = null,
    project_name = null,
    project_phase = null,
    milestone_id = null
}) => ({
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
    priority,
    status,
    email_recipient,
    email_recipient_display,
    project_id,
    project_name,
    project_phase,
    milestone_id,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
});

// === API RESPONSE TYPES ===
export const createAPIResponse = (data, success = true, message = '') => ({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
});

export const createErrorResponse = (message, code = 500) => ({
    success: false,
    message,
    error: {
        code,
        timestamp: new Date().toISOString()
    }
});

// === USER CONTEXT TYPE ===
export const createUserContext = ({
    id,
    username,
    display_name,
    email,
    team_id,
    team_name,
    section_id,
    section_name,
    role_id,
    permissions = [],
    accessible_queues = [],
    can_switch_queues = false,
    home_queue = null
}) => ({
    id,
    username,
    display_name,
    email,
    team_id,
    team_name,
    section_id,
    section_name,
    role_id,
    permissions,
    accessible_queues,
    can_switch_queues,
    home_queue
});

// === QUEUE TYPES ===
export const QUEUE_TYPES = {
    UNASSIGNED: 'unassigned',
    MY_TEAM: 'my_team',
    INDIVIDUAL: 'individual',
    ESCALATED: 'escalated',
    ALL_TEAMS: 'all_teams'
};

// === ACHIEVEMENT TYPES ===
export const ACHIEVEMENT_CATEGORIES = {
    PRODUCTIVITY: 'productivity',
    QUALITY: 'quality',
    COLLABORATION: 'collaboration',
    SPECIAL: 'special'
};

export const ACHIEVEMENT_RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

// === VALIDATION HELPERS ===
export const validateTicketData = (ticketData) => {
    const required = ['user_name', 'employee_number', 'issue_title', 'issue_description'];
    const missing = required.filter(field => !ticketData[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
};

export const validateUserPermission = (userPermissions, requiredPermission) => {
    return userPermissions.includes(requiredPermission);
};

// === CONSTANTS ===
export const CONSTANTS = {
    MAX_TICKET_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 5000,
    MAX_PHONE_LENGTH: 20,
    MAX_LOCATION_LENGTH: 100,
    ITEMS_PER_PAGE: 25,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    AUTO_REFRESH_INTERVAL: 60 * 1000, // 1 minute
};

export default {
    TICKET_STATUS,
    TICKET_PRIORITY,
    USER_ROLES,
    PERMISSIONS,
    QUEUE_TYPES,
    ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENT_RARITY,
    CONSTANTS,
    createTicketData,
    createAPIResponse,
    createErrorResponse,
    createUserContext,
    validateTicketData,
    validateUserPermission
};