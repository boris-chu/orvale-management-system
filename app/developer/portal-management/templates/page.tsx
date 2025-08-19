'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Clock,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ResponseTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
  active: boolean;
  trigger_event: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

interface SLAConfiguration {
  id: number;
  name: string;
  category: string;
  priority: string;
  response_time_hours: number;
  resolution_time_hours: number;
  escalation_time_hours: number;
  business_hours_only: boolean;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

export default function ResponseTemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [slaConfigs, setSlaConfigs] = useState<SLAConfiguration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSLAModal, setShowSLAModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [editingSLA, setEditingSLA] = useState<SLAConfiguration | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ResponseTemplate | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'confirmation',
    subject: '',
    body: '',
    variables: [] as string[],
    active: true,
    trigger_event: ''
  });

  const [slaForm, setSlaForm] = useState({
    name: '',
    category: 'Application Support',
    priority: 'medium',
    response_time_hours: 24,
    resolution_time_hours: 72,
    escalation_time_hours: 48,
    business_hours_only: true,
    active: true
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/');
          return;
        }

        const response = await fetch('/api/auth/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const userData = await response.json();
        setUser(userData);
        await Promise.all([loadTemplates(), loadSLAConfigs()]);
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/response-templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        showNotification('Error loading templates', 'error');
      }
    } catch (error) {
      console.error('Load templates error:', error);
      showNotification('Error loading templates', 'error');
    }
  };

  const loadSLAConfigs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/sla-configurations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSlaConfigs(data.slaConfigurations);
      } else {
        showNotification('Error loading SLA configurations', 'error');
      }
    } catch (error) {
      console.error('Load SLA configs error:', error);
      showNotification('Error loading SLA configurations', 'error');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const method = editingTemplate ? 'PUT' : 'POST';
      const body = editingTemplate ? 
        { ...templateForm, id: editingTemplate.id } : 
        templateForm;

      const response = await fetch('/api/developer/response-templates', {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showNotification(`Template ${editingTemplate ? 'updated' : 'created'} successfully`);
        setShowTemplateModal(false);
        resetTemplateForm();
        await loadTemplates();
      } else {
        showNotification('Error saving template', 'error');
      }
    } catch (error) {
      console.error('Save template error:', error);
      showNotification('Error saving template', 'error');
    }
  };

  const handleSaveSLA = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const method = editingSLA ? 'PUT' : 'POST';
      const body = editingSLA ? 
        { ...slaForm, id: editingSLA.id } : 
        slaForm;

      const response = await fetch('/api/developer/sla-configurations', {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showNotification(`SLA configuration ${editingSLA ? 'updated' : 'created'} successfully`);
        setShowSLAModal(false);
        resetSLAForm();
        await loadSLAConfigs();
      } else {
        showNotification('Error saving SLA configuration', 'error');
      }
    } catch (error) {
      console.error('Save SLA error:', error);
      showNotification('Error saving SLA configuration', 'error');
    }
  };

  const handleDeleteTemplate = async (template: ResponseTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/response-templates?id=${template.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('Template deleted successfully');
        await loadTemplates();
      } else {
        showNotification('Error deleting template', 'error');
      }
    } catch (error) {
      console.error('Delete template error:', error);
      showNotification('Error deleting template', 'error');
    }
  };

  const handleDeleteSLA = async (sla: SLAConfiguration) => {
    if (!confirm(`Are you sure you want to delete "${sla.name}"?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/sla-configurations?id=${sla.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('SLA configuration deleted successfully');
        await loadSLAConfigs();
      } else {
        showNotification('Error deleting SLA configuration', 'error');
      }
    } catch (error) {
      console.error('Delete SLA error:', error);
      showNotification('Error deleting SLA configuration', 'error');
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      category: 'confirmation',
      subject: '',
      body: '',
      variables: [],
      active: true,
      trigger_event: ''
    });
    setEditingTemplate(null);
  };

  const resetSLAForm = () => {
    setSlaForm({
      name: '',
      category: 'Application Support',
      priority: 'medium',
      response_time_hours: 24,
      resolution_time_hours: 72,
      escalation_time_hours: 48,
      business_hours_only: true,
      active: true
    });
    setEditingSLA(null);
  };

  const openTemplateModal = (template?: ResponseTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        category: template.category,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        active: template.active,
        trigger_event: template.trigger_event || ''
      });
    } else {
      resetTemplateForm();
    }
    setShowTemplateModal(true);
  };

  const openSLAModal = (sla?: SLAConfiguration) => {
    if (sla) {
      setEditingSLA(sla);
      setSlaForm({
        name: sla.name,
        category: sla.category,
        priority: sla.priority,
        response_time_hours: sla.response_time_hours,
        resolution_time_hours: sla.resolution_time_hours,
        escalation_time_hours: sla.escalation_time_hours,
        business_hours_only: sla.business_hours_only,
        active: sla.active
      });
    } else {
      resetSLAForm();
    }
    setShowSLAModal(true);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  const templateCategories = ['confirmation', 'status_update', 'completion', 'escalation', 'reminder'];
  const supportCategories = ['Application Support', 'Hardware', 'Infrastructure', 'Security', 'Network'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const triggers = ['on_submission', 'on_assignment', 'on_start_work', 'on_completion', 'on_escalation', 'manual'];

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
                <FileText className="h-8 w-8 mr-3 text-indigo-600" />
                Response Templates & SLA Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage automated response templates and service level agreements
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

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Response Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              SLA Configurations ({slaConfigs.length})
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-md bg-white text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => openTemplateModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            <Badge 
                              variant={template.active ? "default" : "outline"} 
                              className="text-xs"
                            >
                              {template.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {template.subject}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <span>Variables: {template.variables.length}</span>
                        <span>•</span>
                        <span>Trigger: {template.trigger_event || 'Manual'}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPreviewTemplate(template);
                            setShowPreviewModal(true);
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTemplateModal(template)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'No templates match your search criteria.' 
                      : 'Get started by creating your first response template.'}
                  </p>
                  <Button onClick={() => openTemplateModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SLA Tab */}
          <TabsContent value="sla" className="space-y-6">
            {/* SLA Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">
                    Configure response times and escalation rules for different ticket categories and priorities.
                  </p>
                  <Button onClick={() => openSLAModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    New SLA Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SLA Configurations */}
            <div className="space-y-4">
              {slaConfigs.map((sla, index) => (
                <motion.div
                  key={sla.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-medium text-lg">{sla.name}</h3>
                            <Badge variant="secondary">{sla.category}</Badge>
                            <Badge variant={sla.priority === 'urgent' ? 'destructive' : 'default'}>
                              {sla.priority}
                            </Badge>
                            <Badge variant={sla.active ? "default" : "outline"}>
                              {sla.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Response Time</span>
                              <div className="font-medium">{sla.response_time_hours}h</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Resolution Time</span>
                              <div className="font-medium">{sla.resolution_time_hours}h</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Escalation Time</span>
                              <div className="font-medium">{sla.escalation_time_hours}h</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Business Hours</span>
                              <div className="font-medium">{sla.business_hours_only ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSLAModal(sla)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSLA(sla)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {slaConfigs.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No SLA configurations found</h3>
                  <p className="text-gray-600 mb-4">
                    Get started by creating your first SLA configuration.
                  </p>
                  <Button onClick={() => openSLAModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create SLA Configuration
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Template Modal */}
        <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'New Response Template'}
              </DialogTitle>
              <DialogDescription>
                Create or edit automated response templates with dynamic variables
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    placeholder="Enter template name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
                  >
                    {templateCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trigger Event
                  </label>
                  <select
                    value={templateForm.trigger_event}
                    onChange={(e) => setTemplateForm({...templateForm, trigger_event: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
                  >
                    <option value="">Select trigger</option>
                    {triggers.map(trigger => (
                      <option key={trigger} value={trigger}>{trigger}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-8">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={templateForm.active}
                      onChange={(e) => setTemplateForm({...templateForm, active: e.target.checked})}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject
                </label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                  placeholder="Enter email subject line"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{variable}'} syntax for dynamic content (e.g., {'{ticketId}'})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body
                </label>
                <Textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})}
                  placeholder="Enter email body content"
                  rows={12}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available variables: userName, ticketId, category, priority, assignedTechnician, teamName, etc.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* SLA Modal */}
        <Dialog open={showSLAModal} onOpenChange={setShowSLAModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSLA ? 'Edit SLA Configuration' : 'New SLA Configuration'}
              </DialogTitle>
              <DialogDescription>
                Configure response and resolution times for different ticket categories and priorities
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuration Name
                  </label>
                  <Input
                    value={slaForm.name}
                    onChange={(e) => setSlaForm({...slaForm, name: e.target.value})}
                    placeholder="Enter configuration name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={slaForm.category}
                    onChange={(e) => setSlaForm({...slaForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
                  >
                    {supportCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={slaForm.priority}
                  onChange={(e) => setSlaForm({...slaForm, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white"
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Time (hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={slaForm.response_time_hours}
                    onChange={(e) => setSlaForm({...slaForm, response_time_hours: parseFloat(e.target.value) || 0})}
                    placeholder="24"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Time (hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={slaForm.resolution_time_hours}
                    onChange={(e) => setSlaForm({...slaForm, resolution_time_hours: parseFloat(e.target.value) || 0})}
                    placeholder="72"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escalation Time (hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={slaForm.escalation_time_hours}
                    onChange={(e) => setSlaForm({...slaForm, escalation_time_hours: parseFloat(e.target.value) || 0})}
                    placeholder="48"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={slaForm.business_hours_only}
                    onChange={(e) => setSlaForm({...slaForm, business_hours_only: e.target.checked})}
                    className="mr-2"
                  />
                  Business Hours Only
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={slaForm.active}
                    onChange={(e) => setSlaForm({...slaForm, active: e.target.checked})}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowSLAModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSLA}>
                  {editingSLA ? 'Update Configuration' : 'Create Configuration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
              <DialogDescription>
                Preview of how this template will appear in emails
              </DialogDescription>
            </DialogHeader>
            
            {previewTemplate && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <div className="p-3 bg-gray-50 border rounded-md">
                    {previewTemplate.subject}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
                  <div className="p-4 bg-gray-50 border rounded-md whitespace-pre-wrap">
                    {previewTemplate.body}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variables ({previewTemplate.variables.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map(variable => (
                      <Badge key={variable} variant="secondary">
                        {'{' + variable + '}'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}