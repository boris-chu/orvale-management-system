'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Ticket, Users } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        window.location.href = '/tickets';
      } else {
        setError(result.message || 'Invalid username or password');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">IT Staff Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
          <div className="mt-4 text-xs text-gray-600">
            <p><strong>Test Credentials:</strong></p>
            <p>admin / admin123</p>
            <p>boris.chu / boris123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      window.location.href = '/tickets';
    }
  }, []);

  // Listen for Ctrl+T to open login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setShowLogin(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Ticket className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Orvale Management System
              </h1>
            </div>
            <Button
              onClick={() => setShowLogin(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <LogIn className="h-4 w-4" />
              <span>IT Staff Login</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            IT Support Portal
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Submit IT support requests and track their progress through our unified management system.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ticket className="h-5 w-5 text-blue-600" />
                <span>Submit Tickets</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Easily submit IT support requests with detailed information and automatic routing.
              </p>
              <div className="mt-4">
                <Button 
                  onClick={() => window.location.href = '/public-portal/'}
                  variant="outline"
                  className="w-full"
                >
                  Submit Request
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Track Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Monitor the status of your requests and receive updates from IT staff.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LogIn className="h-5 w-5 text-purple-600" />
                <span>IT Staff Access</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                IT staff can access the queue management system to handle and resolve tickets.
              </p>
              <div className="mt-4">
                <Button 
                  onClick={() => setShowLogin(true)}
                  className="w-full"
                >
                  Access Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => window.location.href = '/public-portal/'}
                >
                  Submit New Ticket
                </Button>
                <p className="text-sm text-gray-500">
                  Press <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+T</kbd> for IT staff login
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Orvale Management System. All rights reserved.</p>
            <p className="mt-2">Created by Boris Chu - ITD Region 7</p>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}