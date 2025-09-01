/**
 * Unified API Client for Orvale Management System
 * Handles all service calls through the single API Gateway at /api/v1
 * Supports: AdminService, HelpdeskService, DeveloperService, UtilitiesService, PublicService
 */

class OrvaleAPIClient {
    constructor() {
        this.baseURL = '/api/v1';
        this.token = null;
        
        // Load token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('authToken');
        }
    }

    // === CORE REQUEST HANDLER ===
    async makeRequest(service, action, data = {}, requireAuth = true) {
        try {
            // Refresh token from localStorage for each request (production timing fix)
            if (typeof window !== 'undefined' && requireAuth) {
                const currentToken = localStorage.getItem('authToken');
                if (currentToken && currentToken !== this.token) {
                    console.log('🔄 API Client - updating token from localStorage');
                    this.token = currentToken;
                }
            }
            
            // Prepare request body
            const requestBody = {
                service,
                action,
                data
            };

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add auth header if token exists and auth is required
            if (requireAuth && this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            // Make request with timeout and retry logic
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Handle nested API Gateway response structure
            const isSuccess = result.success && (result.data?.success !== false);
            const actualData = result.data?.data || result.data;
            const actualError = result.data?.error || result.error;
            const actualMessage = result.data?.message || result.message;

            if (!isSuccess) {
                throw new Error(actualError || actualMessage || 'API request failed');
            }

            return {
                success: true,
                data: actualData,
                message: actualMessage
            };

        } catch (error) {
            // Enhanced error logging with retry mechanism for "Load failed" issues
            if (error instanceof TypeError && error.message === 'Load failed') {
                console.error(`🌐 Network Error [${service}.${action}]: Browser failed to reach server - attempting retry`, {
                    error: error.message,
                    service,
                    action,
                    baseURL: this.baseURL,
                    hasAuth: !!this.token,
                    timestamp: new Date().toISOString()
                });
                
                // Attempt one retry after a brief delay
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log(`🔄 Retrying ${service}.${action} after network failure...`);
                    
                    const retryResponse = await fetch(this.baseURL, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(requestBody),
                        cache: 'no-cache'
                    });
                    
                    if (retryResponse.ok) {
                        console.log(`✅ Retry successful for ${service}.${action}`);
                        const retryResult = await retryResponse.json();
                        const isSuccess = retryResult.success && (retryResult.data?.success !== false);
                        const actualData = retryResult.data?.data || retryResult.data;
                        const actualError = retryResult.data?.error || retryResult.error;
                        const actualMessage = retryResult.data?.message || retryResult.message;
                        
                        if (!isSuccess) {
                            throw new Error(actualError || actualMessage || 'API request failed');
                        }
                        
                        return {
                            success: true,
                            data: actualData,
                            message: actualMessage
                        };
                    }
                } catch (retryError) {
                    console.error(`❌ Retry also failed for ${service}.${action}:`, retryError);
                }
                
                throw new Error(`Network connection failed for ${service}.${action}. Browser network may be suspended. Try refreshing the page.`);
            } else {
                console.error(`API Error [${service}.${action}]:`, error);
                throw new Error(error.message || 'API request failed');
            }
        }
    }

    // === AUTHENTICATION ===
    async login(credentials) {
        const result = await this.makeRequest('admin', 'login', credentials, false);
        
        if (result.data?.token) {
            this.token = result.data.token;
            if (typeof window !== 'undefined') {
                localStorage.setItem('authToken', this.token);
            }
        }
        
        return result;
    }

    async logout() {
        try {
            await this.makeRequest('admin', 'logout');
        } finally {
            this.token = null;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('authToken');
            }
        }
    }

    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', token);
        }
    }

    // === ADMIN SERVICE METHODS ===
    
    // User Management
    async getUsers(filters = {}) {
        return await this.makeRequest('admin', 'get_users', filters);
    }

    async createUser(userData) {
        return await this.makeRequest('admin', 'create_user', userData);
    }

    async updateUser(userId, userData) {
        return await this.makeRequest('admin', 'update_user', { user_id: userId, ...userData });
    }

    async deleteUser(userId) {
        return await this.makeRequest('admin', 'delete_user', { user_id: userId });
    }

    async getRoles() {
        return await this.makeRequest('admin', 'get_roles');
    }

    async getPermissions() {
        return await this.makeRequest('admin', 'get_permissions');
    }

    // Chat Management
    async getChatSettings() {
        return await this.makeRequest('admin', 'get_chat_settings');
    }

    async updateChatSettings(settings) {
        return await this.makeRequest('admin', 'update_chat_settings', settings);
    }

    async getChatStats(timeframe = '24h') {
        return await this.makeRequest('admin', 'get_chat_stats', { timeframe });
    }

    async getChatUsers() {
        return await this.makeRequest('admin', 'get_chat_users');
    }

    async getAllMessages(filters = {}) {
        return await this.makeRequest('admin', 'get_all_messages', filters);
    }

    async exportMessages(options = {}) {
        return await this.makeRequest('admin', 'export_messages', options);
    }

    // Widget Management
    async getWidgetSettings() {
        return await this.makeRequest('admin', 'get_widget_settings');
    }

    async updateWidgetSettings(settings) {
        return await this.makeRequest('admin', 'update_widget_settings', settings);
    }

    // System Settings
    async getWebsocketSettings() {
        return await this.makeRequest('admin', 'get_websocket_settings');
    }

    async updateWebsocketSettings(settings) {
        return await this.makeRequest('admin', 'update_websocket_settings', settings);
    }

    async getThemeSettings() {
        return await this.makeRequest('admin', 'get_theme_settings');
    }

    async updateThemeSettings(settings) {
        return await this.makeRequest('admin', 'update_theme_settings', settings);
    }

    async getThemeAnalytics(timeframe = '7d') {
        return await this.makeRequest('admin', 'get_theme_analytics', { timeframe });
    }

    async forceThemeCompliance(themeData) {
        return await this.makeRequest('admin', 'force_theme_compliance', themeData);
    }

    // Recovery & Work Mode Settings
    async getRecoverySettings() {
        return await this.makeRequest('admin', 'get_recovery_settings');
    }

    async getWorkModeSettings() {
        return await this.makeRequest('admin', 'get_work_mode_settings');
    }

    async updateWorkModeSettings(settings) {
        return await this.makeRequest('admin', 'update_work_mode_settings', settings);
    }

    // Table Management
    async getTableConfigs(tableName = null) {
        return await this.makeRequest('admin', 'get_table_configs', { table_name: tableName });
    }

    async getTableViews(tableName = null) {
        return await this.makeRequest('admin', 'get_table_views', { table_name: tableName });
    }

    async getTableData(tableName, filters = {}) {
        return await this.makeRequest('admin', 'get_table_data', { table_name: tableName, ...filters });
    }

    // User Actions
    async forceLogoutUser(userId) {
        return await this.makeRequest('admin', 'force_logout_user', { user_id: userId });
    }

    async blockUser(userId, reason) {
        return await this.makeRequest('admin', 'block_user', { user_id: userId, reason });
    }

    // Portal Settings
    async getPortalSettings() {
        return await this.makeRequest('admin', 'get_portal_settings');
    }

    async updatePortalSettings(settings) {
        return await this.makeRequest('admin', 'update_portal_settings', settings);
    }

    // === HELPDESK SERVICE METHODS ===
    
    async getHelpdeskQueue(filters = {}) {
        return await this.makeRequest('helpdesk', 'get_queue', filters);
    }

    async getHelpdeskTeams() {
        return await this.makeRequest('helpdesk', 'get_teams');
    }

    async getTeamPreferences() {
        return await this.makeRequest('helpdesk', 'get_team_preferences');
    }

    async updateTeamPreferences(preferences) {
        return await this.makeRequest('helpdesk', 'update_team_preferences', preferences);
    }

    async getHelpdeskStats(timeframe = '24h') {
        return await this.makeRequest('helpdesk', 'get_stats', { timeframe });
    }

    async updateTicketStatus(ticketId, status, notes = '') {
        return await this.makeRequest('helpdesk', 'update_ticket_status', {
            ticket_id: ticketId,
            status,
            notes
        });
    }

    async assignTicket(ticketId, assignTo, assignmentType = 'user') {
        return await this.makeRequest('helpdesk', 'assign_ticket', {
            ticket_id: ticketId,
            assign_to: assignTo,
            assignment_type: assignmentType
        });
    }

    async escalateTicket(ticketId, reason) {
        return await this.makeRequest('helpdesk', 'escalate_ticket', {
            ticket_id: ticketId,
            reason
        });
    }

    async getTicketHistory(ticketId) {
        return await this.makeRequest('helpdesk', 'get_ticket_history', {
            ticket_id: ticketId
        });
    }

    // === DEVELOPER SERVICE METHODS ===
    
    async getDeveloperStats(timeframe = '24h') {
        return await this.makeRequest('developer', 'get_stats', { timeframe });
    }

    async getSystemHealth() {
        return await this.makeRequest('developer', 'get_system_health');
    }

    async getSystemLogs(filters = {}) {
        return await this.makeRequest('developer', 'get_system_logs', filters);
    }

    async exportSystemLogs(options = {}) {
        return await this.makeRequest('developer', 'export_system_logs', options);
    }

    async createBackup(options = {}) {
        return await this.makeRequest('developer', 'create_backup', options);
    }

    async getBackupHistory() {
        return await this.makeRequest('developer', 'get_backup_history');
    }

    async restoreBackup(backupId) {
        return await this.makeRequest('developer', 'restore_backup', { backup_id: backupId });
    }

    async runMaintenance(options = {}) {
        return await this.makeRequest('developer', 'run_maintenance', options);
    }

    async getApiEndpoints() {
        return await this.makeRequest('developer', 'get_api_endpoints');
    }

    async testApiEndpoint(endpoint, testData = {}) {
        return await this.makeRequest('developer', 'test_api_endpoint', {
            endpoint,
            test_data: testData
        });
    }

    // Developer User Management
    async getDeveloperUsers(filters = {}) {
        return await this.makeRequest('developer', 'get_users', filters);
    }

    async createDeveloperUser(userData) {
        return await this.makeRequest('developer', 'create_user', userData);
    }

    async updateDeveloperUser(userId, userData) {
        return await this.makeRequest('developer', 'update_user', { user_id: userId, ...userData });
    }

    async deleteDeveloperUser(userId) {
        return await this.makeRequest('developer', 'delete_user', { user_id: userId });
    }

    // Database Operations
    async executeDatabaseQuery(query, params = []) {
        return await this.makeRequest('developer', 'execute_database_query', {
            query,
            params
        });
    }

    async getDatabaseSchema() {
        return await this.makeRequest('developer', 'get_database_schema');
    }

    async getDatabaseStats() {
        return await this.makeRequest('developer', 'get_database_stats');
    }

    async optimizeDatabase() {
        return await this.makeRequest('developer', 'optimize_database');
    }

    // System Monitoring
    async getPerformanceMetrics(timeframe = '1h') {
        return await this.makeRequest('developer', 'get_performance_metrics', { timeframe });
    }

    async clearSystemCache() {
        return await this.makeRequest('developer', 'clear_system_cache');
    }

    async restartServices(services = []) {
        return await this.makeRequest('developer', 'restart_services', { services });
    }

    // === UTILITIES SERVICE METHODS ===
    
    async getOrganizations() {
        return await this.makeRequest('utilities', 'get_organizations');
    }

    async getOffices() {
        return await this.makeRequest('utilities', 'get_offices');
    }

    async getBureaus() {
        return await this.makeRequest('utilities', 'get_bureaus');
    }

    async getDivisions() {
        return await this.makeRequest('utilities', 'get_divisions');
    }

    async getSections() {
        return await this.makeRequest('utilities', 'get_sections');
    }

    async getTicketCategories() {
        return await this.makeRequest('utilities', 'get_ticket_categories');
    }

    async getRequestTypes() {
        return await this.makeRequest('utilities', 'get_request_types');
    }

    // === PUBLIC SERVICE METHODS ===
    
    async getPublicWidgetSettings() {
        return await this.makeRequest('public', 'get_widget_settings', {}, false);
    }

    async getPublicWidgetStatus() {
        return await this.makeRequest('public', 'get_widget_status', {}, false);
    }

    async getAvailableAgents() {
        return await this.makeRequest('public', 'get_available_agents', {}, false);
    }

    async startChatSession(guestData) {
        return await this.makeRequest('public', 'start_chat_session', guestData, false);
    }

    async getChatMessages(sessionId, options = {}) {
        return await this.makeRequest('public', 'get_chat_messages', {
            session_id: sessionId,
            ...options
        }, false);
    }

    async sendChatMessage(sessionId, message, messageType = 'text') {
        return await this.makeRequest('public', 'send_chat_message', {
            session_id: sessionId,
            message,
            message_type: messageType
        }, false);
    }

    async autoAssignAgent(sessionId) {
        return await this.makeRequest('public', 'auto_assign_agent', {
            session_id: sessionId
        }, false);
    }

    async reconnectSession(sessionId) {
        return await this.makeRequest('public', 'reconnect_session', {
            session_id: sessionId
        }, false);
    }

    async getGuestQueue(options = {}) {
        return await this.makeRequest('public', 'get_guest_queue', options, false);
    }

    async removeFromQueue(sessionId) {
        return await this.makeRequest('public', 'remove_from_queue', {
            session_id: sessionId
        }, false);
    }

    async updateGuestInfo(sessionId, guestData) {
        return await this.makeRequest('public', 'update_guest_info', {
            session_id: sessionId,
            ...guestData
        }, false);
    }

    async reconnectSession(reconnectData) {
        return await this.makeRequest('public', 'reconnect_session', reconnectData, false);
    }

    // === LEGACY TICKET API COMPATIBILITY METHODS ===
    // These methods provide backward compatibility with existing TicketAPI usage
    
    async getTickets(filters = {}) {
        // Convert to helpdesk queue format
        return await this.getHelpdeskQueue(filters);
    }

    async getTicket(id) {
        // Get single ticket through helpdesk service
        return await this.makeRequest('helpdesk', 'get_queue', { ticket_id: id });
    }

    async createTicket(data) {
        // Legacy ticket creation - may need routing to appropriate service
        return await this.makeRequest('admin', 'create_ticket', data);
    }

    async updateTicket(id, data) {
        // Update through helpdesk service
        return await this.updateTicketStatus(id, data.status, data.notes);
    }

    async assignToTeam(ticketId, teamId) {
        return await this.assignTicket(ticketId, teamId, 'team');
    }

    async assignToUser(ticketId, userId) {
        return await this.assignTicket(ticketId, userId, 'user');
    }

    async getAssignableUsers(teamId) {
        return await this.makeRequest('admin', 'get_users', { team_id: teamId });
    }

    async completeTicket(ticketId, notes) {
        return await this.updateTicketStatus(ticketId, 'completed', notes);
    }

    async escalateTicket(ticketId, reason) {
        return await this.escalateTicket(ticketId, reason);
    }

    async resolveTicket(ticketId, notes) {
        return await this.updateTicketStatus(ticketId, 'resolved', notes);
    }

    async getSystemInfo() {
        return await this.getSystemHealth();
    }

    // === UTILITY HELPERS ===
    
    // Batch multiple requests efficiently
    async batchRequests(requests) {
        const promises = requests.map(req => 
            this.makeRequest(req.service, req.action, req.data, req.requireAuth)
        );
        
        try {
            const results = await Promise.allSettled(promises);
            return results.map((result, index) => ({
                request: requests[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason.message : null
            }));
        } catch (error) {
            throw new Error(`Batch request failed: ${error.message}`);
        }
    }

    // Check if user has specific permission
    async checkPermission(permission) {
        try {
            const result = await this.makeRequest('auth', 'get_current_user', {});
            return result.data?.permissions?.includes(permission) || false;
        } catch {
            return false;
        }
    }

    // Get current user info
    async getCurrentUser() {
        return await this.makeRequest('auth', 'get_current_user', {});
    }
}

// Create singleton instance
const apiClient = new OrvaleAPIClient();

// Export both the class and singleton
export { OrvaleAPIClient, apiClient as default };

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OrvaleAPIClient, default: apiClient };
}