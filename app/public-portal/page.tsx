'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, Monitor, Phone, Building, Users, Clock } from 'lucide-react';
import { organizationalData } from '../../config/organizational-data';

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

interface ComputerInfo {
  ip: string;
  domain: string;
  browser: string;
  timestamp: string;
}

export default function PublicPortal() {
  const [formData, setFormData] = useState<FormData>({
    emailRecipient: '',
    userName: '',
    employeeNumber: '',
    phoneNumber: '',
    location: '',
    section: '',
    teleworking: 'No',
    onBehalf: false,
    submittedBy: '',
    submittedByEmployeeNumber: '',
    issueTitle: '',
    issueDescription: ''
  });

  const [computerInfo, setComputerInfo] = useState<ComputerInfo>({
    ip: '',
    domain: 'LAPDS5',
    browser: '',
    timestamp: ''
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [emailPreview, setEmailPreview] = useState({ subject: '', html: '', recipient: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-detect computer info on component mount
  useEffect(() => {
    const detectComputerInfo = async () => {
      try {
        const response = await fetch('/api/system-info');
        const data = await response.json();
        
        setComputerInfo({
          ip: data.ip || 'Unable to detect',
          domain: data.domain || 'Not on domain',
          browser: `${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || navigator.userAgent.match(/Firefox\/[\d.]+/)?.[0] || navigator.userAgent.match(/Safari\/[\d.]+/)?.[0] || navigator.userAgent.match(/Edge\/[\d.]+/)?.[0] || 'Unknown Browser'} on ${navigator.platform}`,
          timestamp: new Date().toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      } catch (error) {
        console.error('Failed to detect computer info:', error);
        // Set fallback values if API fails
        setComputerInfo({
          ip: 'Unable to detect',
          domain: 'Not on domain',
          browser: `${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || navigator.userAgent.match(/Firefox\/[\d.]+/)?.[0] || navigator.userAgent.match(/Safari\/[\d.]+/)?.[0] || navigator.userAgent.match(/Edge\/[\d.]+/)?.[0] || 'Unknown Browser'} on ${navigator.platform}`,
          timestamp: new Date().toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      }
    };

    detectComputerInfo();
  }, []);

  const supportTeams = [
    { value: 'BechtelTechs@dpss.lacounty.gov', label: 'DPSS Academy' },
    { value: 'BHRTechs@dpss.lacounty.gov', label: 'Bureau of Human Resources' },
    { value: 'CrossroadsITSupport@dpss.lacounty.gov', label: 'Crossroads East' },
    { value: 'CrossroadsITSupport@dpss.lacounty.gov', label: 'Crossroads Main' },
    { value: 'CrossroadsITSupport@dpss.lacounty.gov', label: 'Crossroads West' },
    { value: 'FODTechs@dpss.lacounty.gov', label: 'Kaiser Building (FOD | IHSS | LOD)' }
  ];

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Phone number formatting function
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = numbers.substring(0, 10);
    
    // Format as (XXX) XXX-XXXX
    if (limited.length >= 6) {
      return `(${limited.substring(0, 3)}) ${limited.substring(3, 6)}-${limited.substring(6)}`;
    } else if (limited.length >= 3) {
      return `(${limited.substring(0, 3)}) ${limited.substring(3)}`;
    } else {
      return limited;
    }
  };

  // Employee number validation
  const validateEmployeeNumber = (value: string): boolean => {
    const pattern = /^[cte]\d{6}$/i; // c, t, or e followed by 6 digits (case insensitive)
    return pattern.test(value);
  };

  // Phone number validation
  const validatePhoneNumber = (value: string): boolean => {
    const numbers = value.replace(/\D/g, '');
    return numbers.length === 10;
  };

  // Handle form field changes with validation
  const handleFieldChange = (field: string, value: string) => {
    let processedValue = value;
    let error = '';

    // Process phone number formatting
    if (field === 'phoneNumber') {
      processedValue = formatPhoneNumber(value);
      if (processedValue.replace(/\D/g, '').length > 0 && !validatePhoneNumber(processedValue)) {
        error = 'Phone number must be 10 digits';
      }
    }

    // Validate employee number
    if (field === 'employeeNumber') {
      // Limit to 7 characters max (1 letter + 6 digits)
      processedValue = value.toLowerCase().substring(0, 7);
      if (processedValue.length > 0 && !validateEmployeeNumber(processedValue)) {
        error = 'Employee number must start with c, t, or e followed by 6 digits (e.g., e123456)';
      }
    }

    // Update form data
    setFormData(prev => ({ ...prev, [field]: processedValue }));

    // Update validation errors
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Handle select field changes
  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const errors: {[key: string]: string} = {};
    
    if (!validatePhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = 'Valid 10-digit phone number is required';
    }
    
    if (!validateEmployeeNumber(formData.employeeNumber)) {
      errors.employeeNumber = 'Valid employee number is required (c, t, or e followed by 6 digits)';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showNotification('Please fix the validation errors before submitting', 'error');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const selectedTeam = supportTeams.find(team => team.value === formData.emailRecipient);
      
      // Create email content
      const subject = `IT Support Request - ${formData.issueTitle}`;
      const htmlBody = generateEmailHTML();
      
      // Submit to backend
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: formData.userName,
          employee_number: formData.employeeNumber,
          phone_number: formData.phoneNumber,
          location: formData.location,
          section: formData.section,
          teleworking: formData.teleworking,
          submitted_by: formData.onBehalf ? formData.submittedBy : formData.userName,
          submitted_by_employee_number: formData.onBehalf ? formData.submittedByEmployeeNumber : formData.employeeNumber,
          on_behalf: formData.onBehalf,
          issue_title: formData.issueTitle,
          issue_description: formData.issueDescription,
          computer_info: computerInfo,
          priority: 'medium',
          assigned_team: 'ITTS_Main',
          email_recipient: formData.emailRecipient,
          email_recipient_display: selectedTeam?.label || 'IT Support'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`✅ Ticket ${result.ticket_id} submitted successfully!`, 'success');
        
        // Copy formatted email and show preview
        await copyFormattedEmailAndOpen(subject, htmlBody, formData.emailRecipient);
        
        // Reset form
        if (formRef.current) {
          formRef.current.reset();
        }
        setFormData({
          emailRecipient: '',
          userName: '',
          employeeNumber: '',
          phoneNumber: '',
          location: '',
          section: '',
          teleworking: 'No',
          onBehalf: false,
          submittedBy: '',
          submittedByEmployeeNumber: '',
          issueTitle: '',
          issueDescription: ''
        });
      } else {
        showNotification(`❌ ${result.message || 'Failed to submit ticket'}`, 'error');
      }
    } catch (error) {
      console.error('Submit error:', error);
      showNotification('❌ Network error. Please check your connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateEmailHTML = () => {
    const selectedTeam = supportTeams.find(team => team.value === formData.emailRecipient);
    const teamLabel = selectedTeam?.label || 'IT Support';
    
    return `
      <html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #047dba; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">🎟️ IT Support Request</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Submitted via Orvale Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #047dba; margin-bottom: 20px;">
              <strong>Good evening, ${teamLabel} Team,</strong><br>
              I need assistance with the following issue:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #047dba;">
              <h3 style="color: #047dba; margin-top: 0;">🔧 ${formData.issueTitle}</h3>
              <p style="margin-bottom: 0; white-space: pre-wrap;">${formData.issueDescription}</p>
            </div>

            <h3 style="color: #047dba; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">CONTACT INFORMATION:</h3>
            <table style="width: 100%; margin-bottom: 25px;">
              <tr><td style="padding: 5px 10px; font-weight: bold;">Name:</td><td style="padding: 5px 10px;">${formData.userName}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Employee Number:</td><td style="padding: 5px 10px;">${formData.employeeNumber}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Teleworking:</td><td style="padding: 5px 10px;">${formData.teleworking}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Contact Phone:</td><td style="padding: 5px 10px;">${formData.phoneNumber}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Location:</td><td style="padding: 5px 10px;">${formData.location}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Section:</td><td style="padding: 5px 10px;">${formData.section}</td></tr>
            </table>

            <h3 style="color: #047dba; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">COMPUTER INFORMATION:</h3>
            <table style="width: 100%; margin-bottom: 25px;">
              <tr><td style="padding: 5px 10px; font-weight: bold;">IP Address:</td><td style="padding: 5px 10px;">${computerInfo.ip}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Domain:</td><td style="padding: 5px 10px;">${computerInfo.domain}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Browser:</td><td style="padding: 5px 10px;">${computerInfo.browser}</td></tr>
              <tr><td style="padding: 5px 10px; font-weight: bold;">Timestamp:</td><td style="padding: 5px 10px;">${computerInfo.timestamp}</td></tr>
            </table>

            <div style="background: #e8f5e8; border: 1px solid #c3e6c3; padding: 15px; border-radius: 6px; text-align: center;">
              <strong>Thank you for your assistance.</strong>
            </div>
          </div>
        </div>
      </body></html>
    `;
  };

  const copyFormattedEmailAndOpen = async (subject: string, htmlBody: string, recipient: string) => {
    try {
      showNotification('📋 Copying formatted email...', 'info');
      
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      
      if (navigator.clipboard.write && window.ClipboardItem) {
        try {
          const htmlBlob = new Blob([htmlBody], { type: 'text/html' });
          const textBlob = new Blob([stripHtmlForText(htmlBody)], { type: 'text/plain' });
          
          const clipboardItem = new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          });
          
          await navigator.clipboard.write([clipboardItem]);
        } catch (clipboardError) {
          console.warn('Rich clipboard failed, trying text fallback:', clipboardError);
          await navigator.clipboard.writeText(stripHtmlForText(htmlBody));
        }
      } else if (navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(stripHtmlForText(htmlBody));
      } else {
        throw new Error('No clipboard API available');
      }
      
      setEmailPreview({ subject, html: htmlBody, recipient });
      setShowPreviewModal(true);
      
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('📋 Manual Copy Required - Please copy the content manually.', 'warning');
      setEmailPreview({ subject, html: htmlBody, recipient });
      setShowPreviewModal(true);
    }
  };

  const stripHtmlForText = (html: string) => {
    let text = html.replace(/<html><body[^>]*>/, '').replace(/<\/body><\/html>/, '');
    text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
    text = text.replace(/<script[^>]*>.*?<\/script>/gi, '');
    text = text.replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/?strong[^>]*>/gi, '');
    text = text.replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '\n$1');
    text = text.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableMatch) => {
      let bulletPoints = '';
      const rows = tableMatch.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      rows.forEach(row => {
        const cells = row.match(/<td[^>]*>([^<]*)<\/td>/gi) || [];
        if (cells.length >= 2) {
          const label = cells[0].replace(/<[^>]*>/g, '').trim();
          const value = cells[1].replace(/<[^>]*>/g, '').trim();
          if (label && value) {
            bulletPoints += `• ${label} ${value}\n`;
          }
        }
      });
      
      return bulletPoints;
    });
    
    text = text.replace(/<[^>]+>/gi, '');
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.replace(/^\s+|\s+$/g, '');
    text = text.replace(/CONTACT INFORMATION:/g, '\nCONTACT INFORMATION:');
    text = text.replace(/COMPUTER INFORMATION:/g, '\nCOMPUTER INFORMATION:');
    
    return text.trim();
  };

  const openEmailClient = () => {
    const plainTextBody = stripHtmlForText(emailPreview.html);
    const mailtoLink = `mailto:${emailPreview.recipient}?subject=${encodeURIComponent(emailPreview.subject)}&body=${encodeURIComponent(plainTextBody)}`;
    window.location.href = mailtoLink;
    setShowPreviewModal(false);
    showNotification('📧 Email opened! For better formatting, press Ctrl+V to paste the HTML version.', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className={`w-96 ${
            notification.type === 'success' ? 'border-green-500 bg-green-50' :
            notification.type === 'error' ? 'border-red-500 bg-red-50' :
            notification.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <AlertDescription className={`${
              notification.type === 'success' ? 'text-green-800' :
              notification.type === 'error' ? 'text-red-800' :
              notification.type === 'warning' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              {notification.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-lg text-gray-600">
            Submit your IT support request through the <strong className="text-blue-600">Orvale Management System</strong><br />
            Our IT team will assist you as soon as possible.
          </p>
        </div>

        {/* Form Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              IT Support Request Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              {/* Support Team Selection */}
              <div>
                <Label htmlFor="emailRecipient">Select Support Team:</Label>
                <Select value={formData.emailRecipient} onValueChange={(value) => handleSelectChange('emailRecipient', value)}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Choose Your Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportTeams.map((team, index) => (
                      <SelectItem key={`team-${index}`} value={team.value}>
                        {team.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={formData.userName}
                    onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="employeeNumber">Employee Number</Label>
                  <Input
                    id="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={(e) => handleFieldChange('employeeNumber', e.target.value)}
                    placeholder="e123456"
                    className={validationErrors.employeeNumber ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.employeeNumber && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.employeeNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                    placeholder="(213) 555-0123"
                    className={validationErrors.phoneNumber ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={formData.location} onValueChange={(value) => handleSelectChange('location', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationalData.offices.map((office, index) => (
                        <SelectItem key={`office-${index}`} value={office}>
                          {office}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select value={formData.section} onValueChange={(value) => handleSelectChange('section', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationalData.sections.map((section, index) => (
                        <SelectItem key={`section-${index}`} value={section}>
                          {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="teleworking">Teleworking</Label>
                  <Select value={formData.teleworking} onValueChange={(value) => handleSelectChange('teleworking', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teleworking status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Issue Details */}
              <div>
                <Label htmlFor="issueTitle">Issue Title</Label>
                <Input
                  id="issueTitle"
                  value={formData.issueTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueTitle: e.target.value }))}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div>
                <Label htmlFor="issueDescription">Issue Description</Label>
                <Textarea
                  id="issueDescription"
                  value={formData.issueDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                  placeholder="Please describe the issue in detail..."
                  rows={5}
                  required
                />
              </div>

              {/* Computer Info Display */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Auto-Detected System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">IP Address:</span>
                      <Badge variant="outline" className="ml-2">{computerInfo.ip}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Domain:</span>
                      <Badge variant="outline" className="ml-2">{computerInfo.domain}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Browser:</span>
                      <Badge variant="outline" className="ml-2">{computerInfo.browser}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Timestamp:</span>
                      <Badge variant="outline" className="ml-2">{computerInfo.timestamp}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4 mr-2" />
                      Submit Support Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowLoginModal(true)}
            className="mr-4"
          >
            <Users className="h-4 w-4 mr-2" />
            IT Staff Login
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
          >
            ← Back to Home
          </Button>
        </div>
      </main>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IT Staff Login</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Access the ticket management system</p>
            {/* Login form would go here */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📧 Email Ready!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Formatted content has been copied to clipboard
              </AlertDescription>
            </Alert>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>To:</strong> {emailPreview.recipient}</p>
              <p><strong>Subject:</strong> {emailPreview.subject}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="font-medium text-green-800">✅ Formatted Email Copied!</p>
              <p className="text-sm text-green-600">Ready to paste into your email client</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={openEmailClient} className="flex-1 max-w-sm">
                📧 Open Email Client
              </Button>
              <Button variant="outline" onClick={() => setShowPreviewModal(false)} className="flex-1 max-w-sm">
                Close
              </Button>
            </div>

            <Alert className="bg-yellow-50">
              <AlertDescription className="text-yellow-800">
                <strong>✅ Email will open with content!</strong><br />
                <em>Optional:</em> For even better formatting, press <kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl+V</kbd> to paste the HTML version.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}