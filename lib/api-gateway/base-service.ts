/**
 * Base Service Interface
 * Abstract class for all API gateway services
 */

import { RequestContext, requirePermissions, ValidationError } from './context';
import { validateServiceAction, sanitizeInput } from './validation';

export abstract class BaseService {
  protected serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Main service handler - routes actions to specific methods
   */
  async handle(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    try {
      // Validate action for this service
      validateServiceAction(this.serviceName, action);
      
      // Sanitize input data
      const sanitizedData = sanitizeInput(data);
      const sanitizedOptions = sanitizeInput(options);
      
      // Log service call
      this.log(context, `Handling ${action}`, { 
        dataKeys: Object.keys(sanitizedData || {}),
        optionKeys: Object.keys(sanitizedOptions || {})
      });
      
      // Call the specific service method
      const result = await this.executeAction(action, sanitizedData, sanitizedOptions, context);
      
      // Log successful completion
      this.log(context, `Completed ${action}`, { 
        resultType: typeof result,
        hasResult: !!result 
      });
      
      return result;
      
    } catch (error) {
      // Log service error
      this.logError(context, `Failed ${action}`, error);
      throw error;
    }
  }
  
  /**
   * Abstract method - must be implemented by each service
   */
  protected abstract executeAction(
    action: string, 
    data: any, 
    options: any, 
    context: RequestContext
  ): Promise<any>;
  
  /**
   * Helper method to require specific permissions
   */
  protected requirePermission(context: RequestContext, permission: string | string[]): void {
    requirePermissions(context, permission);
  }
  
  /**
   * Helper method for structured logging
   */
  protected log(context: RequestContext, message: string, details?: any): void {
    context.logger.info(`[${this.serviceName}] ${message}`, details);
  }
  
  /**
   * Helper method for error logging
   */
  protected logError(context: RequestContext, message: string, error: any): void {
    context.logger.error(`[${this.serviceName}] ${message}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error.constructor.name
    });
  }
  
  /**
   * Helper method to validate required fields in data
   */
  protected validateRequiredFields(data: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new ValidationError(`Required field missing: ${field}`);
      }
    }
  }
  
  /**
   * Helper method to validate field types
   */
  protected validateFieldTypes(data: any, fieldTypes: Record<string, string>): void {
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      if (data[field] !== undefined && typeof data[field] !== expectedType) {
        throw new ValidationError(`Field "${field}" must be of type ${expectedType}, got ${typeof data[field]}`);
      }
    }
  }
  
  /**
   * Helper method for paginated responses
   */
  protected createPaginatedResponse(
    items: any[], 
    total: number, 
    page: number = 1, 
    limit: number = 25
  ): any {
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: total,
        per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1
      }
    };
  }
  
  /**
   * Helper method to format success response
   */
  protected success(data: any, message?: string): any {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Helper method to format error response
   */
  protected error(message: string, code?: string, details?: any): any {
    return {
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }
}

export class ActionNotFoundError extends Error {
  constructor(service: string, action: string) {
    super(`Action "${action}" not found for service "${service}"`);
    this.name = 'ActionNotFoundError';
  }
}

export class ServiceNotFoundError extends Error {
  constructor(service: string) {
    super(`Service "${service}" not found`);
    this.name = 'ServiceNotFoundError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(permission: string) {
    super(`Permission denied: ${permission}`);
    this.name = 'PermissionDeniedError';
  }
}