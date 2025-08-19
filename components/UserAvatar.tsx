"use client"

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: {
    display_name: string;
    profile_picture?: string;
    email?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showOnlineIndicator?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base'
};

const onlineIndicatorSize = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5'
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getGradientFromName = (name: string): string => {
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
  showOnlineIndicator = false 
}: UserAvatarProps) {
  const initials = getInitials(user.display_name);
  const gradient = getGradientFromName(user.display_name);
  
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
            alt={user.display_name}
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
      
      {showOnlineIndicator && (
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 bg-green-500 border-2 border-white rounded-full',
          onlineIndicatorSize[size]
        )}></div>
      )}
    </div>
  );
}