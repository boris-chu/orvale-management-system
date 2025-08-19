'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Search, 
  AlertTriangle, 
  Compass, 
  ArrowLeft, 
  Zap,
  MapPin,
  RefreshCw,
  FileQuestion,
  Lightbulb,
  Coffee,
  Rocket,
  Star,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ERROR_MESSAGES = [
  "Oops! This page took a coffee break ☕",
  "404: Page not found in our cosmic database 🚀",
  "Looks like this page went on vacation 🏖️",
  "Error 404: Page is playing hide and seek 🙈",
  "Houston, we have a problem... page missing! 🛸",
  "This page is lost in the digital wilderness 🗺️",
  "404: The page you seek is in another castle 🏰",
  "Beep boop! Page not computed 🤖"
];

const FLOATING_ICONS = [
  { Icon: Star, delay: 0, duration: 8 },
  { Icon: Heart, delay: 2, duration: 6 },
  { Icon: Lightbulb, delay: 4, duration: 10 },
  { Icon: Coffee, delay: 1, duration: 7 },
  { Icon: Rocket, delay: 3, duration: 9 }
];

export default function NotFound() {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Rotate error messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % ERROR_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      window.location.href = '/';
    }, 2000);
  };

  const FloatingIcon = ({ Icon, delay, duration }: { Icon: any, delay: number, duration: number }) => (
    <motion.div
      className="absolute opacity-20 text-blue-400"
      initial={{ y: "100vh", x: Math.random() * 100 }}
      animate={{ 
        y: "-100vh", 
        x: Math.random() * 200,
        rotate: 360
      }}
      transition={{ 
        duration,
        delay,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear"
      }}
    >
      <Icon size={24} />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Floating Background Icons */}
      <div className="absolute inset-0 pointer-events-none">
        {FLOATING_ICONS.map((item, index) => (
          <FloatingIcon key={index} {...item} />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="w-full max-w-2xl"
        >
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              
              {/* Animated 404 */}
              <motion.div 
                className="mb-8"
                initial={{ rotateY: 0 }}
                animate={{ rotateY: 360 }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <div className="text-8xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  404
                </div>
              </motion.div>

              {/* Animated Icons */}
              <motion.div 
                className="flex justify-center items-center space-x-4 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-4 bg-blue-100 rounded-full"
                >
                  <FileQuestion size={48} className="text-blue-600" />
                </motion.div>
                
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="p-4 bg-purple-100 rounded-full"
                >
                  <Compass size={48} className="text-purple-600" />
                </motion.div>
                
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="p-4 bg-pink-100 rounded-full"
                >
                  <MapPin size={48} className="text-pink-600" />
                </motion.div>
              </motion.div>

              {/* Dynamic Error Message */}
              <motion.div className="mb-8">
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={currentMessage}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl font-bold text-gray-800 mb-4"
                  >
                    Page Not Found
                  </motion.h1>
                </AnimatePresence>
                
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentMessage}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                    className="text-lg text-gray-600 mb-2"
                  >
                    {ERROR_MESSAGES[currentMessage]}
                  </motion.p>
                </AnimatePresence>

                <p className="text-gray-500">
                  The page you're looking for doesn't exist or has been moved.
                </p>
              </motion.div>

              {/* Status Badges */}
              <motion.div 
                className="flex justify-center space-x-2 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertTriangle size={14} />
                  <span>404 Error</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Zap size={14} />
                  <span>Orvale System</span>
                </Badge>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <Button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                >
                  <Home size={20} />
                  <span>Go Home</span>
                </Button>

                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="flex items-center space-x-2 px-6 py-3"
                >
                  <ArrowLeft size={20} />
                  <span>Go Back</span>
                </Button>

                <Button
                  onClick={handleSearch}
                  variant="secondary" 
                  disabled={isSearching}
                  className="flex items-center space-x-2 px-6 py-3"
                >
                  {isSearching ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <Search size={20} />
                  )}
                  <span>{isSearching ? 'Searching...' : 'Search Site'}</span>
                </Button>
              </motion.div>

              {/* Help Text */}
              <motion.div 
                className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <div className="flex items-center justify-center space-x-2 text-blue-700">
                  <Lightbulb size={20} />
                  <span className="font-medium">Need Help?</span>
                </div>
                <p className="text-blue-600 text-sm mt-2">
                  Try going back to the <strong>home page</strong> or use the navigation menu to find what you're looking for.
                  If you think this is an error, please contact your system administrator.
                </p>
              </motion.div>

              {/* Footer */}
              <motion.div 
                className="mt-6 text-center text-gray-400 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <p>Orvale Management System • Error ID: {Date.now().toString(36).toUpperCase()}</p>
              </motion.div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}