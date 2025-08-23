'use client';

import React, { useState, useEffect } from 'react';
import { ChatManagementCard } from '@/components/admin/ChatManagementCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Code, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfileMenu } from '@/components/UserProfileMenu';

export default function ChatManagementPage() {
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    display_name: string;
    email: string;
    profile_picture?: string;
    role_id: string;
    permissions: string[];
  } | null>(null);

  useEffect(() => {
    // Get current user for the profile menu
    const getUserInfo = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/auth/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    };

    getUserInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/developer'}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </Button>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3"
              >
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Chat System Management</h1>
                  <p className="text-sm text-gray-500">Configure and monitor the chat system</p>
                </div>
              </motion.div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Ticket Queue Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/tickets'}
                className="flex items-center space-x-2"
              >
                <Ticket className="h-4 w-4" />
                <span>Ticket Queue</span>
              </Button>

              {/* User Profile Menu */}
              {currentUser && (
                <UserProfileMenu user={currentUser} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ChatManagementCard />
        </motion.div>
      </div>
    </div>
  );
}