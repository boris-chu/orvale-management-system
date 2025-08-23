'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SystemPresenceTracker } from '@/components/SystemPresenceTracker';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  role_id: string;
  team_id: string;
  section_id: string;
  active: boolean;
  profile_picture?: string;
  login_preferences?: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for existing token in localStorage (existing system)
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('currentUser');
      
      console.log('🔍 AuthContext Debug:', {
        hasToken: !!token,
        hasStoredUser: !!storedUser,
        tokenValue: token?.substring(0, 10) + '...',
        storedUserData: storedUser ? JSON.parse(storedUser) : null
      });
      
      if (token && storedUser) {
        // Validate token format first
        const isValidJWT = token.trim().split('.').length === 3;
        if (!isValidJWT) {
          console.log('❌ Invalid JWT format detected, clearing corrupted token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          setLoading(false);
          return;
        }
        
        // Use existing stored user data
        const userData = JSON.parse(storedUser);
        console.log('📱 Using stored user data:', userData);
        
        // First set the stored user data immediately
        setUser(userData);
        
        // Then validate token with server and fetch fresh data
        try {
          const response = await fetch('/api/auth/user', {
            headers: {
              'Authorization': `Bearer ${token}`
            },
          });

          if (response.ok) {
            const freshUserData = await response.json();
            console.log('🔄 Server response:', freshUserData);
            // Handle both direct user object and wrapped user object
            const userObj = freshUserData.user || freshUserData;
            if (userObj && userObj.id) {
              console.log('✅ Token validated, updated with fresh user data:', userObj);
              setUser(userObj);
            } else {
              console.log('⚠️ Server returned invalid user data, keeping stored data');
            }
          } else if (response.status === 401) {
            // Token is invalid/expired, clear it
            console.log('🚨 Token expired/invalid, clearing authentication data');
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            setUser(null);
          } else {
            console.log('⚠️ Fresh data fetch failed, keeping stored data');
          }
        } catch (fetchError) {
          console.log('⚠️ Server request failed, keeping stored data:', fetchError);
        }
      } else {
        console.log('❌ No auth token or stored user found');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store in localStorage to match existing system
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Starting logout process...')
      
      // Update user presence to offline before logging out
      if (user?.permissions?.includes('chat.access_channels')) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        if (token) {
          try {
            const cleanToken = token.trim().replace(/[\[\]"']/g, '')
            await fetch('/api/chat/presence', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'offline' })
            })
            console.log('✅ AuthContext: Set user offline before logout')
          } catch (error) {
            console.error('❌ AuthContext: Error setting offline status:', error)
          }
        }
      }
      
      // Clear user state immediately
      setUser(null);
      
      // 🧹 COMPREHENSIVE TOKEN CLEANUP
      console.log('🧹 AuthContext: Clearing all authentication data...')
      
      // Clear all possible localStorage keys
      const keysToRemove = [
        'authToken', 
        'token', 
        'currentUser', 
        'user',
        'auth-token',
        'sessionToken',
        'accessToken'
      ]
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`🗑️ Removing localStorage.${key}`)
          localStorage.removeItem(key)
        }
      })
      
      // Clear sessionStorage too
      const sessionKeys = ['authToken', 'token', 'currentUser', 'user']
      sessionKeys.forEach(key => {
        if (sessionStorage.getItem(key)) {
          console.log(`🗑️ Removing sessionStorage.${key}`)
          sessionStorage.removeItem(key)
        }
      })
      
      // Clear all possible auth cookies
      const cookiesToClear = [
        'auth-token',
        'authToken', 
        'token',
        'session-token',
        'access-token',
        'jwt-token'
      ]
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      })
      
      // Call logout endpoint to clear server-side session
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include' // Include cookies for server-side cleanup
        });
        console.log('✅ AuthContext: Server-side logout completed')
      } catch (error) {
        console.log('⚠️ Logout endpoint call failed, but continuing with local cleanup:', error.message);
      }
      
      console.log('✅ AuthContext: Logout cleanup complete, redirecting...')
      
      // Force redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Even if logout fails, clear everything and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* System-wide presence tracking for all authenticated users */}
      <SystemPresenceTracker />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}