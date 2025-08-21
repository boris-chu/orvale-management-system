'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Use Material-UI for Dialog and Select to avoid focus management conflicts
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Search, ArrowRight, Check, X } from 'lucide-react';

interface CategoryPath {
  id: string;
  category: string;
  requestType: string;
  subcategory: string;
  subSubcategory: string;
  implementation: string;
  complete: boolean;
  categoryKey: string;
  requestTypeKey: string;
  subcategoryKey: string;
  subSubcategoryKey: string;
  implementationKey: string;
}

interface CategoryBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pathData: CategoryPath) => void;
  categoriesData: any;
}

export default function CategoryBrowserModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  categoriesData 
}: CategoryBrowserModalProps) {
  const [allPaths, setAllPaths] = useState<CategoryPath[]>([]);
  const [filteredPaths, setFilteredPaths] = useState<CategoryPath[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'category' | 'alphabetical' | 'complete' | 'incomplete'>('category');
  const [loading, setLoading] = useState(true);

  // Generate all category paths when modal opens
  useEffect(() => {
    if (isOpen && categoriesData) {
      generateAllPaths();
    }
  }, [isOpen, categoriesData]);

  // Filter and sort paths when search or sort changes
  useEffect(() => {
    applyFiltersAndSort();
  }, [searchTerm, sortBy, allPaths]);

  const generateAllPaths = () => {
    const paths: CategoryPath[] = [];
    
    if (!categoriesData?.categories) {
      setLoading(false);
      return;
    }

    // Generate all possible paths from the categories data
    Object.entries(categoriesData.categories).forEach(([categoryKey, categoryName]: [string, any]) => {
      const categoryRequestTypes = categoriesData.requestTypes?.[categoryKey] || [];
      
      if (categoryRequestTypes.length === 0) {
        // Category with no request types
        paths.push({
          id: `${categoryKey}`,
          category: categoryName,
          requestType: '[missing]',
          subcategory: '[missing]',
          subSubcategory: '[missing]',
          implementation: '[missing]',
          complete: false,
          categoryKey,
          requestTypeKey: '',
          subcategoryKey: '',
          subSubcategoryKey: '',
          implementationKey: ''
        });
        return;
      }
      
      categoryRequestTypes.forEach((requestTypeObj: any) => {
        const requestTypeKey = requestTypeObj.value;
        const requestTypeName = requestTypeObj.text;
        
        // Get subcategories for this category and request type
        const categorySubcategories = categoriesData.subcategories?.[categoryKey] || {};
        const subcategoriesList = categorySubcategories[requestTypeKey] || [];
        
        if (subcategoriesList.length === 0) {
          // Request type with no subcategories
          paths.push({
            id: `${categoryKey}-${requestTypeKey}`,
            category: categoryName,
            requestType: requestTypeName,
            subcategory: '[missing]',
            subSubcategory: '[missing]',
            implementation: '[missing]',
            complete: false,
            categoryKey,
            requestTypeKey,
            subcategoryKey: '',
            subSubcategoryKey: '',
            implementationKey: ''
          });
          return;
        }
        
        subcategoriesList.forEach((subcategoryObj: any) => {
          const subcategoryKey = subcategoryObj.value;
          const subcategoryName = subcategoryObj.text;
          const subSubcategoriesList = categoriesData.subSubcategories?.[subcategoryKey] || [];
          
          if (subSubcategoriesList.length === 0) {
            // Subcategory with no sub-subcategories
            paths.push({
              id: `${categoryKey}-${requestTypeKey}-${subcategoryKey}`,
              category: categoryName,
              requestType: requestTypeName,
              subcategory: subcategoryName,
              subSubcategory: '[missing]',
              implementation: '[missing]',
              complete: false,
              categoryKey,
              requestTypeKey,
              subcategoryKey,
              subSubcategoryKey: '',
              implementationKey: ''
            });
            return;
          }
          
          subSubcategoriesList.forEach((subSubcategoryObj: any) => {
            const subSubcategoryKey = subSubcategoryObj.value;
            const subSubcategoryName = subSubcategoryObj.text;
            const implementationsList = categoriesData.implementationTypes?.[subSubcategoryKey] || [];
            
            if (implementationsList.length === 0) {
              // Sub-subcategory with no implementations
              paths.push({
                id: `${categoryKey}-${requestTypeKey}-${subcategoryKey}-${subSubcategoryKey}`,
                category: categoryName,
                requestType: requestTypeName,
                subcategory: subcategoryName,
                subSubcategory: subSubcategoryName,
                implementation: '[missing]',
                complete: false,
                categoryKey,
                requestTypeKey,
                subcategoryKey,
                subSubcategoryKey,
                implementationKey: ''
              });
              return;
            }
            
            implementationsList.forEach((implementationObj: any) => {
              const implementationKey = implementationObj.value;
              const implementationName = implementationObj.text;
              
              // Complete path
              paths.push({
                id: `${categoryKey}-${requestTypeKey}-${subcategoryKey}-${subSubcategoryKey}-${implementationKey}`,
                category: categoryName,
                requestType: requestTypeName,
                subcategory: subcategoryName,
                subSubcategory: subSubcategoryName,
                implementation: implementationName,
                complete: true,
                categoryKey,
                requestTypeKey,
                subcategoryKey,
                subSubcategoryKey,
                implementationKey
              });
            });
          });
        });
      });
    });
    
    setAllPaths(paths);
    setLoading(false);
  };

  const applyFiltersAndSort = () => {
    let filtered = allPaths.filter(path => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return path.category.toLowerCase().includes(searchLower) ||
             path.requestType.toLowerCase().includes(searchLower) ||
             path.subcategory.toLowerCase().includes(searchLower) ||
             path.subSubcategory.toLowerCase().includes(searchLower) ||
             path.implementation.toLowerCase().includes(searchLower);
    });

    // Sort the filtered paths
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => {
          const pathA = `${a.category} → ${a.requestType} → ${a.subcategory} → ${a.subSubcategory} → ${a.implementation}`;
          const pathB = `${b.category} → ${b.requestType} → ${b.subcategory} → ${b.subSubcategory} → ${b.implementation}`;
          return pathA.localeCompare(pathB);
        });
        break;
      case 'complete':
        filtered.sort((a, b) => {
          if (a.complete && !b.complete) return -1;
          if (!a.complete && b.complete) return 1;
          return a.category.localeCompare(b.category);
        });
        break;
      case 'incomplete':
        filtered.sort((a, b) => {
          if (!a.complete && b.complete) return -1;
          if (a.complete && !b.complete) return 1;
          return a.category.localeCompare(b.category);
        });
        break;
      case 'category':
      default:
        filtered.sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          if (a.requestType !== b.requestType) {
            return a.requestType.localeCompare(b.requestType);
          }
          return a.subcategory.localeCompare(b.subcategory);
        });
        break;
    }

    setFilteredPaths(filtered);
  };

  const shouldHighlight = (text: string) => {
    if (!searchTerm || text === '[missing]') return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const handleSelect = (path: CategoryPath) => {
    // Allow selection of paths with at least category level
    const hasCategory = path.categoryKey;
    
    if (!hasCategory) {
      alert('Please select a path with at least a Category');
      return;
    }

    onSelect(path);
    onClose();
  };

  const renderGroupedPaths = () => {
    let currentCategory = '';
    const elements: React.JSX.Element[] = [];
    
    filteredPaths.forEach((path, index) => {
      // Add category header if changed
      if (path.category !== currentCategory) {
        currentCategory = path.category;
        elements.push(
          <div key={`header-${currentCategory}`} className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 border-b">
            {currentCategory}
          </div>
        );
      }
      
      elements.push(renderSinglePath(path, index));
    });
    
    return elements;
  };

  const renderSinglePath = (path: CategoryPath, index: number) => {
    const hasMinimumLevels = path.categoryKey; // Only require category level
    
    return (
      <div key={path.id} className="border-b border-gray-100 hover:bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 text-sm">
            <span className={`${path.category === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.category) ? 'bg-yellow-200' : ''}`}>
              {path.category}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.requestType === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.requestType) ? 'bg-yellow-200' : ''}`}>
              {path.requestType}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.subcategory === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.subcategory) ? 'bg-yellow-200' : ''}`}>
              {path.subcategory}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.subSubcategory === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.subSubcategory) ? 'bg-yellow-200' : ''}`}>
              {path.subSubcategory}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.implementation === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.implementation) ? 'bg-yellow-200' : ''}`}>
              {path.implementation}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={path.complete ? 'default' : 'secondary'}>
              {path.complete ? 'Complete' : 'Incomplete'}
            </Badge>
            {hasMinimumLevels && (
              <Button 
                size="sm" 
                onClick={() => handleSelect(path)}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Select
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh', overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Search className="h-5 w-5" />
        Browse Category Paths
      </DialogTitle>
      <DialogContent>
        
        <div className="space-y-4">
          {/* Search and Sort Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search categories, request types, subcategories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="category">Group by Category</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
                <MenuItem value="complete">Complete First</MenuItem>
                <MenuItem value="incomplete">Incomplete First</MenuItem>
              </Select>
            </FormControl>
          </div>
          
          {/* Path Count */}
          <div className="text-sm text-gray-600">
            {filteredPaths.length === allPaths.length ? 
              `${allPaths.length} paths` : 
              `${filteredPaths.length} of ${allPaths.length} paths`
            }
          </div>
          
          {/* Paths List */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading categories...</div>
            ) : filteredPaths.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No category paths found matching your search.</div>
            ) : sortBy === 'category' ? (
              renderGroupedPaths()
            ) : (
              filteredPaths.map((path, index) => renderSinglePath(path, index))
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Select any category path to populate available fields in the ticket form
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}