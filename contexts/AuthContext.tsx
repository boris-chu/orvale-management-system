'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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
        // Use existing stored user data
        const userData = JSON.parse(storedUser);
        console.log('📱 Using stored user data:', userData);
        
        // First set the stored user data immediately
        setUser(userData);
        
        // Then try to fetch fresh permissions from server
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
              console.log('✅ Updated with fresh user data:', userObj);
              setUser(userObj);
            } else {
              console.log('⚠️ Server returned invalid user data, keeping stored data');
            }
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
      // Clear user state immediately
      setUser(null);
      
      // Clear localStorage (existing system)
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      
      // Call logout endpoint to clear server-side session
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
        });
      } catch (error) {
        console.log('Logout endpoint call failed, but continuing with local cleanup');
      }
      
      // Clear any client-side tokens
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect to login or home
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout call fails
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