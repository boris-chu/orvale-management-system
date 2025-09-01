'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldOff, 
  ArrowLeft, 
  Lock, 
  AlertTriangle,
  Home,
  User,
  LogOut 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();
  const [requestedRoute, setRequestedRoute] = useState<string>('');

  useEffect(() => {
    // Get the route that was requested before being redirected here
    const params = new URLSearchParams(window.location.search);
    const route = params.get('requested') || 'the requested page';
    setRequestedRoute(route);
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/tickets';
    }
  };

  const handleGoHome = () => {
    window.location.href = '/tickets';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/90">
            <CardHeader className="text-center pb-4">
              {/* Animated Shield Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-4"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ delay: 0.8, duration: 0.6, ease: "easeInOut" }}
                    className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <ShieldOff className="h-10 w-10 text-white" />
                  </motion.div>
                  
                  {/* Pulsing Ring */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.3, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-4 border-red-300 rounded-full"
                  />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Access Denied
                </h1>
                <p className="text-lg text-gray-600">
                  Insufficient Permissions
                </p>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-800 mb-1">
                      Permission Required
                    </h3>
                    <p className="text-sm text-red-700">
                      You don't have the necessary permissions to access{' '}
                      <span className="font-medium">{requestedRoute}</span>. 
                      Please contact your administrator to request access.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* User Info */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{user.display_name}</p>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {user.role_name || user.role_id || 'User'}
                        </Badge>
                      </div>
                    </div>
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
                
                <Button
                  onClick={handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </motion.div>

              {/* Additional Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="pt-4 border-t border-gray-200"
              >
                <div className="flex justify-center">
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-red-600 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-center mt-6"
          >
            <p className="text-sm text-gray-600">
              Need access? Contact your system administrator or IT support team.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-100/30 to-orange-100/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-amber-100/30 to-yellow-100/30 rounded-full blur-3xl"
        />
      </div>
    </div>
  );
}