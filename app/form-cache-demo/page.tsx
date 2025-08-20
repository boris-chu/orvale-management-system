'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Settings, 
  TestTube, 
  Database,
  CheckCircle,
  Info
} from 'lucide-react';
import EnhancedPublicPortalForm from '@/components/EnhancedPublicPortalForm';
import Link from 'next/link';

export default function FormCacheDemoPage() {
  const [activeDemo, setActiveDemo] = useState<'form' | 'settings'>('form');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link 
                href="/developer/portal-management/settings" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Portal Settings</span>
              </Link>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <TestTube className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Form Caching Demo</h1>
                  <p className="text-sm text-gray-500">Test the form data caching functionality</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={activeDemo === 'form' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveDemo('form')}
              >
                Form Demo
              </Button>
              <Button
                variant={activeDemo === 'settings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveDemo('settings')}
              >
                <Link href="/developer/portal-management/settings" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Portal Settings</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>Form Caching</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Automatically saves form data locally in user's browser with configurable expiration.
              </p>
              <Badge variant="outline" className="w-full justify-center">
                30-day Cache Duration
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Auto-renewal</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Cache expiration automatically renews each time the user visits the portal.
              </p>
              <Badge variant="outline" className="w-full justify-center">
                Visit-based Renewal
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <span>Admin Control</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Administrators can enable/disable caching and set duration in Portal Settings.
              </p>
              <Badge variant="outline" className="w-full justify-center">
                Portal Settings
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Alert className="mb-8">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How to test:</strong>
            <ol className="mt-2 space-y-1 text-sm">
              <li>1. Fill out some form fields below</li>
              <li>2. Refresh the page or navigate away and return</li>
              <li>3. Notice your form data has been restored</li>
              <li>4. Use the cache controls to save or clear data manually</li>
              <li>5. Visit Portal Settings → User Experience to configure caching</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Demo Form */}
        {activeDemo === 'form' && <EnhancedPublicPortalForm />}
      </div>
    </div>
  );
}