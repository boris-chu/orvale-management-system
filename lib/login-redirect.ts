/**
 * Determine the redirect URL after login based on user preferences and permissions
 */
export function getLoginRedirectUrl(user: any): string {
  try {
    // Parse user login preferences
    const preferences = user.login_preferences ? JSON.parse(user.login_preferences) : {};
    const preferredDestination = preferences.default_destination;

    // Check if user has permissions for their preferred destination
    if (preferredDestination) {
      switch (preferredDestination) {
        case 'admin':
          // Check if user has admin permissions
          const adminPermissions = [
            'admin.manage_users', 'admin.view_users',
            'admin.manage_teams', 'admin.view_teams', 
            'admin.manage_organization', 'admin.view_organization',
            'admin.manage_categories', 'admin.view_categories',
            'admin.manage_support_teams', 'admin.view_support_teams',
            'admin.view_analytics', 'admin.system_settings'
          ];
          if (adminPermissions.some(perm => user.permissions?.includes(perm))) {
            return '/developer';
          }
          break;

        case 'analytics':
          if (user.permissions?.includes('analytics.view_reports')) {
            return '/developer/analytics';
          }
          break;

        case 'team-management':
          if (user.permissions?.includes('users.manage_team')) {
            return '/developer/teams';
          }
          break;

        case 'tickets':
        default:
          return '/tickets';
      }
    }

    // Default fallback to tickets
    return '/tickets';
    
  } catch (error) {
    console.error('Error determining login redirect:', error);
    // Fallback to tickets on any error
    return '/tickets';
  }
}