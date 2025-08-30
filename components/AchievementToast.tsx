'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '@/lib/achievement-service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

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

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000
}) => {
  React.useEffect(() => {
    if (achievement && autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [achievement, autoClose, autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.4
            }}
          >
            <Card className={`w-80 ${rarityBgColors[achievement.rarity]} border-2 shadow-lg`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ 
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 0.6,
                        repeat: 1
                      }}
                    >
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </motion.div>
                    <h3 className="font-semibold text-gray-900">Achievement Unlocked!</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-start space-x-3">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: 2,
                      ease: "easeInOut"
                    }}
                    className="text-3xl"
                  >
                    {achievement.icon}
                  </motion.div>
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-900 mb-1">
                      {achievement.name}
                    </h4>
                    <p className="text-gray-700 text-sm mb-2">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs capitalize ${rarityColors[achievement.rarity]}`}
                      >
                        {achievement.rarity}
                      </Badge>
                      
                      <div className="flex items-center space-x-1 text-yellow-600">
                        <Star className="h-4 w-4" />
                        <span className="font-semibold text-sm">
                          +{achievement.xp_reward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress animation bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <motion.div 
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-1 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ 
                        duration: 2,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AchievementToast;