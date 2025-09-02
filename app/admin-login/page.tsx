'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, User, Lock, LogIn } from 'lucide-react';
import apiClient from '@/lib/api-client';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      window.location.href = '/tickets';
    }
  }, []);

  // Check if system is under maintenance - redirect to main page if not
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const result = await apiClient.getMaintenanceStatus();
        const data = result.data || {};
        
        if (!data.isSystemMaintenance && !data.isPortalMaintenance) {
          // No maintenance active, redirect to main login page
          window.location.href = '/';
          return;
        }
        
        setCheckingMaintenance(false);
      } catch (error) {
        console.error('Failed to check maintenance status:', error);
        // On error, allow access (fail-safe)
        setCheckingMaintenance(false);
      }
    };

    checkMaintenanceStatus();
  }, []);

  // Show loading while checking maintenance status
  if (checkingMaintenance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiClient.login({ username, password });

      if (result.success && result.data?.token) {
        // apiClient.login already stores the token
        localStorage.setItem('currentUser', JSON.stringify(result.data.user));
        window.location.href = '/tickets';
      } else {
        setError(result.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <LogIn size={32} className="text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Login
          </CardTitle>
          <p className="text-gray-600">
            Access the system during maintenance mode
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Maintenance Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                System is currently under maintenance
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Only administrators can access the system at this time.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center space-x-2">
                <User size={16} />
                <span>Username</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2">
                <Lock size={16} />
                <span>Password</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}