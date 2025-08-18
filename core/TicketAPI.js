/**
 * TicketAPI.js - API Client (~400 lines planned)
 * All API operations for the ticket system
 */

class TicketAPI {
    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
        this.token = null;
    }

    // === CORE OPERATIONS ===
    async makeRequest(url, options = {}) {
        // Base API request handler
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...this.getHeaders(),
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(`${this.baseURL}${url}`, config);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    getHeaders() {
        // Authentication headers
        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // === AUTHENTICATION ===
    async login(credentials) {
        const response = await this.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        
        if (response.token) {
            this.token = response.token;
        }
        
        return response;
    }

    async logout() {
        await this.makeRequest('/auth/logout', { method: 'POST' });
        this.token = null;
    }

    // === TICKET CRUD ===
    async getTickets(filters = {}) {
        // Load tickets with filtering
        const queryParams = new URLSearchParams(filters).toString();
        return await this.makeRequest(`/tickets?${queryParams}`);
    }

    async getTicket(id) {
        // Get single ticket
        return await this.makeRequest(`/tickets/${id}`);
    }

    async createTicket(data) {
        // Create new ticket
        return await this.makeRequest('/tickets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTicket(id, data) {
        // Update ticket
        return await this.makeRequest(`/tickets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTicket(id) {
        // Delete ticket
        return await this.makeRequest(`/tickets/${id}`, {
            method: 'DELETE',
        });
    }

    // === ASSIGNMENT ===
    async assignToTeam(ticketId, teamId) {
        // Team assignment
        return await this.makeRequest(`/tickets/${ticketId}/assign-team`, {
            method: 'POST',
            body: JSON.stringify({ teamId }),
        });
    }

    async assignToUser(ticketId, userId) {
        // User assignment
        return await this.makeRequest(`/tickets/${ticketId}/assign-user`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    }

    async getAssignableUsers(teamId) {
        // Get users for assignment
        return await this.makeRequest(`/users/assignable?teamId=${teamId}`);
    }

    // === WORKFLOW ===
    async completeTicket(ticketId, notes) {
        // Complete ticket
        return await this.makeRequest(`/tickets/${ticketId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    }

    async escalateTicket(ticketId, reason) {
        // Escalate ticket
        return await this.makeRequest(`/tickets/${ticketId}/escalate`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    async resolveTicket(ticketId, notes) {
        // Resolve escalated ticket
        return await this.makeRequest(`/tickets/${ticketId}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    }

    // === SYSTEM ===
    async getSystemInfo() {
        // Computer info for forms
        return await this.makeRequest('/system-info');
    }

    async getClientIP() {
        // IP detection
        return await this.makeRequest('/client-ip');
    }

    // === USER SUBMISSION ===
    async submitUserTicket(ticketData) {
        // Public ticket submission (no auth required)
        return await this.makeRequest('/user-tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData),
        });
    }
}

export default TicketAPI;