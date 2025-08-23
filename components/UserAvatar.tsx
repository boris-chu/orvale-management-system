"use client"

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUserPresence } from '@/lib/hooks/usePresence';

interface UserAvatarProps {
  user: {
    display_name?: string;
    profile_picture?: string;
    email?: string;
    username?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
  showPresenceStatus?: boolean;
  presenceStatus?: 'online' | 'away' | 'busy' | 'offline';
  // Real-time presence integration
  useRealTimePresence?: boolean;
  // Legacy support
  showOnlineIndicator?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
  '2xl': 'h-24 w-24 text-xl'
};

const presenceIndicatorSize = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
  '2xl': 'w-4 h-4'
};

const presenceColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500', 
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const presenceLabels = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline'
};

const getInitials = (name?: string, username?: string): string => {
  // Use display_name first (if not empty), then fallback to username, then 'U' for User
  const displayName = (name && name.trim()) || (username && username.trim()) || 'User';
  
  if (displayName === 'User') return 'U';
  
  return displayName
    .split(' ')
    .filter(part => part.length > 0) // Filter out empty parts
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getGradientFromName = (name?: string): string => {
  if (!name) return 'from-gray-500 to-gray-600';
  // Generate a consistent gradient based on the user's name
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600', 
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export function UserAvatar({ 
  user, 
  size = 'lg', 
  className, 
  onClick,
  showPresenceStatus = false,
  presenceStatus = 'offline',
  useRealTimePresence = false,
  // Legacy support
  showOnlineIndicator = false 
}: UserAvatarProps) {
  const initials = getInitials(user.display_name, user.username);
  const gradient = getGradientFromName(user.display_name || user.username);
  
  // Get real-time presence data if enabled
  const { presence: realTimePresence } = useUserPresence(user.username || '');
  
  // Show presence if either new prop or legacy prop is true
  const shouldShowPresence = showPresenceStatus || showOnlineIndicator;
  
  // Determine effective status based on priority:
  // 1. Real-time presence (if enabled)  
  // 2. Passed presenceStatus prop
  // 3. Legacy behavior (always online)
  let effectiveStatus = presenceStatus;
  
  if (useRealTimePresence && user.username) {
    effectiveStatus = realTimePresence.status;
  } else if (showOnlineIndicator && !showPresenceStatus) {
    effectiveStatus = 'online'; // Legacy behavior
  }
  
  return (
    <div className="relative">
      <Avatar 
        className={cn(
          sizeClasses[size], 
          onClick && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all',
          className
        )}
        onClick={onClick}
      >
        {user.profile_picture && (
          <AvatarImage 
            src={user.profile_picture} 
            alt={user.display_name || 'User Avatar'}
            className="object-cover"
          />
        )}
        <AvatarFallback 
          className={cn(
            'text-white font-semibold bg-gradient-to-br',
            gradient
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {shouldShowPresence && effectiveStatus !== 'offline' && (
        <div 
          className={cn(
            'absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full',
            presenceIndicatorSize[size],
            presenceColors[effectiveStatus]
          )}
          title={`${user.display_name || 'User'} - ${presenceLabels[effectiveStatus]}`}
        >
          {/* Add special styling for busy status */}
          {effectiveStatus === 'busy' && (
            <div className="absolute inset-0 rounded-full bg-white" style={{
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)'
            }}></div>
          )}
        </div>
      )}
      
      {shouldShowPresence && effectiveStatus === 'offline' && (
        <div 
          className={cn(
            'absolute -bottom-0.5 -right-0.5 border-2 border-white rounded-full bg-gray-400',
            presenceIndicatorSize[size]
          )}
          title={`${user.display_name || 'User'} - Offline`}
        ></div>
      )}
    </div>
  );
}