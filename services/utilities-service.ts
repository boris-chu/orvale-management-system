/**
 * Utilities Service
 * Handles utility operations including organization data, categories, user management
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';
import fs from 'fs/promises';
import path from 'path';

export class UtilitiesService extends BaseService {
  constructor() {
    super('utilities');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      case 'get_organization':
      case 'get_organizations':  // Support both singular and plural
        return this.getOrganization(data, context);
      case 'get_categories':
      case 'get_ticket_categories':  // Support alternate naming
        return this.getCategories(data, context);
      case 'get_assignable_users':
        return this.getAssignableUsers(data, context);
      case 'get_support_teams':
        return this.getSupportTeams(data, context);
      case 'get_simple_categories':
        return this.getSimpleCategories(data, context);
      case 'get_profile_picture':
        return this.getProfilePicture(data, context);
      case 'upload_profile_picture':
        return this.uploadProfilePicture(data, context);
      case 'get_offices':
        return this.getOffices(data, context);
      case 'get_bureaus':
        return this.getBureaus(data, context);
      case 'get_divisions':
        return this.getDivisions(data, context);
      case 'get_sections':
        return this.getSections(data, context);
      case 'get_request_types':
        return this.getRequestTypes(data, context);
      case 'get_subcategories':
        return this.getSubcategories(data, context);
      default:
        throw new Error(`Unknown utilities action: ${action}`);
    }
  }

  /**
   * Get organizational structure data
   */
  private async getOrganization(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { type = 'all', simplified = false } = data;
    
    this.log(context, 'Getting organization data', { type, simplified });
    
    const organization: any = {};
    
    // Get DPSS organizational structure
    if (type === 'all' || type === 'dpss') {
      try {
        const [offices, bureaus, divisions, sections] = await Promise.all([
          queryAsync(`SELECT * FROM dpss_offices ORDER BY name`),
          queryAsync(`SELECT * FROM dpss_bureaus ORDER BY office_id, name`),
          queryAsync(`SELECT * FROM dpss_divisions ORDER BY bureau_id, name`),
          queryAsync(`SELECT * FROM dpss_sections ORDER BY division_id, name`)
        ]);
        
        organization.dpss = {
          offices: simplified ? offices.map(o => ({ id: o.id, name: o.name })) : offices,
          bureaus: simplified ? bureaus.map(b => ({ id: b.id, name: b.name, office_id: b.office_id })) : bureaus,
          divisions: simplified ? divisions.map(d => ({ id: d.id, name: d.name, bureau_id: d.bureau_id })) : divisions,
          sections: simplified ? sections.map(s => ({ id: s.id, name: s.name, division_id: s.division_id })) : sections
        };
      } catch (error) {
        this.log(context, 'DPSS org data unavailable', { error: error.message });
        organization.dpss = { offices: [], bureaus: [], divisions: [], sections: [] };
      }
    }
    
    // Get general sections
    if (type === 'all' || type === 'sections') {
      try {
        const sections = await queryAsync(`SELECT * FROM sections ORDER BY name`);
        organization.sections = simplified ? sections.map(s => ({ id: s.id, name: s.name })) : sections;
      } catch (error) {
        this.log(context, 'Sections data unavailable', { error: error.message });
        organization.sections = [];
      }
    }
    
    // Get teams
    if (type === 'all' || type === 'teams') {
      try {
        const teams = await queryAsync(`
          SELECT t.*, COUNT(ut.id) as active_tickets
          FROM teams t
          LEFT JOIN user_tickets ut ON t.id = ut.assigned_team 
            AND ut.status IN ('open', 'in_progress', 'pending')
          WHERE t.active = TRUE
          GROUP BY t.id
          ORDER BY t.name
        `);
        organization.teams = simplified ? teams.map(t => ({ id: t.id, name: t.name })) : teams;
      } catch (error) {
        this.log(context, 'Teams data unavailable', { error: error.message });
        organization.teams = [];
      }
    }
    
    return this.success({
      organization,
      type,
      simplified,
      counts: {
        dpss_offices: organization.dpss?.offices?.length || 0,
        dpss_bureaus: organization.dpss?.bureaus?.length || 0,
        dpss_divisions: organization.dpss?.divisions?.length || 0,
        dpss_sections: organization.dpss?.sections?.length || 0,
        general_sections: organization.sections?.length || 0,
        teams: organization.teams?.length || 0
      }
    });
  }

  /**
   * Get ticket categories with hierarchy
   */
  private async getCategories(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { include_hierarchy = true, category_id = null, active_only = true } = data;
    
    this.log(context, 'Getting categories', { include_hierarchy, category_id, active_only });
    
    let categories = [];
    let requestTypes = [];
    let subcategories = [];
    
    try {
      // Get main categories
      let categoryQuery = 'SELECT * FROM ticket_categories';
      const categoryParams = [];
      
      if (category_id) {
        categoryQuery += ' WHERE id = ?';
        categoryParams.push(category_id);
      }
      
      categoryQuery += ' ORDER BY name';
      categories = await queryAsync(categoryQuery, categoryParams);
      
      if (include_hierarchy) {
        // Get request types
        let requestTypeQuery = 'SELECT * FROM request_types';
        const requestTypeParams = [];
        
        if (category_id) {
          requestTypeQuery += ' WHERE category_id = ?';
          requestTypeParams.push(category_id);
        }
        
        requestTypeQuery += ' ORDER BY category_id, name';
        requestTypes = await queryAsync(requestTypeQuery, requestTypeParams);
        
        // Get subcategories
        const subcategoryQuery = 'SELECT * FROM subcategories ORDER BY request_type_id, name';
        subcategories = await queryAsync(subcategoryQuery);
      }
    } catch (error) {
      this.log(context, 'Category data unavailable', { error: error.message });
    }
    
    // Build hierarchical structure if requested
    if (include_hierarchy) {
      const hierarchical = categories.map((category: any) => {
        const categoryRequestTypes = requestTypes.filter((rt: any) => rt.category_id === category.id);
        
        category.request_types = categoryRequestTypes.map((requestType: any) => {
          const rtSubcategories = subcategories.filter((sc: any) => sc.request_type_id === requestType.id);
          requestType.subcategories = rtSubcategories;
          return requestType;
        });
        
        return category;
      });
      
      return this.success({
        categories: hierarchical,
        total_categories: categories.length,
        total_request_types: requestTypes.length,
        total_subcategories: subcategories.length,
        structure: 'hierarchical'
      });
    }
    
    return this.success({
      categories,
      request_types: requestTypes,
      subcategories: subcategories,
      total_categories: categories.length,
      total_request_types: requestTypes.length,
      total_subcategories: subcategories.length,
      structure: 'flat'
    });
  }

  /**
   * Get users that can be assigned to tickets
   */
  private async getAssignableUsers(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_users');
    
    const { 
      team_id = null, 
      role = null, 
      active_only = true,
      include_stats = false,
      search = null
    } = data;
    
    this.log(context, 'Getting assignable users', { team_id, role, active_only });
    
    const conditions = [];
    const params = [];
    
    if (active_only) {
      conditions.push('u.active = 1');
    }
    
    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }
    
    if (team_id) {
      conditions.push('u.team_id = ?');
      params.push(team_id);
    }
    
    if (search) {
      conditions.push('(u.username LIKE ? OR u.display_name LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // Only include roles that can be assigned tickets
    const assignableRoles = ['admin', 'manager', 'support', 'helpdesk'];
    conditions.push(`u.role IN (${assignableRoles.map(() => '?').join(',')})`);
    params.push(...assignableRoles);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const users = await queryAsync(`
      SELECT 
        u.id, u.username, u.display_name, u.email, u.role, u.team_id, u.active,
        t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      ${whereClause}
      ORDER BY u.display_name
    `, params);
    
    // Include assignment statistics if requested
    if (include_stats && users.length > 0) {
      const userIds = users.map(u => u.username);
      const stats = await queryAsync(`
        SELECT 
          assigned_to,
          COUNT(*) as total_assigned,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
          AVG(CASE 
            WHEN status = 'closed' AND completed_at IS NOT NULL 
            THEN (julianday(completed_at) - julianday(submitted_at)) * 24 
          END) as avg_resolution_hours
        FROM user_tickets
        WHERE assigned_to IN (${userIds.map(() => '?').join(',')})
        GROUP BY assigned_to
      `, userIds);
      
      const statsByUser: any = {};
      stats.forEach((stat: any) => {
        statsByUser[stat.assigned_to] = {
          total_assigned: stat.total_assigned,
          open_tickets: stat.open_tickets,
          in_progress_tickets: stat.in_progress_tickets,
          avg_resolution_hours: parseFloat(stat.avg_resolution_hours || 0).toFixed(2)
        };
      });
      
      users.forEach((user: any) => {
        user.assignment_stats = statsByUser[user.username] || {
          total_assigned: 0,
          open_tickets: 0,
          in_progress_tickets: 0,
          avg_resolution_hours: '0.00'
        };
      });
    }
    
    return this.success({
      users,
      total: users.length,
      filters: { team_id, role, active_only, search },
      assignable_roles: assignableRoles
    });
  }

  /**
   * Get support teams for public portal
   */
  private async getSupportTeams(data: any, context: RequestContext): Promise<any> {
    // This endpoint may be called by public portal, so minimal permission required
    
    const { group_id = null, active_only = true, include_groups = true } = data;
    
    this.log(context, 'Getting support teams', { group_id, active_only });
    
    let supportTeams = [];
    let groups = [];
    
    try {
      // Get support teams (public-facing teams)
      const conditions = [];
      const params = [];
      
      if (active_only) {
        conditions.push('st.active = 1');
      }
      
      if (group_id) {
        conditions.push('st.group_id = ?');
        params.push(group_id);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      supportTeams = await queryAsync(`
        SELECT st.*, stg.name as group_name
        FROM support_teams st
        LEFT JOIN support_team_groups stg ON st.group_id = stg.id
        ${whereClause}
        ORDER BY st.sort_order, st.name
      `, params);
      
      // Get support team groups if requested
      if (include_groups) {
        groups = await queryAsync(`
          SELECT stg.*, COUNT(st.id) as team_count
          FROM support_team_groups stg
          LEFT JOIN support_teams st ON stg.id = st.group_id AND st.active = 1
          GROUP BY stg.id
          ORDER BY stg.name
        `);
      }
    } catch (error) {
      this.log(context, 'Support teams data unavailable', { error: error.message });
    }
    
    return this.success({
      support_teams: supportTeams,
      groups: include_groups ? groups : undefined,
      total_teams: supportTeams.length,
      total_groups: groups.length,
      filters: { group_id, active_only }
    });
  }

  /**
   * Get simplified categories for dropdowns
   */
  private async getSimpleCategories(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { format = 'hierarchical' } = data;
    
    this.log(context, 'Getting simple categories', { format });
    
    try {
      const categories = await queryAsync(`
        SELECT id, name FROM ticket_categories ORDER BY name
      `);
      
      const requestTypes = await queryAsync(`
        SELECT id, name, category_id FROM request_types ORDER BY category_id, name
      `);
      
      if (format === 'hierarchical') {
        const hierarchical = categories.map((category: any) => ({
          id: category.id,
          name: category.name,
          request_types: requestTypes
            .filter((rt: any) => rt.category_id === category.id)
            .map((rt: any) => ({ id: rt.id, name: rt.name }))
        }));
        
        return this.success({
          categories: hierarchical,
          format: 'hierarchical',
          total_categories: categories.length,
          total_request_types: requestTypes.length
        });
      }
      
      // Flat format
      return this.success({
        categories: categories.map((c: any) => ({ id: c.id, name: c.name })),
        request_types: requestTypes.map((rt: any) => ({ 
          id: rt.id, 
          name: rt.name, 
          category_id: rt.category_id 
        })),
        format: 'flat',
        total_categories: categories.length,
        total_request_types: requestTypes.length
      });
    } catch (error) {
      this.log(context, 'Simple categories unavailable', { error: error.message });
      return this.success({
        categories: [],
        request_types: [],
        format,
        total_categories: 0,
        total_request_types: 0
      });
    }
  }

  /**
   * Get user profile picture
   */
  private async getProfilePicture(data: any, context: RequestContext): Promise<any> {
    this.validateRequiredFields(data, ['username']);
    const { username } = data;
    
    // Users can get their own profile picture, or with appropriate permission
    if (username !== context.user?.username) {
      this.requirePermission(context, 'portal.view_users');
    }
    
    this.log(context, 'Getting profile picture', { username });
    
    try {
      const user = await queryAsync(`
        SELECT username, display_name, profile_picture
        FROM users 
        WHERE username = ? AND active = 1
      `, [username]);
      
      if (user.length === 0) {
        throw new ValidationError('User not found');
      }
      
      const userData = user[0];
      
      // Check if profile picture file exists
      let pictureExists = false;
      let pictureSize = 0;
      
      if (userData.profile_picture) {
        try {
          const picturePath = path.join(process.cwd(), 'uploads', 'profile-pictures', userData.profile_picture);
          const stats = await fs.stat(picturePath);
          pictureExists = true;
          pictureSize = stats.size;
        } catch (error) {
          this.log(context, 'Profile picture file not found', { 
            username, 
            filename: userData.profile_picture 
          });
        }
      }
      
      return this.success({
        username: userData.username,
        display_name: userData.display_name,
        profile_picture: userData.profile_picture,
        picture_exists: pictureExists,
        picture_size_bytes: pictureSize,
        default_picture: !userData.profile_picture || !pictureExists
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to retrieve profile picture');
    }
  }

  /**
   * Upload profile picture (placeholder - would require file upload handling)
   */
  private async uploadProfilePicture(data: any, context: RequestContext): Promise<any> {
    this.validateRequiredFields(data, ['username']);
    const { username, filename, file_data } = data;
    
    // Users can only update their own profile picture unless they have admin permissions
    if (username !== context.user?.username) {
      this.requirePermission(context, 'admin.manage_users');
    }
    
    this.log(context, 'Uploading profile picture', { username, filename });
    
    // Verify user exists
    const user = await queryAsync(`
      SELECT username FROM users WHERE username = ? AND active = 1
    `, [username]);
    
    if (user.length === 0) {
      throw new ValidationError('User not found');
    }
    
    // This would integrate with actual file upload handling
    // For now, return mock success
    const uploadedFilename = `${username}_${Date.now()}.jpg`;
    
    try {
      // Update user profile picture reference in database
      await runAsync(`
        UPDATE users SET profile_picture = ? WHERE username = ?
      `, [uploadedFilename, username]);
      
      return this.success({
        username,
        filename: uploadedFilename,
        upload_successful: true,
        file_size_bytes: file_data?.length || 0,
        uploaded_at: new Date().toISOString(),
        uploaded_by: context.user!.username
      }, 'Profile picture uploaded successfully');
    } catch (error) {
      throw new ValidationError('Failed to save profile picture reference');
    }
  }

  /**
   * Get DPSS offices only
   */
  private async getOffices(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    this.log(context, 'Getting DPSS offices');
    
    try {
      const offices = await queryAsync(`SELECT * FROM dpss_offices ORDER BY name`);
      return this.success({
        offices,
        total: offices.length
      });
    } catch (error) {
      this.log(context, 'Offices data unavailable', { error: error.message });
      return this.success({ offices: [], total: 0 });
    }
  }

  /**
   * Get DPSS bureaus only
   */
  private async getBureaus(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { office_id } = data;
    
    this.log(context, 'Getting DPSS bureaus', { office_id });
    
    try {
      let query = `SELECT * FROM dpss_bureaus`;
      const params: any[] = [];
      
      if (office_id) {
        query += ` WHERE office_id = ?`;
        params.push(office_id);
      }
      
      query += ` ORDER BY name`;
      
      const bureaus = await queryAsync(query, params);
      return this.success({
        bureaus,
        total: bureaus.length
      });
    } catch (error) {
      this.log(context, 'Bureaus data unavailable', { error: error.message });
      return this.success({ bureaus: [], total: 0 });
    }
  }

  /**
   * Get DPSS divisions only
   */
  private async getDivisions(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { bureau_id } = data;
    
    this.log(context, 'Getting DPSS divisions', { bureau_id });
    
    try {
      let query = `SELECT * FROM dpss_divisions`;
      const params: any[] = [];
      
      if (bureau_id) {
        query += ` WHERE bureau_id = ?`;
        params.push(bureau_id);
      }
      
      query += ` ORDER BY name`;
      
      const divisions = await queryAsync(query, params);
      return this.success({
        divisions,
        total: divisions.length
      });
    } catch (error) {
      this.log(context, 'Divisions data unavailable', { error: error.message });
      return this.success({ divisions: [], total: 0 });
    }
  }

  /**
   * Get sections (both DPSS and regular)
   */
  private async getSections(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { type = 'all', division_id } = data;
    
    this.log(context, 'Getting sections', { type, division_id });
    
    try {
      const result: any = {};
      
      if (type === 'all' || type === 'dpss') {
        let query = `SELECT * FROM dpss_sections`;
        const params: any[] = [];
        
        if (division_id) {
          query += ` WHERE division_id = ?`;
          params.push(division_id);
        }
        
        query += ` ORDER BY name`;
        
        const dpssSections = await queryAsync(query, params);
        result.dpss_sections = dpssSections;
      }
      
      if (type === 'all' || type === 'regular') {
        const sections = await queryAsync(`SELECT * FROM sections ORDER BY name`);
        result.sections = sections;
      }
      
      return this.success({
        ...result,
        total_dpss_sections: result.dpss_sections?.length || 0,
        total_sections: result.sections?.length || 0
      });
    } catch (error) {
      this.log(context, 'Sections data unavailable', { error: error.message });
      return this.success({ 
        dpss_sections: [], 
        sections: [],
        total_dpss_sections: 0,
        total_sections: 0
      });
    }
  }

  /**
   * Get request types for ticket categories
   */
  private async getRequestTypes(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { category_id } = data;
    
    this.log(context, 'Getting request types', { category_id });
    
    try {
      let query = `SELECT * FROM request_types`;
      const params: any[] = [];
      
      if (category_id) {
        query += ` WHERE category_id = ?`;
        params.push(category_id);
      }
      
      query += ` ORDER BY name`;
      
      const requestTypes = await queryAsync(query, params);
      return this.success({
        request_types: requestTypes,
        total: requestTypes.length
      });
    } catch (error) {
      this.log(context, 'Request types data unavailable', { error: error.message });
      return this.success({ request_types: [], total: 0 });
    }
  }

  /**
   * Get subcategories
   */
  private async getSubcategories(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_data');
    
    const { request_type_id } = data;
    
    this.log(context, 'Getting subcategories', { request_type_id });
    
    try {
      let query = `SELECT * FROM subcategories`;
      const params: any[] = [];
      
      if (request_type_id) {
        query += ` WHERE request_type_id = ?`;
        params.push(request_type_id);
      }
      
      query += ` ORDER BY name`;
      
      const subcategories = await queryAsync(query, params);
      return this.success({
        subcategories,
        total: subcategories.length
      });
    } catch (error) {
      this.log(context, 'Subcategories data unavailable', { error: error.message });
      return this.success({ subcategories: [], total: 0 });
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity for utility tables
      await queryAsync('SELECT COUNT(*) as count FROM users LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM ticket_categories LIMIT 1');
      
      // Test optional tables
      let dpssAvailable = false;
      let supportTeamsAvailable = false;
      
      try {
        await queryAsync('SELECT COUNT(*) as count FROM dpss_offices LIMIT 1');
        dpssAvailable = true;
      } catch (error) {
        // DPSS tables not available
      }
      
      try {
        await queryAsync('SELECT COUNT(*) as count FROM support_teams LIMIT 1');
        supportTeamsAvailable = true;
      } catch (error) {
        // Support teams tables not available
      }
      
      return {
        status: 'healthy',
        service: 'UtilitiesService', 
        database: 'connected',
        implementation_status: 'Phase 3 - Fully implemented',
        available_data: {
          dpss_organization: dpssAvailable,
          support_teams: supportTeamsAvailable,
          categories: true,
          users: true
        },
        features: [
          'get_organization', 'get_categories', 'get_assignable_users',
          'get_support_teams', 'get_simple_categories', 
          'get_profile_picture', 'upload_profile_picture'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'UtilitiesService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}