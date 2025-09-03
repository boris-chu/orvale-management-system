'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Award,
  Target,
  Users,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Lock,
  CheckCircle,
  TrendingUp,
  Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Achievement } from '@/lib/achievement-service';
import apiClient from '@/lib/api-client';

const rarityColors = {
  common: 'bg-gray-100 text-gray-800 border-gray-300',
  uncommon: 'bg-green-100 text-green-800 border-green-300',
  rare: 'bg-blue-100 text-blue-800 border-blue-300',
  epic: 'bg-purple-100 text-purple-800 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

const rarityBgColors = {
  common: 'bg-gray-50 border-gray-200',
  uncommon: 'bg-green-50 border-green-200',
  rare: 'bg-blue-50 border-blue-200',
  epic: 'bg-purple-50 border-purple-200',
  legendary: 'bg-yellow-50 border-yellow-200'
};

const categoryIcons = {
  productivity: TrendingUp,
  quality: Target,
  collaboration: Users,
  special: Sparkles
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      
      const result = await apiClient.getAchievements();

      if (!result.success) {
        throw new Error('Failed to load achievements');
      }

      const data = result.data;
      
      if (data.success) {
        setAchievements(data.achievements);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Error loading achievements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load achievements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const refreshAchievements = async () => {
    try {
      setRefreshing(true);
      
      // Trigger achievement check
      const result = await apiClient.refreshAchievements();

      if (result.success) {
        const data = result.data;
        if (data.newAchievements?.length > 0) {
          toast({
            title: 'Achievements Updated!',
            description: `${data.newAchievements.length} new achievements unlocked!`,
          });
        } else {
          toast({
            title: 'Up to Date',
            description: 'No new achievements unlocked',
          });
        }
        
        // Reload achievements
        await loadAchievements();
      }
    } catch (error) {
      console.error('Error refreshing achievements:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user, loadAchievements]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-500">Please log in to view your achievements.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked_at);
  const lockedAchievements = achievements.filter(a => !a.unlocked_at);
  const totalXP = unlockedAchievements.reduce((sum, a) => sum + a.xp_reward, 0);

  const filteredAchievements = activeCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === activeCategory);

  const categories = [...new Set(achievements.map(a => a.category))];

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
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-600" />
              Achievements
            </h1>
            <p className="text-gray-600 mt-1">
              Track your progress and unlock rewards
            </p>
          </div>
        </div>
        
        <Button 
          onClick={refreshAchievements}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking...' : 'Refresh'}
        </Button>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{unlockedAchievements.length}</div>
              <p className="text-sm text-gray-600">Unlocked</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{lockedAchievements.length}</div>
              <p className="text-sm text-gray-600">Locked</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalXP}</div>
              <p className="text-sm text-gray-600">Total XP</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {Math.round((unlockedAchievements.length / achievements.length) * 100) || 0}%
              </div>
              <p className="text-sm text-gray-600">Complete</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((category) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            return (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="capitalize">{category}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="space-y-4">
          {/* Recently Unlocked */}
          {unlockedAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Recently Unlocked
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAchievements
                  .filter(a => a.unlocked_at)
                  .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
                  .slice(0, 6)
                  .map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <Card className={`${rarityBgColors[achievement.rarity]} border-2 hover:shadow-md transition-shadow`}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="text-3xl">{achievement.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-lg">{achievement.name}</h4>
                                  <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                                </div>
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs capitalize ${rarityColors[achievement.rarity]}`}
                                >
                                  {achievement.rarity}
                                </Badge>
                                
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">
                                    {new Date(achievement.unlocked_at!).toLocaleDateString()}
                                  </span>
                                  <div className="flex items-center space-x-1 text-yellow-600">
                                    <Star className="h-4 w-4" />
                                    <span className="font-semibold text-sm">+{achievement.xp_reward}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* In Progress */}
          {lockedAchievements.some(a => (a.progress || 0) > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                In Progress
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAchievements
                  .filter(a => !a.unlocked_at && (a.progress || 0) > 0)
                  .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                  .map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="text-3xl opacity-60">{achievement.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{achievement.name}</h4>
                              <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Progress</span>
                                  <span>{achievement.progress}/{achievement.max_progress || achievement.criteria_value}</span>
                                </div>
                                <Progress 
                                  value={((achievement.progress || 0) / (achievement.max_progress || achievement.criteria_value || 100)) * 100} 
                                  className="h-2"
                                />
                              </div>
                              
                              <div className="flex items-center justify-between mt-3">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs capitalize ${rarityColors[achievement.rarity]}`}
                                >
                                  {achievement.rarity}
                                </Badge>
                                
                                <div className="flex items-center space-x-1 text-yellow-600">
                                  <Star className="h-4 w-4" />
                                  <span className="font-semibold text-sm">+{achievement.xp_reward}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.some(a => (a.progress || 0) === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-400" />
                Locked
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAchievements
                  .filter(a => !a.unlocked_at && (a.progress || 0) === 0)
                  .map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.0 + index * 0.05 }}
                    >
                      <Card className="opacity-75 hover:opacity-100 transition-opacity">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl opacity-40">{achievement.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-700">{achievement.name}</h4>
                                  <p className="text-sm text-gray-500 mb-2">{achievement.description}</p>
                                </div>
                                <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs capitalize opacity-60"
                                >
                                  {achievement.rarity}
                                </Badge>
                                
                                <div className="flex items-center space-x-1 text-gray-400">
                                  <Star className="h-4 w-4" />
                                  <span className="text-sm">+{achievement.xp_reward}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}