'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Ticket,
  Clock,
  TrendingUp,
  Target,
  Award,
  Calendar,
  BarChart3,
  Download,
  Settings,
  Trophy,
  Zap,
  CheckCircle,
  Activity,
  ArrowLeft,
  Flame,
  Star,
  MessageSquare,
  Users,
  Timer
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';

interface DashboardMetrics {
  ticketsGenerated: number;
  ticketsTrend: number;
  responseTimeImprovement: number;
  templatesUsed: number;
  currentStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyActivity: Array<{ date: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number; color: string }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon: string;
    progress?: number;
  }>;
  level: number;
  xp: number;
  xpToNextLevel: number;
  // Chat metrics
  chatMetrics: {
    usersHelped: number;
    averageRating: number;
    ticketsFromChats: number;
    avgResponseTime: number; // in minutes
    totalChatSessions: number;
    activeChatChannels: number;
  };
}

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-300',
  uncommon: 'bg-green-100 text-green-800 border-green-300',
  rare: 'bg-blue-100 text-blue-800 border-blue-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

export default function PersonalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const loadDashboardMetrics = async () => {
      try {
        setLoading(true);
        
        const result = await apiClient.getPersonalDashboard();
        
        if (result.success) {
          setMetrics(result.data.metrics);
        } else {
          throw new Error(result.message || 'Unknown error');
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error('Error loading dashboard metrics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    if (user) {
      loadDashboardMetrics();
    }
  }, [user, toast]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-500">Please log in to view your personal dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {/* Loading skeleton */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          
          <div className="h-6 border-l border-gray-300"></div>
          
          <div className="flex items-center space-x-4">
            <UserAvatar 
              user={user}
              size="lg"
              showOnlineIndicator={true}
              className="border-4 border-blue-100"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.display_name}!</h1>
              <div className="flex items-center space-x-3 mt-1">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Trophy className="h-3 w-3" />
                  <span>Level {metrics.level}</span>
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>{metrics.currentStreak} day streak</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/achievements')}
          >
            <Award className="h-4 w-4 mr-2" />
            View All Achievements
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </motion.div>

      {/* Level Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              Progress to Level {metrics.level + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{metrics.xp} XP</span>
                <span>{metrics.xpToNextLevel} XP</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (metrics.xp / metrics.xpToNextLevel) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {Math.max(0, metrics.xpToNextLevel - metrics.xp)} XP needed for next level
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Generated</CardTitle>
              <Ticket className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.ticketsGenerated}</div>
              <p className="text-xs text-gray-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +{metrics.ticketsTrend} from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.responseTimeImprovement}h</div>
              <p className="text-xs text-gray-600">Through template usage</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Used</CardTitle>
              <Zap className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.templatesUsed}</div>
              <p className="text-xs text-gray-600">Efficiency tools</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.currentStreak}</div>
              <p className="text-xs text-gray-600">Consecutive days</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chat Metrics - Only show if user has chat activity */}
        {metrics.chatMetrics.usersHelped > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users Helped</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.chatMetrics.usersHelped}</div>
                <p className="text-xs text-gray-600 flex items-center">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  {metrics.chatMetrics.averageRating.toFixed(1)} avg rating
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Chat Metrics Row - Only if user has significant chat activity */}
      {metrics.chatMetrics.usersHelped > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chat Response Time</CardTitle>
                <Timer className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.chatMetrics.avgResponseTime}m</div>
                <p className="text-xs text-gray-600">Average response</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets from Chat</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.chatMetrics.ticketsFromChats}</div>
                <p className="text-xs text-gray-600">Created from conversations</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
                <MessageSquare className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.chatMetrics.activeChatChannels}</div>
                <p className="text-xs text-gray-600">Participating in</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Weekly Goal Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Weekly Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tickets This Week</span>
                <span className="text-sm text-gray-600">{metrics.weeklyProgress}/{metrics.weeklyGoal}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((metrics.weeklyProgress / metrics.weeklyGoal) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {metrics.weeklyProgress >= metrics.weeklyGoal 
                  ? '🎉 Goal achieved! Great work!' 
                  : `${metrics.weeklyGoal - metrics.weeklyProgress} more tickets to reach your weekly goal`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievement System - MOVED BEFORE ACTIVITY HEATMAP */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 ${rarityColors[achievement.rarity]} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{achievement.name}</h4>
                      <p className="text-sm opacity-90">{achievement.description}</p>
                      <p className="text-xs mt-1 opacity-75">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                      {achievement.progress && (
                        <div className="mt-2">
                          <div className="w-full bg-white/20 rounded-full h-1">
                            <div 
                              className="bg-current h-1 rounded-full transition-all duration-500"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                          <p className="text-xs mt-1">{achievement.progress}% progress</p>
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {achievement.rarity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts and Activity - NOW COMES AFTER ACHIEVEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.monthlyActivity.map((item, index) => ({
                    name: new Date(item.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                    value: item.count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.categoryBreakdown.map(item => ({
                    name: item.category,
                    value: item.count,
                    fill: item.color
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={60} />
                    <YAxis className="text-xs" />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}