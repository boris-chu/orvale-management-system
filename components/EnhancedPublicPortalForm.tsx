'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Trash2, 
  Clock, 
  CheckCircle, 
  Info,
  RefreshCw,
  Database,
  Shield
} from 'lucide-react';
import { useFormCacheIntegration } from '@/hooks/useFormCacheIntegration';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FormData {
  emailRecipient: string;
  userName: string;
  employeeNumber: string;
  phoneNumber: string;
  location: string;
  section: string;
  teleworking: string;
  onBehalf: boolean;
  submittedBy: string;
  submittedByEmployeeNumber: string;
  issueTitle: string;
  issueDescription: string;
}

interface FormCacheSettings {
  enable_form_data_caching: boolean;
  form_cache_duration_days: number;
  enable_auto_save_drafts: boolean;
  enable_form_progress_indicator: boolean;
}

export default function EnhancedPublicPortalForm() {
  const [formData, setFormData] = useState<FormData>({
    emailRecipient: '',
    userName: '',
    employeeNumber: '',
    phoneNumber: '',
    location: '',
    section: '',
    teleworking: '',
    onBehalf: false,
    submittedBy: '',
    submittedByEmployeeNumber: '',
    issueTitle: '',
    issueDescription: ''
  });

  const [portalSettings, setPortalSettings] = useState<FormCacheSettings | null>(null);
  const [showCacheInfo, setShowCacheInfo] = useState(false);

  // Form cache integration
  const { 
    saveToCache, 
    clearCache, 
    getCacheInfo, 
    isInitialized 
  } = useFormCacheIntegration({
    formId: 'public_portal_form',
    formData,
    onFormDataUpdate: setFormData,
    autoSaveEnabled: portalSettings?.enable_auto_save_drafts ?? false,
    autoSaveDelay: 2000
  });

  // Load portal settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/developer/portal-settings');
        if (response.ok) {
          const settings = await response.json();
          setPortalSettings(settings.user_experience);
        }
      } catch (error) {
        console.error('Failed to load portal settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Update form data
  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate form completion percentage
  const calculateProgress = () => {
    const requiredFields = ['userName', 'emailRecipient', 'issueTitle', 'issueDescription'];
    const completedFields = requiredFields.filter(field => 
      formData[field as keyof FormData] && formData[field as keyof FormData] !== ''
    );
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  // Get cache information
  const cacheInfo = getCacheInfo();
  const progress = calculateProgress();

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header with Cache Status */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">DPSS IT Support Portal</CardTitle>
              
              {/* Cache Status & Controls */}
              {portalSettings?.enable_form_data_caching && (
                <div className="flex items-center space-x-2">
                  {portalSettings.enable_form_progress_indicator && (
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>{progress}% Complete</span>
                    </Badge>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCacheInfo(!showCacheInfo)}
                      >
                        <Database className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View form cache information</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={saveToCache}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manually save form data</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCache}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear cached form data</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Cache Information Panel */}
        {showCacheInfo && portalSettings?.enable_form_data_caching && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span>Form Cache Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cacheInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {cacheInfo.exists ? 'Active' : 'Empty'}
                    </div>
                    <p className="text-sm text-gray-500">Cache Status</p>
                  </div>
                  
                  {cacheInfo.exists && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round((cacheInfo.expiresIn || 0) / (24 * 60 * 60 * 1000))}
                        </div>
                        <p className="text-sm text-gray-500">Days Until Expiry</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {((cacheInfo.size || 0) / 1024).toFixed(1)}KB
                        </div>
                        <p className="text-sm text-gray-500">Cache Size</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Cache information unavailable</p>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Privacy Notice</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Your form data is stored locally on your device only. 
                  Cache renews each visit and expires in {portalSettings.form_cache_duration_days} days.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auto-save Status */}
        {portalSettings?.enable_auto_save_drafts && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Auto-save enabled:</strong> Your form data is automatically saved every few seconds while you type.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userName">Full Name *</Label>
                <Input
                  id="userName"
                  value={formData.userName}
                  onChange={(e) => updateFormData('userName', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="employeeNumber">Employee Number</Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => updateFormData('employeeNumber', e.target.value)}
                  placeholder="Enter employee number"
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  placeholder="Enter your location"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issue Information */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="issueTitle">Issue Title *</Label>
              <Input
                id="issueTitle"
                value={formData.issueTitle}
                onChange={(e) => updateFormData('issueTitle', e.target.value)}
                placeholder="Brief description of the issue"
              />
            </div>
            
            <div>
              <Label htmlFor="issueDescription">Issue Description *</Label>
              <Textarea
                id="issueDescription"
                value={formData.issueDescription}
                onChange={(e) => updateFormData('issueDescription', e.target.value)}
                placeholder="Detailed description of the issue..."
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {portalSettings?.enable_form_data_caching && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Database className="h-4 w-4" />
                    <span>
                      {cacheInfo?.exists 
                        ? `Form data cached (${portalSettings.form_cache_duration_days} days)`
                        : 'No cached data'
                      }
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button variant="outline">
                  Save as Draft
                </Button>
                <Button disabled={progress < 100}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Submit Ticket
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Info */}
        <Card className="border-dashed border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">Form Caching Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Form Caching:</strong> {portalSettings?.enable_form_data_caching ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Cache Duration:</strong> {portalSettings?.form_cache_duration_days || 30} days</p>
              <p><strong>Auto-Save:</strong> {portalSettings?.enable_auto_save_drafts ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Progress Indicator:</strong> {portalSettings?.enable_form_progress_indicator ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Form Completion:</strong> {progress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}