'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Ticket, Clock, Mail, Phone, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [ticketData, setTicketData] = useState({
    ticketId: '',
    userName: '',
    issueTitle: '',
    teamLabel: '',
    estimatedTime: ''
  });

  useEffect(() => {
    // Get ticket information from URL parameters
    const ticketId = searchParams.get('ticket') || '';
    const userName = searchParams.get('user') || '';
    const issueTitle = searchParams.get('title') || '';
    const teamLabel = searchParams.get('team') || 'IT Support';
    
    // Calculate estimated response time based on current time
    const now = new Date();
    const businessHours = now.getHours() >= 8 && now.getHours() < 17;
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    let estimatedTime;
    if (businessHours && isWeekday) {
      estimatedTime = '2-4 business hours';
    } else if (isWeekday) {
      estimatedTime = 'Next business day';
    } else {
      estimatedTime = 'Next business day (Monday)';
    }

    setTicketData({
      ticketId,
      userName,
      issueTitle,
      teamLabel,
      estimatedTime
    });
  }, [searchParams]);

  const handleNewTicket = () => {
    window.location.href = '/public-portal';
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  if (!ticketData.ticketId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Loading confirmation details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <Ticket className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">IT Support Portal</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Success Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="mb-6 relative overflow-hidden">
            {/* Confetti-like sparkles animation */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ 
                    x: Math.random() * 400, 
                    y: Math.random() * 200,
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{ 
                    y: [null, -20, 0],
                    scale: [0, 1, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                </motion.div>
              ))}
            </div>
            
            <CardHeader className="text-center pb-4 relative z-10">
              <motion.div 
                className="flex justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.4 }}
              >
                <div className="relative">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  <motion.div
                    className="absolute inset-0 border-4 border-green-300 rounded-full"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: [0, 0.6, 0] }}
                    transition={{ delay: 0.5, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <CardTitle className="text-2xl text-green-700">
                  🎉 Support Request Submitted Successfully!
                </CardTitle>
              </motion.div>
            </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Confirmation Number */}
            <motion.div 
              className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center relative overflow-hidden"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {/* Shimmer background effect */}
              <motion.div
                className="absolute inset-0 -skew-x-12 -translate-x-full"
                animate={{ translateX: '100vw' }}
                transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent)',
                  width: '30%',
                  height: '100%'
                }}
              />
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Your Confirmation Number</h2>
              <motion.div 
                className="text-3xl font-bold text-blue-600 font-mono tracking-wider relative"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, duration: 0.4, type: "spring" }}
              >
                {ticketData.ticketId}
                <motion.div
                  className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-600 rounded-lg opacity-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.2, 0] }}
                  transition={{ delay: 1.2, duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              </motion.div>
              <p className="text-sm text-blue-700 mt-2">
                Please save this number for your records
              </p>
            </motion.div>

            {/* Request Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Request Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Submitted by:</span>
                    <p className="text-gray-900">{ticketData.userName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Issue:</span>
                    <p className="text-gray-900">{ticketData.issueTitle}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Assigned to:</span>
                    <p className="text-gray-900">{ticketData.teamLabel}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Next Steps</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Expected Response:</span>
                      <p className="text-gray-900">{ticketData.estimatedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email Notification:</span>
                      <p className="text-gray-900">Sent to your email client</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Urgent Issues:</span>
                      <p className="text-gray-900">Call the IT Help Desk directly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">📋 Important Information</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Keep your confirmation number <strong>{ticketData.ticketId}</strong> for reference</li>
                <li>• You will receive email updates on your request status</li>
                <li>• Response times may vary during high-volume periods</li>
                <li>• For emergency issues, please contact the IT Help Desk directly</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 pt-6 border-t"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleNewTicket}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Submit Another Request
                </Button>
              </motion.div>
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Home
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
        </motion.div>
      </main>
    </div>
  );
}