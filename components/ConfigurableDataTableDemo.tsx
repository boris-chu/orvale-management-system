'use client';

import React, { useState, useEffect } from 'react';
import { ConfigurableDataTable } from './ConfigurableDataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Table, Users, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

// Sample data for demonstration
const generateSampleTickets = (count: number = 10) => {
  const statuses = ['open', 'in_progress', 'closed', 'escalated'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const teams = ['ITTS_Region7', 'HELPDESK', 'NET_North', 'DEV_Alpha'];
  const users = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson'];

  return Array.from({ length: count }, (_, i) => ({
    id: `TKT-${String(i + 1).padStart(4, '0')}`,
    title: `Sample Ticket ${i + 1}`,
    description: `This is a sample ticket description for testing purposes ${i + 1}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    assigned_team: teams[Math.floor(Math.random() * teams.length)],
    assigned_to: users[Math.floor(Math.random() * users.length)],
    submitted_by: users[Math.floor(Math.random() * users.length)],
    submitted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Application Support',
    subcategory: 'Login Issues'
  }));
};

const generateSampleUsers = (count: number = 8) => {
  const roles = ['admin', 'manager', 'support', 'user'];
  const teams = ['ITTS_Region7', 'HELPDESK', 'NET_North', 'DEV_Alpha'];
  const names = [
    'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
    'Emma Brown', 'Frank Miller', 'Grace Taylor', 'Henry Clark'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    username: names[i].toLowerCase().replace(' ', '.'),
    display_name: names[i],
    email: `${names[i].toLowerCase().replace(' ', '.')}@orvale.gov`,
    role: roles[Math.floor(Math.random() * roles.length)],
    team_id: teams[Math.floor(Math.random() * teams.length)],
    active: Math.random() > 0.1, // 90% active
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

interface DemoConfig {
  tableType: 'tickets_queue' | 'users_list' | 'helpdesk_queue';
  title: string;
  description: string;
  icon: React.ReactNode;
  data: any[];
}

export function ConfigurableDataTableDemo() {
  const [selectedDemo, setSelectedDemo] = useState<DemoConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const demoConfigs: DemoConfig[] = [
    {
      tableType: 'tickets_queue',
      title: 'Tickets Queue',
      description: 'IT support tickets with status tracking and assignments',
      icon: <Table className="h-5 w-5" />,
      data: generateSampleTickets(15)
    },
    {
      tableType: 'users_list',
      title: 'Users Management',
      description: 'System users with roles and team assignments',
      icon: <Users className="h-5 w-5" />,
      data: generateSampleUsers(12)
    },
    {
      tableType: 'helpdesk_queue',
      title: 'Helpdesk Queue',
      description: 'Multi-team helpdesk ticket management interface',
      icon: <Headphones className="h-5 w-5" />,
      data: generateSampleTickets(20)
    }
  ];

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      setLoading(false);
      // Regenerate sample data
      if (selectedDemo) {
        const updatedDemo = { ...selectedDemo };
        if (selectedDemo.tableType === 'users_list') {
          updatedDemo.data = generateSampleUsers(12);
        } else {
          updatedDemo.data = generateSampleTickets(15);
        }
        setSelectedDemo(updatedDemo);
      }
    }, 1000);
  };

  const handleRowClick = (params: any) => {
    console.log('Row clicked:', params.row);
    // You could open a modal, navigate to a detail page, etc.
  };

  const handleSelectionChange = (selectedIds: any) => {
    console.log('Selection changed:', selectedIds);
  };

  const handleConfigurationChange = (config: any) => {
    console.log('Configuration changed:', config);
    // You could save user preferences here
  };

  return (
    <div className="space-y-6">
      {/* Demo Selection */}
      {!selectedDemo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {demoConfigs.map((config) => (
            <Card 
              key={config.tableType}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => setSelectedDemo(config)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {config.icon}
                  {config.title}
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge variant="outline">
                    {config.data.length} sample rows
                  </Badge>
                  <Button variant="outline" size="sm">
                    View Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Selected Demo Display */}
      {selectedDemo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                {selectedDemo.icon}
                {selectedDemo.title} Demo
              </h2>
              <p className="text-gray-600 mt-1">{selectedDemo.description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedDemo(null)}
              >
                Back to Selection
              </Button>
            </div>
          </div>

          {/* Configurable Data Table */}
          <Card>
            <CardContent className="p-6">
              <ConfigurableDataTable
                tableIdentifier={selectedDemo.tableType}
                data={selectedDemo.data}
                loading={loading}
                onRowClick={handleRowClick}
                onSelectionChange={handleSelectionChange}
                onConfigurationChange={handleConfigurationChange}
                refreshKey={refreshKey}
                height={500}
                enableSelection={true}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Demo Information */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Features</CardTitle>
              <CardDescription>
                This demonstration shows the ConfigurableDataTable component in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Features Demonstrated:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Dynamic configuration loading from database</li>
                    <li>• Multiple column types (text, badge, user, date)</li>
                    <li>• Sorting and filtering capabilities</li>
                    <li>• Row selection and click handling</li>
                    <li>• Pagination with configurable page sizes</li>
                    <li>• Column resizing and hiding</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Technical Implementation:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Material-UI DataGrid integration</li>
                    <li>• TypeScript for type safety</li>
                    <li>• Authentication context integration</li>
                    <li>• Real-time configuration updates</li>
                    <li>• Permission-based access control</li>
                    <li>• Error handling and loading states</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}