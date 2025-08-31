/**
 * Authentication Service
 * Handles all authentication-related operations
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError, UnauthorizedError } from '@/lib/api-gateway/context';
import { authenticateUser, generateToken, getUserPermissions, getAccessibleQueues } from '@/lib/auth';
import { initDB } from '@/lib/database';

export class AuthService extends BaseService {
  private dbInitialized = false;

  constructor() {
    super('auth');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    // Initialize database if needed
    if (!this.dbInitialized) {
      await initDB();
      this.dbInitialized = true;
    }

    switch (action) {
      case 'login':
        return this.login(data, context);
      case 'logout':
        return this.logout(data, context);
      case 'get_current_user':
        return this.getCurrentUser(data, context);
      case 'verify_token':
        return this.verifyToken(data, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * User login
   */
  private async login(data: any, context: RequestContext): Promise<any> {
    this.log(context, 'Processing login request');
    
    // Validate required fields
    this.validateRequiredFields(data, ['username', 'password']);
    this.validateFieldTypes(data, {
      username: 'string',
      password: 'string'
    });

    const { username, password } = data;

    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    try {
      // Authenticate user
      const user = await authenticateUser(username, password);
      if (!user) {
        this.log(context, `Login failed for username: ${username}`, { 
          clientIP: context.clientIP 
        });
        throw new UnauthorizedError('Invalid username or password');
      }

      // Generate token and get user permissions
      const token = generateToken(user);
      const permissions = await getUserPermissions(user);
      const accessibleQueues = await getAccessibleQueues(user);

      this.log(context, `Login successful for user: ${username}`, {
        userId: user.id,
        role: user.role,
        permissionCount: permissions.length,
        queueCount: accessibleQueues.length
      });

      return this.success({
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          role: user.role,
          team_id: user.team_id,
          section_id: user.section_id,
          permissions,
          accessible_queues: accessibleQueues,
          can_switch_queues: accessibleQueues.length > 1,
          home_queue: user.team_id,
          login_preferences: user.login_preferences,
          profile_picture: user.profile_picture
        },
        token
      }, 'Login successful');

    } catch (error) {
      this.logError(context, 'Login error', error);
      
      if (error instanceof UnauthorizedError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('An error occurred during login');
    }
  }

  /**
   * User logout
   */
  private async logout(data: any, context: RequestContext): Promise<any> {
    // Require authentication
    this.requirePermission(context, []);
    
    this.log(context, 'Processing logout request', {
      username: context.user?.username
    });

    // In a real implementation, you might want to:
    // - Invalidate the token in a blacklist
    // - Update user's last seen timestamp
    // - Log the logout event
    
    return this.success({
      message: 'Logged out successfully'
    });
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser(data: any, context: RequestContext): Promise<any> {
    // Require authentication
    this.requirePermission(context, []);

    if (!context.user) {
      throw new UnauthorizedError('No authenticated user');
    }

    this.log(context, 'Returning current user info', {
      username: context.user.username
    });

    return this.success({
      user: {
        id: context.user.id,
        username: context.user.username,
        display_name: context.user.display_name,
        email: context.user.email,
        role: context.user.role,
        team_id: context.user.team_id,
        section_id: context.user.section_id,
        permissions: context.permissions,
        accessible_queues: context.user.accessible_queues,
        can_switch_queues: (context.user.accessible_queues?.length || 0) > 1,
        home_queue: context.user.team_id,
        login_preferences: context.user.login_preferences,
        profile_picture: context.user.profile_picture
      }
    });
  }

  /**
   * Verify token validity
   */
  private async verifyToken(data: any, context: RequestContext): Promise<any> {
    if (!context.isAuthenticated || !context.user) {
      return this.success({
        valid: false,
        reason: 'Invalid or expired token'
      });
    }

    this.log(context, 'Token verification successful', {
      username: context.user.username
    });

    return this.success({
      valid: true,
      user: {
        username: context.user.username,
        display_name: context.user.display_name,
        role: context.user.role,
        permissions: context.permissions
      }
    });
  }

  /**
   * Health check for the auth service
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connection by checking if we can query users table
      if (!this.dbInitialized) {
        await initDB();
        this.dbInitialized = true;
      }
      
      return {
        status: 'healthy',
        database: 'connected',
        service: 'AuthService',
        features: ['login', 'logout', 'user_info', 'token_verification']
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        service: 'AuthService'
      };
    }
  }
}