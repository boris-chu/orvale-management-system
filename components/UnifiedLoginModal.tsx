'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  LogIn, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Shield,
  Zap,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnifiedLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'regular' | 'admin' | 'staff';
  title?: string;
  description?: string;
}

export default function UnifiedLoginModal({ 
  isOpen, 
  onClose, 
  mode = 'regular',
  title,
  description 
}: UnifiedLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const modalConfig = {
    regular: {
      title: title || 'Staff Login',
      description: description || 'Access the ticket management system',
      icon: LogIn,
      color: 'blue',
      badge: 'Staff Access'
    },
    admin: {
      title: title || 'Admin Login',
      description: description || 'Administrative access during maintenance',
      icon: Shield,
      color: 'red',
      badge: 'Admin Access'
    },
    staff: {
      title: title || 'IT Staff Access',
      description: description || 'Internal staff portal access',
      icon: Users,
      color: 'purple',
      badge: 'IT Staff'
    }
  };

  const config = modalConfig[mode];
  const IconComponent = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
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
        
        // Create success animation before redirect
        setError('');
        setTimeout(() => {
          window.location.href = '/tickets';
        }, 500);
      } else {
        setError(result.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                    config.color === 'blue' ? 'bg-blue-100' :
                    config.color === 'red' ? 'bg-red-100' :
                    'bg-purple-100'
                  }`}
                >
                  <IconComponent 
                    size={32} 
                    className={
                      config.color === 'blue' ? 'text-blue-600' :
                      config.color === 'red' ? 'text-red-600' :
                      'text-purple-600'
                    } 
                  />
                </motion.div>

                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {config.title}
                  </CardTitle>
                  <p className="text-gray-600">
                    {config.description}
                  </p>
                </div>

                <Badge 
                  variant="secondary" 
                  className={`flex items-center space-x-1 w-fit mx-auto ${
                    config.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    config.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                >
                  <Zap size={12} />
                  <span>{config.badge}</span>
                </Badge>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center space-x-2 text-sm font-medium">
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
                      className="h-12 text-base"
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center space-x-2 text-sm font-medium">
                      <Lock size={16} />
                      <span>Password</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="h-12 text-base pr-12"
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </motion.div>
                  )}

                  <div className="flex space-x-3 pt-2">
                    <Button
                      type="submit"
                      disabled={loading || !username.trim() || !password.trim()}
                      className={`flex-1 h-12 text-base font-medium ${
                        config.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                        config.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <LogIn size={16} />
                        </motion.div>
                      ) : (
                        <LogIn size={16} className="mr-2" />
                      )}
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={loading}
                      className="flex-1 h-12 text-base"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>

                {/* Test Accounts Help */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-3 bg-gray-50 rounded-lg border"
                >
                  <p className="text-xs text-gray-600 font-medium mb-1">Development Test Accounts:</p>
                  <p className="text-xs text-gray-500">
                    admin/admin123 • boris.chu/boris123 • john.doe/john123
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}