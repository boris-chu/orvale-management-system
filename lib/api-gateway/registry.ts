/**
 * Service Registry
 * Manages all API gateway services
 */

import { BaseService, ServiceNotFoundError } from './base-service';
import { systemLogger } from '@/lib/logger';

// Import all service implementations
import { TicketService } from '@/services/ticket-service';
import { ChatService } from '@/services/chat-service';
import { AchievementService } from '@/services/achievement-service';
import { AuthService } from '@/services/auth-service';
import { AdminService } from '@/services/admin-service';
import { StaffService } from '@/services/staff-service';
import { HelpdeskService } from '@/services/helpdesk-service';
import { DeveloperService } from '@/services/developer-service';
import { SystemService } from '@/services/system-service';
import { UtilitiesService } from '@/services/utilities-service';
import { PublicService } from '@/services/public-service';

export class ServiceRegistry {
  private static services = new Map<string, BaseService>();
  private static initialized = false;
  
  /**
   * Initialize all services
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Register all services
      this.register('tickets', new TicketService());
      this.register('chat', new ChatService());
      this.register('achievements', new AchievementService());
      this.register('auth', new AuthService());
      this.register('admin', new AdminService());
      this.register('staff', new StaffService());
      this.register('helpdesk', new HelpdeskService());
      this.register('developer', new DeveloperService());
      this.register('system', new SystemService());
      this.register('utilities', new UtilitiesService());
      this.register('public', new PublicService());
      
      this.initialized = true;
      
      systemLogger.info('Service Registry initialized', {
        serviceCount: this.services.size,
        services: Array.from(this.services.keys())
      });
      
    } catch (error) {
      systemLogger.error('Failed to initialize Service Registry', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
  
  /**
   * Register a service
   */
  static register(name: string, service: BaseService): void {
    if (this.services.has(name)) {
      systemLogger.warn(`Service "${name}" already registered, replacing`);
    }
    
    this.services.set(name, service);
    
    systemLogger.debug(`Service registered: ${name}`, {
      serviceType: service.constructor.name,
      totalServices: this.services.size
    });
  }
  
  /**
   * Get a service by name
   */
  static get(name: string): BaseService {
    // Ensure registry is initialized
    if (!this.initialized) {
      // Synchronous initialization for services that exist
      try {
        this.initializeSync();
      } catch (error) {
        systemLogger.error('Failed to initialize registry synchronously', error);
        throw new ServiceNotFoundError(name);
      }
    }
    
    const service = this.services.get(name);
    if (!service) {
      systemLogger.error(`Service not found: ${name}`, {
        availableServices: Array.from(this.services.keys())
      });
      throw new ServiceNotFoundError(name);
    }
    
    return service;
  }
  
  /**
   * Synchronous initialization for immediate use
   */
  private static initializeSync(): void {
    if (this.initialized) {
      return;
    }
    
    // Create placeholder services that will be replaced with real ones
    const services = [
      'tickets', 'chat', 'achievements', 'auth', 'admin', 
      'staff', 'helpdesk', 'developer', 'system', 'utilities', 'public'
    ];
    
    for (const serviceName of services) {
      if (!this.services.has(serviceName)) {
        this.services.set(serviceName, new PlaceholderService(serviceName));
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Get list of all registered services
   */
  static list(): string[] {
    return Array.from(this.services.keys()).sort();
  }
  
  /**
   * Check if a service is registered
   */
  static has(name: string): boolean {
    return this.services.has(name);
  }
  
  /**
   * Get service count
   */
  static count(): number {
    return this.services.size;
  }
  
  /**
   * Unregister a service
   */
  static unregister(name: string): boolean {
    const existed = this.services.has(name);
    this.services.delete(name);
    
    if (existed) {
      systemLogger.debug(`Service unregistered: ${name}`);
    }
    
    return existed;
  }
  
  /**
   * Clear all services (for testing)
   */
  static clear(): void {
    this.services.clear();
    this.initialized = false;
    systemLogger.debug('Service registry cleared');
  }
  
  /**
   * Get service health status
   */
  static async getHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};
    
    for (const [name, service] of this.services.entries()) {
      try {
        // Check if service has a health check method
        if (typeof (service as any).healthCheck === 'function') {
          health[name] = await (service as any).healthCheck();
        } else {
          health[name] = { status: 'registered', type: service.constructor.name };
        }
      } catch (error) {
        health[name] = { 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    }
    
    return health;
  }
}

/**
 * Placeholder service for initialization
 */
class PlaceholderService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }
  
  protected async executeAction(action: string, data: any, options: any, context: any): Promise<any> {
    throw new ServiceNotFoundError(`Service "${this.serviceName}" not yet implemented`);
  }
}

// Initialize registry on module load
ServiceRegistry.initialize().catch(error => {
  systemLogger.error('Failed to auto-initialize Service Registry', error);
});