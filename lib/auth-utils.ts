/**
 * Auth Utils - Authentication utilities for API routes
 * Provides JWT verification and user permission checking
 */

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getAsync } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'orvale-management-system-secret-key-2025';

export interface AuthenticatedUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  team_id?: string;
  section_id?: string;
  active: boolean;
  permissions?: string[];
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Verify JWT token and return user data with permissions
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : request.cookies.get('jwt')?.value;

    if (!token) {
      return { success: false, error: 'No authentication token provided' };
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Get user data from database
    const user = await getAsync(
      'SELECT * FROM users WHERE username = ? AND active = TRUE',
      [decoded.username]
    );

    if (!user) {
      return { success: false, error: 'User not found or inactive' };
    }

    // Get user permissions through role
    const permissions = await getUserPermissions(user.role);
    console.log('🔍 Auth Debug - User:', user.username, 'Role:', user.role, 'Permissions loaded:', permissions.length);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
      section_id: user.section_id,
      active: user.active,
      permissions
    };

    return { success: true, user: authenticatedUser };

  } catch (error) {
    console.error('Auth verification error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get user permissions by role
 */
export async function getUserPermissions(role: string): Promise<string[]> {
  try {
    // Role parameter is actually the role ID, not name
    const roleData = await getAsync(
      'SELECT * FROM roles WHERE id = ?',
      [role]
    );

    if (!roleData) {
      console.log('⚠️ Role not found:', role);
      return [];
    }

    // Get all permissions for this role
    const permissions = await getAsync(
      `SELECT GROUP_CONCAT(rp.permission_id) as permissions
       FROM role_permissions rp 
       WHERE rp.role_id = ?`,
      [roleData.id]
    ) as any;

    if (!permissions?.permissions) {
      console.log('⚠️ No permissions found for role:', role);
      return [];
    }

    const permissionsList = permissions.permissions.split(',').filter(Boolean);
    console.log('✅ Loaded permissions for role', role, ':', permissionsList.length, 'permissions');
    
    return permissionsList;

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  if (!user.permissions) return false;
  
  // Admin role has all permissions
  if (user.role === 'admin') return true;
  
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthenticatedUser, permissions: string[]): boolean {
  if (!user.permissions) return false;
  
  // Admin role has all permissions
  if (user.role === 'admin') return true;
  
  return permissions.some(permission => user.permissions!.includes(permission));
}

/**
 * Extract user ID from JWT token (for Socket.io authentication)
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.username;
  } catch (error) {
    return null;
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: AuthenticatedUser): string {
  const payload = {
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Middleware-style auth check for API routes
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success) {
    return authResult;
  }

  return authResult;
}

/**
 * Require specific permission for API access
 */
export async function requirePermission(request: NextRequest, permission: string): Promise<AuthResult> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  if (!hasPermission(authResult.user, permission)) {
    return { 
      success: false, 
      error: `Insufficient permissions. Required: ${permission}` 
    };
  }

  return authResult;
}

/**
 * Require any of the specified permissions
 */
export async function requireAnyPermission(request: NextRequest, permissions: string[]): Promise<AuthResult> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  if (!hasAnyPermission(authResult.user, permissions)) {
    return { 
      success: false, 
      error: `Insufficient permissions. Required one of: ${permissions.join(', ')}` 
    };
  }

  return authResult;
}