'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Material-UI imports for working Select components
import { Select, MenuItem, FormControl, InputLabel, ListSubheader } from '@mui/material';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, Monitor, Phone, Building, Clock } from 'lucide-react';
import MaterialUILoginModalAnimated from '@/components/MaterialUILoginModalAnimated';
import { PublicChatWidget } from '@/components/public-portal/PublicChatWidget';
import apiClient from '@/lib/api-client';
// Import removed - will load dynamically from API

interface FormData {
  emailRecipient: string;
  userName: string;
  employeeNumber: string;
  phoneNumber: string;
  location: string;
  cubicleRoom: string;
  section: string;
  teleworking: string;
  requestCreatorDisplayName: string;
  issueTitle: string;
  issueDescription: string;
}

interface ComputerInfo {
  ip: string;
  domain: string;
  browser: string;
  platform: string;
  timestamp: string;
}

// Support teams will be loaded dynamically from database

export default function PublicPortal() {
  const [formData, setFormData] = useState<FormData>({
    emailRecipient: '',  // Will be set after support teams load
    userName: '',
    employeeNumber: '',
    phoneNumber: '',
    location: '',
    cubicleRoom: '',
    section: '',
    teleworking: 'No',
    requestCreatorDisplayName: '',
    issueTitle: '',
    issueDescription: ''
  });

  const [computerInfo, setComputerInfo] = useState<ComputerInfo>({
    ip: '',
    domain: 'Detecting...',
    browser: '',
    platform: '',
    timestamp: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [organizationalData, setOrganizationalData] = useState<any>(null);
  const [ticketCategories, setTicketCategories] = useState<any>(null);
  const [supportTeamGroups, setSupportTeamGroups] = useState<any>({});
  const [dataLoading, setDataLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  // Computed value for all support teams
  const allSupportTeams = Object.values(supportTeamGroups).flat() as any[];

  // Platform detection function with Apple Silicon support
  const getPlatformInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // Detect Apple Silicon Macs
    if (platform === 'MacIntel') {
      // Method 1: Check WebGL renderer for explicit Apple Silicon identification
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && 'getParameter' in gl && 'RENDERER' in gl) {
          const renderer = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER);
          
          // Apple Silicon GPUs show as "Apple M1/M2/M3" or contain "Apple"
          if (renderer && (renderer.includes('Apple M') || renderer.includes('Apple GPU'))) {
            return 'macOS (Apple Silicon)';
          }
        }
      } catch (e) {
        // WebGL detection failed, continue with other methods
      }
      
      // Method 2: Use CPU core count for chip identification
      const cores = navigator.hardwareConcurrency;
      const pixelRatio = window.devicePixelRatio;
      
      // Detect specific Apple Silicon chip based on core count
      const getAppleSiliconChip = (coreCount: number) => {
        // Core count patterns for Apple Silicon chips
        switch (coreCount) {
          case 8:
            return 'M1/M2/M3'; // Could be any base model
          case 9:
          case 10:
            return coreCount === 9 ? 'M4' : 'M1 Pro/M2 Pro/M1 Max/M4';
          case 11:
          case 12:
            return coreCount === 11 ? 'M3 Pro' : 'M2 Pro/M2 Max/M3 Pro';
          case 14:
            return 'M3 Max/M4 Pro'; // Your chip!
          case 16:
            return 'M3 Max/M4 Max';
          default:
            if (coreCount >= 8) {
              return 'Apple Silicon';
            }
            return null;
        }
      };
      
      // Apple Silicon detection with chip identification
      if (cores >= 8) {
        const chipModel = getAppleSiliconChip(cores);
        if (chipModel) {
          // With 8+ cores, we're confident it's Apple Silicon
          return `macOS (${chipModel})`;
        }
      }
      
      // Fallback for edge cases
      if (pixelRatio >= 2 && cores >= 4) {
        return 'macOS (likely Apple Silicon)';
      }
      
      return 'macOS (Intel)';
    }
    
    // Windows detection with detailed version and architecture
    if (platform.includes('Win')) {
      const getWindowsVersion = () => {
        // Windows 11 detection (NT 10.0 with specific build numbers)
        if (userAgent.includes('Windows NT 10.0')) {
          // Check for Windows 11 indicators
          if (userAgent.includes('WebView') || (navigator as any).userAgentData?.platform === 'Windows') {
            // Try to detect Windows 11 vs 10 through available APIs
            const isWindows11 = (navigator as any).userAgentData?.platformVersion && 
                               parseFloat((navigator as any).userAgentData.platformVersion) >= 13;
            if (isWindows11) {
              return 'Windows 11';
            }
          }
          return 'Windows 10/11';
        }
        
        // Windows 10 (older detection)
        if (userAgent.includes('Windows NT 10.0')) {
          return 'Windows 10';
        }
        
        // Windows 8.1
        if (userAgent.includes('Windows NT 6.3')) {
          return 'Windows 8.1';
        }
        
        // Windows 8
        if (userAgent.includes('Windows NT 6.2')) {
          return 'Windows 8';
        }
        
        // Windows 7
        if (userAgent.includes('Windows NT 6.1')) {
          return 'Windows 7';
        }
        
        // Windows Vista
        if (userAgent.includes('Windows NT 6.0')) {
          return 'Windows Vista';
        }
        
        // Windows XP
        if (userAgent.includes('Windows NT 5.1') || userAgent.includes('Windows XP')) {
          return 'Windows XP';
        }
        
        return 'Windows (Unknown Version)';
      };
      
      const getWindowsArchitecture = () => {
        // Check for ARM64 (Windows on ARM)
        if (userAgent.includes('ARM64') || userAgent.includes('WOW64; ARM64')) {
          return 'ARM64';
        }
        
        // Check for x64/AMD64
        if (userAgent.includes('WOW64') || userAgent.includes('Win64') || 
            userAgent.includes('x64') || userAgent.includes('AMD64')) {
          return 'x64';
        }
        
        // 32-bit x86
        return 'x86';
      };
      
      const getWindowsEdition = () => {
        // Try to detect Windows edition through available memory/features
        const cores = navigator.hardwareConcurrency;
        const memory = (navigator as any).deviceMemory;
        
        // High-end workstation/server indicators
        if (cores >= 16 && memory >= 32) {
          return ' Pro/Enterprise';
        }
        
        // Professional/business indicators
        if (cores >= 8 || memory >= 16) {
          return ' Pro';
        }
        
        return ''; // Likely Home edition or can't determine
      };
      
      const version = getWindowsVersion();
      const arch = getWindowsArchitecture();
      const edition = getWindowsEdition();
      
      return `${version}${edition} (${arch})`;
    }
    
    // Linux detection
    if (platform.includes('Linux')) {
      if (userAgent.includes('X11')) {
        return 'Linux (X11)';
      }
      return 'Linux';
    }
    
    // Mobile platforms
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      return userAgent.includes('iPad') ? 'iPadOS' : 'iOS';
    }
    
    if (/Android/.test(userAgent)) {
      return 'Android';
    }
    
    // Fallback to original platform
    return platform || 'Unknown Platform';
  };

  // Browser detection function with proper priority
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    
    // Check for Edge first (Chromium-based Edge contains "Edg/")
    if (userAgent.includes('Edg/')) {
      const version = userAgent.match(/Edg\/([\d.]+)/)?.[0];
      return version ? `Microsoft Edge ${version.replace('Edg/', '')}` : 'Microsoft Edge';
    }
    
    // Check for Chrome (but not Edge)
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      const version = userAgent.match(/Chrome\/([\d.]+)/)?.[0];
      return version || 'Chrome';
    }
    
    // Check for Firefox
    if (userAgent.includes('Firefox/')) {
      const version = userAgent.match(/Firefox\/([\d.]+)/)?.[0];
      return version || 'Firefox';
    }
    
    // Check for Safari (but not Chrome-based)
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      const version = userAgent.match(/Version\/([\d.]+)/)?.[1];
      return version ? `Safari ${version}` : 'Safari';
    }
    
    // Check for Internet Explorer
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      return 'Internet Explorer';
    }
    
    return 'Unknown Browser';
  };

  // Auto-detect computer info on component mount
  useEffect(() => {
    const detectComputerInfo = async () => {
      try {
        const result = await apiClient.getSystemInfo();
        const data = result.data;
        
        setComputerInfo({
          ip: data.ip || 'Unable to detect',
          domain: data.domain || 'No domain detected',
          browser: getBrowserInfo(),
          platform: getPlatformInfo(),
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
          domain: 'No domain detected',
          browser: getBrowserInfo(),
          platform: getPlatformInfo(),
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

  // Load organizational data, ticket categories, and support teams
  useEffect(() => {
    const loadTicketData = async () => {
      try {
        // Load organizational data, categories, and support teams in parallel
        const [orgResult, categoriesResult, supportTeamsResult] = await Promise.all([
          apiClient.getOrganization(),
          apiClient.getTicketCategories(),
          apiClient.getSupportTeams()
        ]);

        if (orgResult.success) {
          setOrganizationalData(orgResult.data);
        } else {
          console.error('Failed to load organizational data');
          setOrganizationalData({
            offices: [],
            bureaus: [],
            divisions: [],
            sections: []
          });
        }

        if (categoriesResult.success) {
          setTicketCategories(categoriesResult.data);
        } else {
          console.error('Failed to load ticket categories');
          setTicketCategories({});
        }

        if (supportTeamsResult.success) {
          const supportTeamsData = supportTeamsResult.data;
          setSupportTeamGroups(supportTeamsData.supportTeamGroups || {});
          
          // Set default email recipient to Crossroads Main if available
          const allTeams = Object.values(supportTeamsData.supportTeamGroups || {}).flat() as any[];
          const defaultTeam = allTeams.find((team: any) => team.value === 'crossroads_main') || allTeams[0];
          if (defaultTeam && !formData.emailRecipient) {
            setFormData(prev => ({ ...prev, emailRecipient: defaultTeam.value }));
          }
        } else {
          console.error('Failed to load support teams');
          setSupportTeamGroups({});
        }

      } catch (error) {
        console.error('Error loading ticket data:', error);
        setOrganizationalData({
          offices: [],
          bureaus: [],
          divisions: [],
          sections: []
        });
        setTicketCategories({});
        setSupportTeamGroups({});
      } finally {
        setDataLoading(false);
      }
    };

    loadTicketData();
  }, []);

  // localStorage utility functions
  const STORAGE_KEY = 'orvale_public_portal_form_data';
  const STORAGE_EXPIRY_DAYS = 30;

  const saveFormDataToStorage = (data: FormData) => {
    try {
      // Fields to save (excluding issueTitle and issueDescription)
      const fieldsToSave = {
        emailRecipient: data.emailRecipient,
        userName: data.userName,
        employeeNumber: data.employeeNumber,
        phoneNumber: data.phoneNumber,
        location: data.location,
        cubicleRoom: data.cubicleRoom,
        section: data.section,
        teleworking: data.teleworking,
        requestCreatorDisplayName: data.requestCreatorDisplayName
      };

      const storageData = {
        data: fieldsToSave,
        timestamp: Date.now(),
        expiryDays: STORAGE_EXPIRY_DAYS
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      console.log('✅ Form data saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save form data to localStorage:', error);
    }
  };

  const loadFormDataFromStorage = (): Partial<FormData> | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const storageData = JSON.parse(stored);
      const now = Date.now();
      const daysSinceStorage = (now - storageData.timestamp) / (1000 * 60 * 60 * 24);

      // Check if data has expired
      if (daysSinceStorage > STORAGE_EXPIRY_DAYS) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ Expired form data removed from localStorage');
        return null;
      }

      // Refresh timestamp to extend expiry by 30 days from now
      const refreshedData = {
        ...storageData,
        timestamp: now
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedData));
      console.log(`✅ Form data loaded from localStorage (${Math.floor(daysSinceStorage)} days old, expiry refreshed)`);

      return storageData.data;
    } catch (error) {
      console.error('❌ Failed to load form data from localStorage:', error);
      return null;
    }
  };

  // Load saved form data on component mount (after data is loaded)
  useEffect(() => {
    if (!dataLoading) {
      const savedData = loadFormDataFromStorage();
      if (savedData) {
        setFormData(prev => ({
          ...prev,
          ...savedData,
          // Keep issueTitle and issueDescription empty
          issueTitle: '',
          issueDescription: ''
        }));
        
        // Show notification that data was loaded
        showNotification('Your previous form information has been restored', 'info');
      }
    }
  }, [dataLoading]); // Run after organizational data is loaded

  // Save form data whenever relevant fields change (debounced)
  useEffect(() => {
    if (!dataLoading && formData.userName) { // Only save if form has meaningful data
      const timeoutId = setTimeout(() => {
        // Only save if we have some user data (not just empty form)
        const hasUserData = formData.userName || formData.employeeNumber || formData.phoneNumber;
        if (hasUserData) {
          saveFormDataToStorage(formData);
        }
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [
    formData.emailRecipient,
    formData.userName,
    formData.employeeNumber,
    formData.phoneNumber,
    formData.location,
    formData.cubicleRoom,
    formData.section,
    formData.teleworking,
    formData.requestCreatorDisplayName,
    dataLoading
  ]);

  const clearSavedData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      
      // Reset form to defaults (keeping current issue title and description)
      const currentIssueTitle = formData.issueTitle;
      const currentIssueDescription = formData.issueDescription;
      
      setFormData({
        emailRecipient: '',
        userName: '',
        employeeNumber: '',
        phoneNumber: '',
        location: '',
        cubicleRoom: '',
        section: '',
        teleworking: 'No',
        requestCreatorDisplayName: '',
        issueTitle: currentIssueTitle, // Keep current values
        issueDescription: currentIssueDescription // Keep current values
      });
      
      showNotification('Saved form data has been cleared', 'success');
      console.log('🗑️ Saved form data cleared by user');
    } catch (error) {
      console.error('❌ Failed to clear saved form data:', error);
      showNotification('Failed to clear saved data', 'error');
    }
  };

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
    console.log(`Select change: ${field} = ${value}`);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      console.log('Updated form data:', updated);
      return updated;
    });
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
      const selectedTeam = allSupportTeams.find(team => team.value === formData.emailRecipient);
      
      // Create email content
      const subject = `IT Support Request - ${formData.issueTitle}`;
      const htmlBody = generateEmailHTML();
      
      // Submit to backend
      const result = await apiClient.createPublicTicket({
        user_name: formData.userName,
        employee_number: formData.employeeNumber,
        phone_number: formData.phoneNumber,
        location: formData.location,
        cubicle_room: formData.cubicleRoom,
        section: formData.section,
        teleworking: formData.teleworking,
        request_creator_display_name: formData.requestCreatorDisplayName,
        issue_title: formData.issueTitle,
        issue_description: formData.issueDescription,
        computer_info: computerInfo,
        priority: 'medium',
        assigned_team: selectedTeam?.team_id || 'ITTS_Region7',
        email_recipient: selectedTeam?.email || 'CrossroadsITSupport@dpss.lacounty.gov',
        email_recipient_display: selectedTeam?.label || 'IT Support'
      });
      
      if (result.success) {
        // Save form data to localStorage for future use (excluding title and description)
        saveFormDataToStorage(formData);
        
        // Generate plain text version and open email directly
        const plainTextBody = generatePlainTextEmail();
        const mailtoLink = `mailto:${selectedTeam?.email || 'CrossroadsITSupport@dpss.lacounty.gov'}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextBody)}`;
        window.location.href = mailtoLink;
        
        // Redirect to success page with ticket details
        const successUrl = new URL('/public-portal/success', window.location.origin);
        successUrl.searchParams.set('ticket', result.ticket_id);
        successUrl.searchParams.set('user', formData.userName);
        successUrl.searchParams.set('title', formData.issueTitle);
        successUrl.searchParams.set('team', selectedTeam?.label || 'IT Support');
        
        // Small delay to allow email to open, then redirect
        setTimeout(() => {
          window.location.href = successUrl.toString();
        }, 1000);
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
    const selectedTeam = allSupportTeams.find(team => team.value === formData.emailRecipient);
    const teamLabel = selectedTeam?.label || 'IT Support';
    
    return `
      <html>
      <head>
        <style type="text/css">
          /* Force Outlook to provide a "view in browser" button */
          #outlook a { padding: 0; }
          /* Force Hotmail to display emails at full width */
          .ReadMsgBody { width: 100%; }
          .ExternalClass { width: 100%; }
          /* Prevent Webkit and Windows Mobile platforms from changing default font sizes */
          body, table, td, p, a, li, blockquote { 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
          }
          /* Remove margin on email wrapper */
          body { margin: 0; padding: 0; }
          /* Allow smoother rendering of resized images in IE */
          img { -ms-interpolation-mode: bicubic; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
          <tr>
            <td align="center" style="padding: 20px;">
              <!-- Main Container -->
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #047dba; color: #ffffff; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">IT Support Request</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Submitted via Orvale Management System</p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 30px;">
                    <!-- Greeting -->
                    <p style="font-size: 16px; color: #047dba; margin-bottom: 20px;">
                      <strong>Good evening, ${teamLabel} Team,</strong><br/>
                      I need assistance with the following issue:
                    </p>
                    
                    <!-- Issue Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="background-color: #f8f9fa; border-left: 4px solid #047dba; padding: 20px;">
                          <h2 style="color: #047dba; margin: 0 0 10px 0; font-size: 20px;">${formData.issueTitle}</h2>
                          <p style="margin: 0; color: #555555; white-space: pre-wrap;">${formData.issueDescription}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Contact Information -->
                    <h3 style="color: #047dba; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">CONTACT INFORMATION</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Name:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${formData.userName}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Employee Number:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${formData.employeeNumber}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Teleworking:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${formData.teleworking}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Contact Phone:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${formData.phoneNumber}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Location:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${formData.location}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Section:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${formData.section}</td>
                      </tr>
                    </table>
                    
                    <!-- Computer Information -->
                    <h3 style="color: #047dba; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">COMPUTER INFORMATION</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">IP Address:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${computerInfo.ip}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Domain:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${computerInfo.domain}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Browser:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${computerInfo.browser}</td>
                      </tr>
                      <tr style="background-color: #f8f9fa;">
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Platform:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${computerInfo.platform}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="padding: 8px 0; font-weight: bold; color: #555555;">Timestamp:</td>
                        <td width="60%" style="padding: 8px 0; color: #333333;">${computerInfo.timestamp}</td>
                      </tr>
                    </table>
                    
                    <!-- Thank You -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #e8f5e8; border: 1px solid #c3e6c3; padding: 15px; text-align: center; border-radius: 6px;">
                          <strong style="color: #2e7d32;">Thank you for your assistance.</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  };


  const generatePlainTextEmail = () => {
    const selectedTeam = allSupportTeams.find(team => team.value === formData.emailRecipient);
    const teamLabel = selectedTeam?.label || 'IT Support';
    
    return `Good evening, ${teamLabel} Team,

I need assistance with the following issue:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formData.issueTitle}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formData.issueDescription}


CONTACT INFORMATION:
────────────────────
Name: ${formData.userName}
Employee Number: ${formData.employeeNumber}
Teleworking: ${formData.teleworking}
Contact Phone: ${formData.phoneNumber}
Location: ${formData.location}
Section: ${formData.section}


COMPUTER INFORMATION:
────────────────────
IP Address: ${computerInfo.ip}
Domain: ${computerInfo.domain}
Browser: ${computerInfo.browser}
Platform: ${computerInfo.platform}
Timestamp: ${computerInfo.timestamp}


Thank you for your assistance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted via Orvale Management System`;
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
      
      rows.forEach((row: string) => {
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

        {/* Form Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Crossroads IT Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              {/* Support Team Selection */}
              <div>
                <FormControl size="small" className="w-full max-w-md" required>
                  <InputLabel id="emailRecipient-label">Select Support Team</InputLabel>
                  <Select
                    labelId="emailRecipient-label"
                    id="emailRecipient"
                    value={formData.emailRecipient}
                    label="Select Support Team"
                    onChange={(e) => handleSelectChange('emailRecipient', e.target.value)}
                  >
                    {Object.entries(supportTeamGroups || {}).map(([groupName, teams]) => [
                      <ListSubheader key={groupName} sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1976d2' }}>
                        {groupName}
                      </ListSubheader>,
                      ...(teams as any[]).map((team, index) => (
                        <MenuItem key={`${team.value}-${index}`} value={team.value} sx={{ pl: 3 }}>
                          {team.label}
                        </MenuItem>
                      ))
                    ]).flat()}
                  </Select>
                </FormControl>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={formData.userName}
                    onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="Name of person who needs assistance"
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

              {/* Phone Number and Cubicle/Room - side by side */}
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
                  <Label htmlFor="cubicleRoom">Cubicle/Room</Label>
                  <Input
                    id="cubicleRoom"
                    value={formData.cubicleRoom}
                    onChange={(e) => setFormData(prev => ({ ...prev, cubicleRoom: e.target.value }))}
                    placeholder="Enter cubicle number or room"
                  />
                </div>
              </div>

              {/* Location and Teleworking - side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="location-label">Location</InputLabel>
                    <Select
                      labelId="location-label"
                      id="location"
                      value={formData.location}
                      label="Location"
                      onChange={(e) => {
                        console.log('Location selected:', e.target.value);
                        handleSelectChange('location', e.target.value);
                      }}
                    >
                      {organizationalData?.offices?.map((office) => (
                        <MenuItem key={office} value={office}>
                          {office}
                        </MenuItem>
                      )) || []}
                    </Select>
                  </FormControl>
                </div>
                <div>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="teleworking-label">Teleworking</InputLabel>
                    <Select
                      labelId="teleworking-label"
                      id="teleworking"
                      value={formData.teleworking}
                      label="Teleworking"
                      onChange={(e) => {
                        console.log('Teleworking selected:', e.target.value);
                        handleSelectChange('teleworking', e.target.value);
                      }}
                    >
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Section - standalone */}
              <div>
                <FormControl size="small" fullWidth>
                  <InputLabel id="section-label">Section</InputLabel>
                  <Select
                    labelId="section-label"
                    id="section"
                    value={formData.section}
                    label="Section"
                    onChange={(e) => {
                      console.log('Section selected:', e.target.value);
                      handleSelectChange('section', e.target.value);
                    }}
                  >
                    {organizationalData?.sections?.map((section) => (
                      <MenuItem key={section} value={section}>
                        {section}
                      </MenuItem>
                    )) || []}
                  </Select>
                </FormControl>
              </div>

              {/* Request Creator */}
              <div>
                <Label htmlFor="requestCreatorDisplayName">Request Creator (Your Name)</Label>
                <Input
                  id="requestCreatorDisplayName"
                  value={formData.requestCreatorDisplayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestCreatorDisplayName: e.target.value }))}
                  placeholder="Enter your full name"
                />
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
                    System Information
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
                      <span className="font-medium">Platform:</span>
                      <Badge variant="outline" className="ml-2">{computerInfo.platform}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Timestamp:</span>
                      <Badge variant="outline" className="ml-2">{computerInfo.timestamp}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit and Clear Buttons */}
              <div className="relative flex justify-center items-center pt-4">
                {/* Centered Submit Button */}
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  size="lg"
                  className="px-8"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
                
                {/* Right-aligned Clear Saved Data Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSavedData}
                  disabled={isSubmitting}
                  className="absolute right-0"
                  title="Clear your saved form information"
                >
                  Clear Saved Data
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
          >
            ← Back to Home
          </Button>
        </div>
      </main>

      {/* Hidden IT Staff Access - Click bottom-right corner */}
      <div 
        className="fixed bottom-0 right-0 w-20 h-20 opacity-0 cursor-pointer bg-blue-600"
        onClick={() => setShowLoginModal(true)}
        title="IT Staff Access"
      />

      {/* Login Modal */}
      <MaterialUILoginModalAnimated 
        open={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        mode="staff"
        animationStyle="slide"
        title="IT Staff Access"
        description="Access internal staff management tools"
      />

      {/* Public Chat Widget */}
      <PublicChatWidget />
    </div>
  );
}