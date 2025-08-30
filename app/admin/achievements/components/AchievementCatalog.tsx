'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  RotateCcw,
  Trophy,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  icon_type: string;
  xp_reward: number;
  criteria_type: string;
  criteria_value: number;
  active: boolean;
  display_order: number;
  unlocked_count?: number;
  created_at: string;
  updated_at: string;
}

interface AchievementCatalogProps {
  onEdit: (achievement: Achievement) => void;
  onRefresh: () => void;
}

const rarityColors = {
  common: 'bg-gray-100 text-gray-800',
  uncommon: 'bg-green-100 text-green-800',
  rare: 'bg-blue-100 text-blue-800',
  epic: 'bg-purple-100 text-purple-800',
  legendary: 'bg-yellow-100 text-yellow-800'
};

export default function AchievementCatalog({ onEdit, onRefresh }: AchievementCatalogProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filteredAchievements, setFilteredAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadAchievements();
  }, []);

  useEffect(() => {
    filterAchievements();
  }, [achievements, searchTerm, categoryFilter, rarityFilter, statusFilter]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/achievements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements);
      } else {
        throw new Error('Failed to load achievements');
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load achievements',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAchievements = () => {
    let filtered = [...achievements];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }

    // Rarity filter
    if (rarityFilter !== 'all') {
      filtered = filtered.filter(a => a.rarity === rarityFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(a => a.active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(a => !a.active);
    }

    setFilteredAchievements(filtered);
  };

  const handleToggleActive = async (achievement: Achievement) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/achievements/${achievement.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !achievement.active })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Achievement ${achievement.active ? 'deactivated' : 'activated'}`
        });
        loadAchievements();
        onRefresh();
      } else {
        throw new Error('Failed to update achievement');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update achievement status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (achievement: Achievement) => {
    if (!confirm(`Are you sure you want to delete "${achievement.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/achievements/${achievement.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Achievement deleted successfully'
        });
        loadAchievements();
        onRefresh();
      } else {
        throw new Error('Failed to delete achievement');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete achievement',
        variant: 'destructive'
      });
    }
  };

  const handleClone = async (achievement: Achievement) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/achievements/${achievement.id}/clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Achievement cloned successfully'
        });
        loadAchievements();
        onRefresh();
      } else {
        throw new Error('Failed to clone achievement');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clone achievement',
        variant: 'destructive'
      });
    }
  };

  const handleReorder = async (achievement: Achievement, direction: 'up' | 'down') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/achievements/${achievement.id}/reorder`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction })
      });

      if (response.ok) {
        loadAchievements();
      }
    } catch (error) {
      console.error('Failed to reorder achievement:', error);
    }
  };

  const renderIcon = (achievement: Achievement) => {
    if (achievement.icon_type === 'emoji') {
      return <span className="text-2xl">{achievement.icon}</span>;
    } else if (achievement.icon_type === 'lucide') {
      const IconComponent = Icons[achievement.icon as keyof typeof Icons] as any;
      return IconComponent ? <IconComponent className="h-6 w-6" /> : <Trophy className="h-6 w-6" />;
    }
    return <Trophy className="h-6 w-6" />;
  };

  const columns = [
    {
      accessorKey: 'display_order',
      header: 'Order',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">{row.original.display_order}</span>
          <div className="flex flex-col">
            <IconButton
              size="small"
              onClick={() => handleReorder(row.original, 'up')}
              disabled={row.index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleReorder(row.original, 'down')}
              disabled={row.index === filteredAchievements.length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </IconButton>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'icon',
      header: 'Icon',
      cell: ({ row }: any) => renderIcon(row.original)
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">{row.original.description}</div>
        </div>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => (
        <Chip 
          label={row.original.category} 
          size="small" 
          variant="outlined"
          className="capitalize"
        />
      )
    },
    {
      accessorKey: 'rarity',
      header: 'Rarity',
      cell: ({ row }: any) => (
        <Badge className={`${rarityColors[row.original.rarity as keyof typeof rarityColors]} capitalize`}>
          {row.original.rarity}
        </Badge>
      )
    },
    {
      accessorKey: 'xp_reward',
      header: 'XP',
      cell: ({ row }: any) => (
        <span className="font-semibold text-yellow-600">+{row.original.xp_reward}</span>
      )
    },
    {
      accessorKey: 'criteria_type',
      header: 'Criteria',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div className="font-medium capitalize">
            {row.original.criteria_type.replace(/_/g, ' ')}
          </div>
          <div className="text-gray-500">Value: {row.original.criteria_value}</div>
        </div>
      )
    },
    {
      accessorKey: 'unlocked_count',
      header: 'Unlocks',
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.unlocked_count || 0} users</span>
      )
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }: any) => (
        <Switch
          size="small"
          checked={row.original.active}
          onChange={() => handleToggleActive(row.original)}
          color="primary"
        />
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(row.original)}>
              <Edit className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clone">
            <IconButton size="small" onClick={() => handleClone(row.original)}>
              <Copy className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton 
              size="small" 
              onClick={() => handleDelete(row.original)}
              color="error"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search achievements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <FormControl size="small" className="min-w-[140px]">
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="Category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="productivity">Productivity</MenuItem>
            <MenuItem value="quality">Quality</MenuItem>
            <MenuItem value="collaboration">Collaboration</MenuItem>
            <MenuItem value="special">Special</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" className="min-w-[140px]">
          <InputLabel>Rarity</InputLabel>
          <Select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            label="Rarity"
          >
            <MenuItem value="all">All Rarities</MenuItem>
            <MenuItem value="common">Common</MenuItem>
            <MenuItem value="uncommon">Uncommon</MenuItem>
            <MenuItem value="rare">Rare</MenuItem>
            <MenuItem value="epic">Epic</MenuItem>
            <MenuItem value="legendary">Legendary</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" className="min-w-[140px]">
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchTerm('');
            setCategoryFilter('all');
            setRarityFilter('all');
            setStatusFilter('all');
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <DataTable
          columns={columns}
          data={filteredAchievements}
          loading={loading}
        />
      </motion.div>
    </div>
  );
}