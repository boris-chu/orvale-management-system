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

    // === MAINTENANCE STATUS ===
    async getMaintenanceStatus() {
        return await this.makeRequest('utilities', 'get_maintenance_status', {}, false);
    }

    // === SYSTEM INFORMATION ===
    async getSystemInfo() {
        return await this.makeRequest('utilities', 'get_system_info', {}, false);
    }

    // === SUPPORT TEAMS ===
    async getSupportTeams() {
        return await this.makeRequest('utilities', 'get_support_teams', {}, false);
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

    async getCurrentUser() {
        return await this.makeRequest('auth', 'get_current_user');
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

    // Chat User Management
    async forceLogoutChatUser(userId) {
        return await this.makeRequest('admin', 'force_logout_chat_user', { user_id: userId });
    }

    async blockChatUser(username, blocked, reason = '') {
        return await this.makeRequest('admin', 'block_chat_user', { username, blocked, reason });
    }

    // Chat Channel Management
    async getAdminChatChannels() {
        return await this.makeRequest('admin', 'get_chat_channels');
    }

    async getChatChannels() {
        return await this.makeRequest('chat', 'get_channels');
    }

    async getChatChannel(channelId) {
        return await this.makeRequest('chat', 'get_channel', { channel_id: channelId });
    }

    async getChatUsers() {
        return await this.makeRequest('chat', 'get_users');
    }

    async createDirectMessage(targetUsername) {
        return await this.makeRequest('chat', 'create_dm', { target_username: targetUsername });
    }

    async getDirectMessages() {
        return await this.makeRequest('chat', 'get_dm');
    }

    async createChatChannel(channelData) {
        return await this.makeRequest('chat', 'create_channel', channelData);
    }

    async updateChatChannel(channelId, channelData) {
        return await this.makeRequest('chat', 'update_channel', { channel_id: channelId, ...channelData });
    }

    async deleteChatChannel(channelId) {
        return await this.makeRequest('chat', 'delete_channel', { channel_id: channelId });
    }

    async getChatChannelMembers(channelId) {
        return await this.makeRequest('admin', 'get_chat_channel_members', { channel_id: channelId });
    }

    async addChatChannelMember(channelId, userId, role = 'member') {
        return await this.makeRequest('admin', 'add_chat_channel_member', { 
            channel_id: channelId, 
            user_id: userId, 
            role 
        });
    }

    async removeChatChannelMember(channelId, userId) {
        return await this.makeRequest('admin', 'remove_chat_channel_member', { 
            channel_id: channelId, 
            user_id: userId 
        });
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

    // User Theme Preferences (Chat Service)
    async getUserThemePreferences() {
        return await this.makeRequest('chat', 'get_user_theme_preferences');
    }

    async updateUserThemePreferences(preferences) {
        return await this.makeRequest('chat', 'update_user_theme_preferences', preferences);
    }

    // Achievement Management
    async getAchievementStats() {
        return await this.makeRequest('admin', 'get_achievement_stats');
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

    async createTableConfig(configData) {
        return await this.makeRequest('admin', 'create_table_config', configData);
    }

    async deleteTableConfig(configId) {
        return await this.makeRequest('admin', 'delete_table_config', { config_id: configId });
    }

    async getTableViews(tableName = null) {
        return await this.makeRequest('admin', 'get_table_views', { table_name: tableName });
    }

    async getTableData(tableName, filters = {}) {
        return await this.makeRequest('admin', 'get_table_data', { table_name: tableName, ...filters });
    }

    async updateTableData(tableName, rowId, field, value, primaryKey = 'id') {
        return await this.makeRequest('admin', 'update_table_data', {
            table_name: tableName,
            row_id: rowId,
            field,
            value,
            primary_key: primaryKey
        });
    }

    async createTableRow(tableName, rowData) {
        return await this.makeRequest('admin', 'create_table_row', {
            table_name: tableName,
            row_data: rowData
        });
    }

    async deleteTableRow(tableName, rowId, primaryKey = 'id') {
        return await this.makeRequest('admin', 'delete_table_row', {
            table_name: tableName,
            row_id: rowId,
            primary_key: primaryKey
        });
    }

    // Database Table Management
    async getDatabaseTables() {
        return await this.makeRequest('admin', 'get_database_tables');
    }

    // Table Column Management
    async getTableColumns(tableName = null) {
        return await this.makeRequest('admin', 'get_table_columns', { table_name: tableName });
    }

    async createTableColumn(columnData) {
        return await this.makeRequest('admin', 'create_table_column', columnData);
    }

    async updateTableColumn(columnId, columnData) {
        return await this.makeRequest('admin', 'update_table_column', { 
            column_id: columnId, 
            ...columnData 
        });
    }

    async deleteTableColumn(columnId) {
        return await this.makeRequest('admin', 'delete_table_column', { column_id: columnId });
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

    // Personal Dashboard
    async getPersonalDashboard() {
        return await this.makeRequest('admin', 'get_personal_dashboard');
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

    async getDeveloperAnalytics(type = 'overview', range = '30d') {
        return await this.makeRequest('developer', 'get_analytics', { type, range });
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

    async getBackupStatus() {
        return await this.makeRequest('developer', 'get_backup_status');
    }

    async restoreBackup(backupId) {
        return await this.makeRequest('developer', 'restore_backup', { backup_id: backupId });
    }

    async getBackupList() {
        return await this.makeRequest('developer', 'get_backup_list');
    }

    async getBackupStats() {
        return await this.makeRequest('developer', 'get_backup_stats');
    }

    async downloadBackup(filename) {
        return await this.makeRequest('developer', 'download_backup', { filename });
    }

    async cleanupBackups() {
        return await this.makeRequest('developer', 'cleanup_backups');
    }

    async testEmailConfig(emailSettings) {
        return await this.makeRequest('developer', 'test_email_config', emailSettings);
    }

    // Data Management
    async exportData(options = {}) {
        return await this.makeRequest('developer', 'export_data', options);
    }

    async importData(importData) {
        return await this.makeRequest('developer', 'import_data', importData);
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

    // Developer Teams
    async getTeams() {
        return await this.makeRequest('developer', 'get_teams');
    }

    // Developer Categories and Organization Data
    async getDeveloperCategories() {
        return await this.makeRequest('developer', 'get_categories');
    }

    async getDeveloperRequestTypes() {
        return await this.makeRequest('developer', 'get_request_types');
    }

    async getDeveloperSubcategories() {
        return await this.makeRequest('developer', 'get_subcategories');
    }

    async getDeveloperDpssOrg() {
        return await this.makeRequest('developer', 'get_dpss_org');
    }

    async createDeveloperDpssOrg(orgData) {
        return await this.makeRequest('developer', 'create_dpss_org', orgData);
    }

    async updateDeveloperDpssOrg(orgData) {
        return await this.makeRequest('developer', 'update_dpss_org', orgData);
    }

    async deleteDeveloperDpssOrg(type, itemId) {
        return await this.makeRequest('developer', 'delete_dpss_org', { type, id: itemId });
    }

    async getDeveloperSections(options = {}) {
        return await this.makeRequest('developer', 'get_sections', options);
    }

    async createDeveloperSection(sectionData) {
        return await this.makeRequest('developer', 'create_section', sectionData);
    }

    async updateDeveloperSection(sectionData) {
        return await this.makeRequest('developer', 'update_section', sectionData);
    }

    async deleteDeveloperSection(sectionId) {
        return await this.makeRequest('developer', 'delete_section', { id: sectionId });
    }

    // Response Templates
    async getDeveloperResponseTemplates() {
        return await this.makeRequest('developer', 'get_response_templates');
    }

    async createDeveloperResponseTemplate(templateData) {
        return await this.makeRequest('developer', 'create_response_template', templateData);
    }

    async updateDeveloperResponseTemplate(templateData) {
        return await this.makeRequest('developer', 'update_response_template', templateData);
    }

    async deleteDeveloperResponseTemplate(templateId) {
        return await this.makeRequest('developer', 'delete_response_template', { id: templateId });
    }

    // SLA Configurations
    async getDeveloperSlaConfigurations() {
        return await this.makeRequest('developer', 'get_sla_configurations');
    }

    async createDeveloperSlaConfiguration(slaData) {
        return await this.makeRequest('developer', 'create_sla_configuration', slaData);
    }

    async updateDeveloperSlaConfiguration(slaData) {
        return await this.makeRequest('developer', 'update_sla_configuration', slaData);
    }

    async deleteDeveloperSlaConfiguration(slaId) {
        return await this.makeRequest('developer', 'delete_sla_configuration', { id: slaId });
    }

    // Support Teams
    async getDeveloperSupportTeams() {
        return await this.makeRequest('developer', 'get_support_teams');
    }

    async createDeveloperSupportTeam(teamData) {
        return await this.makeRequest('developer', 'create_support_team', teamData);
    }

    async updateDeveloperSupportTeam(teamData) {
        return await this.makeRequest('developer', 'update_support_team', teamData);
    }

    async deleteDeveloperSupportTeam(type, itemId) {
        return await this.makeRequest('developer', 'delete_support_team', { type, id: itemId });
    }

    // Portal Settings
    async getDeveloperPortalSettings() {
        return await this.makeRequest('developer', 'get_portal_settings');
    }

    async updateDeveloperPortalSettings(settings) {
        return await this.makeRequest('developer', 'update_portal_settings', settings);
    }

    async resetDeveloperPortalSettings() {
        return await this.makeRequest('developer', 'reset_portal_settings');
    }

    async testDeveloperPortalEmail() {
        return await this.makeRequest('developer', 'test_portal_email');
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

    // Additional utility methods for exact service mapping compatibility
    async getOrganization() {
        return await this.makeRequest('utilities', 'get_organization');
    }

    async getCategories() {
        return await this.makeRequest('utilities', 'get_categories');
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

    // Public Portal Queue Management
    async getPublicQueueGuests() {
        return await this.makeRequest('public', 'get_queue_guests');
    }

    async getPublicQueueStaff() {
        return await this.makeRequest('public', 'get_queue_staff');
    }

    async getStaffWorkModes() {
        return await this.makeRequest('staff', 'get_work_modes');
    }

    async updateStaffWorkMode(workMode, statusMessage = '') {
        return await this.makeRequest('staff', 'update_work_mode', { 
            work_mode: workMode, 
            status_message: statusMessage 
        });
    }

    async updateStaffWorkModeSettings(settings) {
        return await this.makeRequest('staff', 'update_work_mode', settings);
    }

    async autoAssignGuestToAgent(sessionId) {
        return await this.makeRequest('public', 'auto_assign_guest', {
            session_id: sessionId
        }, false);
    }

    async removeGuestFromQueue(sessionId) {
        return await this.makeRequest('public', 'remove_guest_from_queue', {
            session_id: sessionId
        });
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

    // Staff ticket attachment methods
    async getTicketAttachment(id) {
        return await this.makeRequest('tickets', 'get_attachment', { id });
    }

    async uploadTicketAttachment(file, ticketData = {}) {
        return await this.makeRequest('tickets', 'upload_attachment', { file, ...ticketData });
    }

    async deleteTicketAttachment(id) {
        return await this.makeRequest('tickets', 'delete_attachment', { id });
    }

    // Staff ticket operations
    async getStaffTickets(filters = {}) {
        return await this.makeRequest('tickets', 'list_staff', filters);
    }

    async createStaffTicket(ticketData) {
        return await this.makeRequest('tickets', 'create_staff', ticketData);
    }

    async performTicketAction(ticketId, action, data = {}) {
        return await this.makeRequest('tickets', `${action}_ticket`, { ticket_id: ticketId, ...data });
    }

    // Ticket comments
    async getTicketComments(ticketId) {
        return await this.makeRequest('tickets', 'get_comments', { ticket_id: ticketId });
    }

    async addTicketComment(ticketId, commentText) {
        return await this.makeRequest('tickets', 'add_comment', { ticket_id: ticketId, comment_text: commentText });
    }

    async deleteTicketComment(ticketId, commentId) {
        return await this.makeRequest('tickets', 'delete_comment', { ticket_id: ticketId, comment_id: commentId });
    }

    async markCommentsAsRead(ticketId) {
        return await this.makeRequest('tickets', 'mark_comments_read', { ticket_id: ticketId });
    }

    async updateTicket(ticketId, ticketData) {
        return await this.makeRequest('tickets', 'update', { ticket_id: ticketId, ...ticketData });
    }

    async createTicket(data) {
        // Legacy ticket creation - may need routing to appropriate service
        return await this.makeRequest('admin', 'create_ticket', data);
    }

    async createPublicTicket(data) {
        // Public portal ticket creation
        return await this.makeRequest('public', 'create_ticket', data, false);
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

    // Ticket-specific methods
    async getTicketAssignableUsers() {
        return await this.makeRequest('tickets', 'get_assignable_users');
    }

    async getDropdownData() {
        return await this.makeRequest('utilities', 'get_dropdown_data');
    }

    // Developer Role Management
    async createDeveloperRole(roleData) {
        return await this.makeRequest('developer', 'create_role', roleData);
    }

    async updateDeveloperRole(roleData) {
        return await this.makeRequest('developer', 'update_role', roleData);
    }

    async deleteDeveloperRole(roleId) {
        return await this.makeRequest('developer', 'delete_role', { id: roleId });
    }

    // Developer Team Management
    async createDeveloperTeam(teamData) {
        return await this.makeRequest('developer', 'create_team', teamData);
    }

    async updateDeveloperTeam(teamData) {
        return await this.makeRequest('developer', 'update_team', teamData);
    }

    async deleteDeveloperTeam(teamId) {
        return await this.makeRequest('developer', 'delete_team', { id: teamId });
    }

    // GIF/Chat Settings
    async getGifSettings() {
        return await this.makeRequest('admin', 'get_chat_settings', { category: 'giphy' });
    }

    async getGifRateLimit() {
        return await this.makeRequest('chat', 'get_gif_rate_limit');
    }

    async logGifUsage(gifData) {
        return await this.makeRequest('chat', 'log_gif_usage', gifData);
    }

    async getChatUISettings() {
        return await this.makeRequest('chat', 'get_ui_settings');
    }

    // Achievement System  
    async getAchievements() {
        return await this.makeRequest('achievements', 'get_achievements');
    }

    async claimAchievement(achievementId) {
        return await this.makeRequest('achievements', 'claim_achievement', { achievement_id: achievementId });
    }

    async refreshAchievements() {
        return await this.makeRequest('achievements', 'refresh_achievements');
    }

    // Staff Active Chats
    async getStaffActiveChats() {
        return await this.makeRequest('public', 'get_staff_active_chats');
    }

    // Developer Settings
    async getDeveloperSettings() {
        return await this.makeRequest('developer', 'get_settings');
    }

    async updateDeveloperSettings(settings) {
        return await this.makeRequest('developer', 'update_settings', settings);
    }

    // Dashboard Settings
    async getDashboardSettings() {
        return await this.makeRequest('admin', 'get_dashboard_settings');
    }

    async updateDashboardSettings(settings) {
        return await this.makeRequest('admin', 'update_dashboard_settings', settings);
    }

    // System Initialization
    async systemInit() {
        return await this.makeRequest('system', 'init', {}, false);
    }

    // Presence Management
    async getChatPresence() {
        return await this.makeRequest('chat', 'get_presence');
    }

    // User Profile Management
    async uploadProfilePicture(file, userId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId.toString());
        
        return await this.makeRequest('users', 'upload_profile_picture', { formData });
    }

    async removeProfilePicture(userId) {
        return await this.makeRequest('users', 'remove_profile_picture', { user_id: userId });
    }

    async updateUserProfile(userId, profileData) {
        return await this.makeRequest('users', 'update_profile', { user_id: userId, ...profileData });
    }

    // Chat Messages
    async getChatMessages(channelId, limit = 50) {
        return await this.makeRequest('chat', 'get_messages', { channel_id: channelId, limit });
    }

    async uploadChatFile(formData) {
        return await this.makeRequest('chat', 'upload_file', { formData });
    }

    // Public Ticket Status
    async getPublicTicketStatus(ticketNumber) {
        return await this.makeRequest('public', 'get_ticket_status', { ticket_number: ticketNumber }, false);
    }

    // Staff Ticket Attachments
    async deleteStaffTicketAttachment(attachmentId) {
        return await this.makeRequest('staff', 'delete_ticket_attachment', { attachment_id: attachmentId });
    }

    async uploadStaffTicketAttachment(formData) {
        return await this.makeRequest('staff', 'upload_ticket_attachment', { formData });
    }

    async getStaffTicketAttachments(ticketId) {
        return await this.makeRequest('staff', 'get_ticket_attachments', { ticket_id: ticketId });
    }

    async downloadStaffTicketAttachment(attachmentId) {
        return await this.makeRequest('staff', 'get_ticket_attachment', { attachment_id: attachmentId });
    }

    // Developer Categories Management
    async createDeveloperCategory(categoryData) {
        return await this.makeRequest('developer', 'create_category', categoryData);
    }

    async updateDeveloperCategory(categoryData) {
        return await this.makeRequest('developer', 'update_category', categoryData);
    }

    async deleteDeveloperCategory(categoryId) {
        return await this.makeRequest('developer', 'delete_category', { id: categoryId });
    }

    // Developer Request Types Management
    async createDeveloperRequestType(requestTypeData) {
        return await this.makeRequest('developer', 'create_request_type', requestTypeData);
    }

    async updateDeveloperRequestType(requestTypeData) {
        return await this.makeRequest('developer', 'update_request_type', requestTypeData);
    }

    async deleteDeveloperRequestType(requestTypeId) {
        return await this.makeRequest('developer', 'delete_request_type', { id: requestTypeId });
    }

    // Developer Subcategories Management
    async createDeveloperSubcategory(subcategoryData) {
        return await this.makeRequest('developer', 'create_subcategory', subcategoryData);
    }

    async updateDeveloperSubcategory(subcategoryData) {
        return await this.makeRequest('developer', 'update_subcategory', subcategoryData);
    }

    async deleteDeveloperSubcategory(subcategoryId) {
        return await this.makeRequest('developer', 'delete_subcategory', { id: subcategoryId });
    }

    // Developer DPSS Organization Management
    async createDeveloperDpssOrg(orgData) {
        return await this.makeRequest('developer', 'create_dpss_org', orgData);
    }

    async updateDeveloperDpssOrg(orgData) {
        return await this.makeRequest('developer', 'update_dpss_org', orgData);
    }

    async deleteDeveloperDpssOrg(type, itemId) {
        return await this.makeRequest('developer', 'delete_dpss_org', { type, id: itemId });
    }

    // Chat Widget Messages
    async getChatWidgetMessages(channelId, limit = 5) {
        return await this.makeRequest('chat', 'get_messages', { channel_id: channelId, limit });
    }

    // Achievement Management
    async createAchievement(achievementData) {
        return await this.makeRequest('admin', 'create_achievement', achievementData);
    }

    async updateAchievement(achievementId, achievementData) {
        return await this.makeRequest('admin', 'update_achievement', { id: achievementId, ...achievementData });
    }

    // Achievement Toast Configuration
    async updateToastConfig(config) {
        return await this.makeRequest('admin', 'update_toast_config', config);
    }

    // Achievement Catalog Management
    async createAchievement(achievementData) {
        return await this.makeRequest('admin', 'create_achievement', achievementData);
    }

    async updateAchievement(achievementId, achievementData) {
        return await this.makeRequest('admin', 'update_achievement', { achievement_id: achievementId, ...achievementData });
    }

    async deleteAchievement(achievementId) {
        return await this.makeRequest('admin', 'delete_achievement', { achievement_id: achievementId });
    }

    async cloneAchievement(achievementId) {
        return await this.makeRequest('admin', 'clone_achievement', { achievement_id: achievementId });
    }

    async reorderAchievement(achievementId, newOrder) {
        return await this.makeRequest('admin', 'reorder_achievement', { achievement_id: achievementId, new_order: newOrder });
    }

    // Public Chat Messages
    async getPublicChatMessages(sessionId) {
        return await this.makeRequest('public', 'get_chat_messages', { session_id: sessionId });
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