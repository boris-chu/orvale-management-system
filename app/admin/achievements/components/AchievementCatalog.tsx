'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  TextField,
  CircularProgress,
  Typography
} from '@mui/material';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Trash2,
  Copy,
  Search,
  RotateCcw,
  Trophy,
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
      const result = await apiClient.getAchievements();

      if (result.success) {
        const data = result.data;
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
      const result = await apiClient.updateAchievement(achievement.id, { active: !achievement.active });

      if (result.success) {
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
      const result = await apiClient.deleteAchievement(achievement.id);

      if (result.success) {
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
      const result = await apiClient.cloneAchievement(achievement.id);

      if (result.success) {
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
      const result = await apiClient.reorderAchievement(achievement.id, direction);

      if (result.success) {
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
      const IconComponent = Icons[achievement.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
      return IconComponent ? <IconComponent className="h-6 w-6" /> : <Trophy className="h-6 w-6" />;
    }
    return <Trophy className="h-6 w-6" />;
  };


  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 max-w-xs">
          <TextField
            placeholder="Search achievements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <Search className="text-gray-400 h-4 w-4 mr-2" />
            }}
          />
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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Icon</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Rarity</TableCell>
                <TableCell>XP</TableCell>
                <TableCell>Criteria</TableCell>
                <TableCell>Unlocks</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" style={{ padding: '2rem' }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" className="ml-2">Loading achievements...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAchievements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" style={{ padding: '2rem' }}>
                    <Typography variant="body2" color="textSecondary">
                      No achievements found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAchievements.map((achievement, index) => (
                  <TableRow key={achievement.id} hover>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">{achievement.display_order}</span>
                        <div className="flex flex-col">
                          <IconButton
                            size="small"
                            onClick={() => handleReorder(achievement, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleReorder(achievement, 'down')}
                            disabled={index === filteredAchievements.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </IconButton>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderIcon(achievement)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-sm text-gray-500">{achievement.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={achievement.category} 
                        size="small" 
                        variant="outlined"
                        className="capitalize"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={`${rarityColors[achievement.rarity as keyof typeof rarityColors]} capitalize`}>
                        {achievement.rarity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-yellow-600">+{achievement.xp_reward}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium capitalize">
                          {achievement.criteria_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-gray-500">Value: {achievement.criteria_value}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{achievement.unlocked_count || 0} users</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={achievement.active}
                        onChange={() => handleToggleActive(achievement)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEdit(achievement)}>
                            <Edit className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Clone">
                          <IconButton size="small" onClick={() => handleClone(achievement)}>
                            <Copy className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete(achievement)}
                            color="error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>
    </div>
  );
}