/**
 * TicketUI.js - UI Renderer (~500 lines planned)
 * UI rendering and events for the ticket system
 */

class TicketUI {
    constructor() {
        this.container = null;
        this.modal = null;
        this.filters = {};
    }

    // === INITIALIZATION ===
    createQueueInterface() {
        // Main queue UI
        const queueHTML = `
            <div class="ticket-queue-container">
                <div class="queue-header">
                    <h2 class="queue-title">Ticket Queue</h2>
                    <div class="queue-stats">
                        <span class="stat-item">Pending: <span id="pending-count">0</span></span>
                        <span class="stat-item">In Progress: <span id="progress-count">0</span></span>
                        <span class="stat-item">My Tickets: <span id="my-count">0</span></span>
                    </div>
                </div>
                <div class="filter-controls" id="filter-controls"></div>
                <div class="ticket-list" id="ticket-list"></div>
            </div>
        `;
        return queueHTML;
    }

    createFilterControls() {
        // Filter/search UI
        const filterHTML = `
            <div class="filters">
                <div class="search-box">
                    <input type="text" placeholder="Search tickets..." id="search-input" />
                </div>
                <div class="filter-options">
                    <select id="status-filter">
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                    <select id="priority-filter">
                        <option value="">All Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
            </div>
        `;
        return filterHTML;
    }

    createTicketModal() {
        // Ticket detail modal
        const modalHTML = `
            <div class="modal-overlay" id="ticket-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title">Ticket Details</h3>
                        <button class="close-btn" onclick="this.closeTicketModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="modal-body">
                        <!-- Ticket details will be inserted here -->
                    </div>
                    <div class="modal-footer" id="modal-footer">
                        <!-- Action buttons will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        return modalHTML;
    }

    // === QUEUE RENDERING ===
    renderTicketQueue(tickets) {
        // Render ticket list
        const listContainer = document.getElementById('ticket-list');
        if (!listContainer) return;

        if (tickets.length === 0) {
            listContainer.innerHTML = '<div class="no-tickets">No tickets found</div>';
            return;
        }

        const ticketCards = tickets.map(ticket => this.renderTicketCard(ticket)).join('');
        listContainer.innerHTML = ticketCards;
    }

    renderTicketCard(ticket) {
        // Individual ticket card
        const statusClass = this.getStatusClass(ticket.status);
        const priorityClass = this.getPriorityClass(ticket.priority);
        
        return `
            <div class="ticket-card ${statusClass}" data-ticket-id="${ticket.id}">
                <div class="ticket-header">
                    <div class="ticket-id">#${ticket.submission_id}</div>
                    <div class="ticket-priority ${priorityClass}">${ticket.priority}</div>
                </div>
                <div class="ticket-content">
                    <h4 class="ticket-title">${ticket.issue_title}</h4>
                    <p class="ticket-description">${this.truncateText(ticket.issue_description, 100)}</p>
                </div>
                <div class="ticket-meta">
                    <span class="ticket-user">${ticket.user_name}</span>
                    <span class="ticket-date">${this.formatDate(ticket.submitted_at)}</span>
                    ${ticket.assigned_to ? `<span class="ticket-assigned">Assigned to: ${ticket.assigned_to}</span>` : ''}
                </div>
                <div class="ticket-actions">
                    <button onclick="ticketUI.viewTicket('${ticket.id}')" class="btn-view">View</button>
                    <button onclick="ticketUI.editTicket('${ticket.id}')" class="btn-edit">Edit</button>
                </div>
            </div>
        `;
    }

    updateQueueStats(stats) {
        // Update counter displays
        document.getElementById('pending-count').textContent = stats.pending || 0;
        document.getElementById('progress-count').textContent = stats.in_progress || 0;
        document.getElementById('my-count').textContent = stats.my_tickets || 0;
    }

    // === MODAL RENDERING ===
    showTicketModal(ticket) {
        // Display ticket details
        const modal = document.getElementById('ticket-modal');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');

        modalBody.innerHTML = this.renderTicketDetails(ticket);
        modalFooter.innerHTML = this.renderTicketActions(ticket);
        
        modal.style.display = 'flex';
    }

    renderTicketDetails(ticket) {
        // Ticket detail content
        return `
            <div class="ticket-details">
                <div class="detail-section">
                    <h4>Ticket Information</h4>
                    <p><strong>ID:</strong> ${ticket.submission_id}</p>
                    <p><strong>Title:</strong> ${ticket.issue_title}</p>
                    <p><strong>Status:</strong> ${ticket.status}</p>
                    <p><strong>Priority:</strong> ${ticket.priority}</p>
                </div>
                <div class="detail-section">
                    <h4>User Information</h4>
                    <p><strong>Name:</strong> ${ticket.user_name}</p>
                    <p><strong>Employee Number:</strong> ${ticket.employee_number}</p>
                    <p><strong>Phone:</strong> ${ticket.phone_number}</p>
                    <p><strong>Location:</strong> ${ticket.location}</p>
                </div>
                <div class="detail-section">
                    <h4>Description</h4>
                    <p>${ticket.issue_description}</p>
                </div>
            </div>
        `;
    }

    renderTicketActions(ticket) {
        // Action buttons based on permissions and status
        let actions = [];
        
        if (ticket.status === 'pending') {
            actions.push('<button onclick="ticketUI.assignTicket()" class="btn-assign">Assign</button>');
        }
        
        if (ticket.status === 'in_progress') {
            actions.push('<button onclick="ticketUI.completeTicket()" class="btn-complete">Complete</button>');
            actions.push('<button onclick="ticketUI.escalateTicket()" class="btn-escalate">Escalate</button>');
        }
        
        actions.push('<button onclick="ticketUI.closeTicketModal()" class="btn-close">Close</button>');
        
        return actions.join('');
    }

    closeTicketModal() {
        const modal = document.getElementById('ticket-modal');
        modal.style.display = 'none';
    }

    // === UTILITY METHODS ===
    getStatusClass(status) {
        const statusClasses = {
            'pending': 'status-pending',
            'in_progress': 'status-progress',
            'completed': 'status-completed',
            'escalated': 'status-escalated'
        };
        return statusClasses[status] || 'status-default';
    }

    getPriorityClass(priority) {
        const priorityClasses = {
            'low': 'priority-low',
            'medium': 'priority-medium',
            'high': 'priority-high',
            'urgent': 'priority-urgent'
        };
        return priorityClasses[priority] || 'priority-default';
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showNotification(message, type = 'info') {
        // User notifications
        console.log(`${type.toUpperCase()}: ${message}`);
        // TODO: Implement proper notification system
    }

    showLoading(message) {
        // Loading states
        console.log(`Loading: ${message}`);
        // TODO: Implement loading spinner
    }

    // === EVENT HANDLING ===
    attachEventListeners() {
        // UI event binding
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeEventListeners();
        });
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Filter functionality
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.handleFilterChange('status', e.target.value);
            });
        }
    }

    handleSearch(searchTerm) {
        // Search functionality
        this.filters.search = searchTerm;
        this.applyFilters();
    }

    handleFilterChange(filterType, value) {
        // Filter handling
        this.filters[filterType] = value;
        this.applyFilters();
    }

    applyFilters() {
        // Apply current filters
        console.log('Applying filters:', this.filters);
        // TODO: Trigger ticket reload with filters
    }
}

export default TicketUI;