'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database,
  Download,
  Upload,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Trash2,
  Settings,
  Users,
  Building2,
  FolderTree,
  Calendar,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ExportData {
  categories: any[];
  supportTeams: any[];
  organizationStructure: any[];
  portalSettings: any;
  responseTemplates: any[];
  metadata: {
    exportDate: string;
    exportedBy: string;
    version: string;
  };
}

interface DataItem {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  count: number;
  lastModified: string;
  size: string;
}

export default function DataManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await apiClient.getCurrentUser();
        const userData = result.data?.user || result.data;
        
        if (!userData) {
          router.push('/');
          return;
        }
        
        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const dataItems: DataItem[] = [
    {
      id: 'categories',
      name: 'Ticket Categories',
      icon: FolderTree,
      description: 'All ticket categories, request types, and subcategories',
      count: 1247,
      lastModified: '2025-08-19',
      size: '156 KB'
    },
    {
      id: 'support-teams',
      name: 'Support Team Assignments',
      icon: Users,
      description: 'Team assignments for each category and subcategory',
      count: 156,
      lastModified: '2025-08-18',
      size: '24 KB'
    },
    {
      id: 'organization',
      name: 'Organization Structure',
      icon: Building2,
      description: 'DPSS offices, bureaus, divisions, and sections',
      count: 97,
      lastModified: '2025-08-17',
      size: '18 KB'
    },
    {
      id: 'portal-settings',
      name: 'Portal Settings',
      icon: Settings,
      description: 'Form configurations, validation rules, and display settings',
      count: 1,
      lastModified: '2025-08-19',
      size: '8 KB'
    },
    {
      id: 'templates',
      name: 'Response Templates',
      icon: FileText,
      description: 'Automated response templates and SLA configurations',
      count: 47,
      lastModified: '2025-08-16',
      size: '32 KB'
    }
  ];

  const handleFullExport = async () => {
    setExporting(true);
    try {
      const result = await apiClient.exportData({ exportType: 'full' });
      
      if (!result.success) {
        throw new Error('Export failed');
      }

      const data = result.data;
      setExportData(data);
      
      // Download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orvale-portal-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Configuration data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setImportPreview(data);
    } catch (error) {
      showNotification('Invalid JSON file', 'error');
      setImportFile(null);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile || !importPreview) return;

    setImporting(true);
    try {
      const result = await apiClient.importData(importPreview);
      
      if (!result.success) {
        throw new Error('Import failed');
      }

      showNotification('Configuration data imported successfully');
      setImportFile(null);
      setImportPreview(null);
    } catch (error) {
      console.error('Import error:', error);
      showNotification('Failed to import data', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSingleExport = async (dataType: string) => {
    try {
      const result = await apiClient.exportData({ exportType: 'single', dataType });
      
      if (!result.success) {
        throw new Error('Export failed');
      }

      const data = result.data;
      
      // Download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orvale-${dataType}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification(`${dataType} data exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export data', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/developer/portal-management" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal Management
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Database className="h-8 w-8 mr-3 text-gray-600" />
                Data Management
              </h1>
              <p className="text-gray-600 mt-2">
                Export and import portal configuration data
              </p>
            </div>
          </div>
        </div>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-6"
            >
              <Alert className={notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {notification.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {notification.message}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Full Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2 text-blue-600" />
                Full Configuration Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                Export all portal configuration data including categories, teams, settings, and templates.
              </p>
              <Button 
                onClick={handleFullExport}
                disabled={exporting}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileJson className="h-4 w-4 mr-2" />
                    Export All Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-green-600" />
                Configuration Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                Import portal configuration data from a previously exported file.
              </p>
              <Input 
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="mb-4"
              />
              {importPreview && (
                <div className="space-y-2">
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Preview: {Object.keys(importPreview).length} data sections found
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleImportConfirm}
                    disabled={importing}
                    variant="outline"
                    className="w-full"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Import
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Individual Data Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Data Exports</CardTitle>
            <p className="text-sm text-gray-600">Export specific data sections individually</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-medium text-sm">{item.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.count}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                      <span>Size: {item.size}</span>
                      <span>Modified: {item.lastModified}</span>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={() => handleSingleExport(item.id)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Export History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Recent Exports
              </span>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No export history available</p>
              <p className="text-sm">Your export activities will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}