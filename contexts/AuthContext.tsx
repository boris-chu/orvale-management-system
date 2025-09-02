'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

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
        
        // Then try to fetch fresh permissions from server using API Gateway
        try {
          // Set the token for apiClient
          apiClient.setToken(token);
          
          const result = await apiClient.getCurrentUser();
          console.log('🔄 API Gateway response:', result);
          
          if (result.success && result.data) {
            console.log('✅ Updated with fresh user data:', result.data);
            setUser(result.data);
            // Update stored user data
            localStorage.setItem('currentUser', JSON.stringify(result.data));
          } else {
            console.log('⚠️ API Gateway returned invalid user data, keeping stored data');
            console.log('🔍 Response structure:', result);
          }
        } catch (fetchError) {
          console.log('⚠️ API Gateway request failed, keeping stored data:', fetchError);
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
      
      const result = await apiClient.login({ username, password });
      
      if (result.success && result.data?.token && result.data?.user) {
        // apiClient.login already stores the token, but we need to store user too
        localStorage.setItem('currentUser', JSON.stringify(result.data.user));
        
        setUser(result.data.user);
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
        await apiClient.logout();
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