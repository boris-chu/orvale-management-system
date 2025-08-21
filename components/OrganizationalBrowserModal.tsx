'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Use Material-UI for Dialog and Select to avoid focus management conflicts
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Search, ArrowRight, Check, X, Building2 } from 'lucide-react';

interface OrganizationalPath {
  id: string;
  office: string;
  bureau: string;
  division: string;
  section: string;
  complete: boolean;
  confidence: 'high' | 'medium' | 'low';
  officeValue: string;
  bureauValue: string;
  divisionValue: string;
  sectionValue: string | null;
}

interface OrganizationalBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pathData: OrganizationalPath) => void;
  organizationalData: any;
}

export default function OrganizationalBrowserModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  organizationalData 
}: OrganizationalBrowserModalProps) {
  const [allPaths, setAllPaths] = useState<OrganizationalPath[]>([]);
  const [filteredPaths, setFilteredPaths] = useState<OrganizationalPath[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'office' | 'alphabetical' | 'complete' | 'confidence'>('office');
  const [loading, setLoading] = useState(true);

  // Generate all organizational paths when modal opens
  useEffect(() => {
    if (isOpen && organizationalData) {
      generateOrganizationalPaths();
    }
  }, [isOpen, organizationalData]);

  // Filter and sort paths when search or sort changes
  useEffect(() => {
    applyFiltersAndSort();
  }, [searchTerm, sortBy, allPaths]);

  const generateOrganizationalPaths = () => {
    const paths: OrganizationalPath[] = [];
    
    if (!organizationalData) {
      setLoading(false);
      return;
    }

    // Create realistic organizational path combinations based on known DPSS structure
    const realPaths = createRealOrganizationalPaths();
    
    realPaths.forEach((pathConfig, index) => {
      paths.push({
        id: `org_path_${index}`,
        office: pathConfig.office || '[missing]',
        bureau: pathConfig.bureau || '[missing]',
        division: pathConfig.division || '[missing]',
        section: pathConfig.section || '[no section]',
        complete: !!(pathConfig.office && pathConfig.bureau && pathConfig.division),
        confidence: 'high', // All paths from structured data have high confidence
        officeValue: pathConfig.office,
        bureauValue: pathConfig.bureau,
        divisionValue: pathConfig.division,
        sectionValue: pathConfig.section
      });
    });
    
    setAllPaths(paths);
    setLoading(false);
  };

  const createRealOrganizationalPaths = () => {
    // Create comprehensive organizational paths using DPSS structure
    const realPaths = [];
    
    // Define known organizational relationships based on DPSS structure
    const bureauToDivisions: {[key: string]: string[]} = {
      'Bureau of Administrative Services': [
        'Financial Management Division',
        'General Services Division', 
        'Contract Administration and Monitoring Division',
        'Fiscal Operations Division'
      ],
      'Bureau of Technology Services': [
        'Information Technology Services Division',
        'Bureau of Technology Services Administration'
      ],
      'Bureau of Human Resources': [
        'Human Capital Management Branch',
        'Workforce Safety Leave & Disability Comp Branch'
      ],
      'Bureau of Program & Policy': [
        'CalWORKs & GAIN Program Division',
        'General Relief & CalFresh Program Division',
        'Medi-Cal / IHSS Program Division',
        'Program Compliance Division'
      ],
      'Bureau of Customer Service Centers': [
        'Customer Service Center Division I',
        'Customer Service Center Division II',
        'Customer Service Center Division III',
        'IHSS Operations Division'
      ],
      'Bureau of Workforce Services North': [
        'North Division I',
        'North Division II', 
        'North Division III'
      ],
      'Bureau of Workforce Services South': [
        'South Division I',
        'South Division II',
        'South Division III'
      ],
      'Bureau of Special Operations': [
        'Program Compliance Division'
      ],
      'DPSS Administration': [
        'Financial Management Division'
      ]
    };

    // Define division to sections relationships
    const divisionToSections: {[key: string]: string[]} = {
      'Financial Management Division': ['Budget Planning & Control', 'Budget Policy'],
      'General Services Division': ['Property Management'],
      'Contract Administration and Monitoring Division': ['Contracts I', 'Contracts II', 'Contracts III', 'Contracts IV'],
      'Fiscal Operations Division': ['Budget Planning & Control'],
      'Information Technology Services Division': ['Field Technical Support', 'Security & Storage Management'],
      'Bureau of Technology Services Administration': ['CalSAWs Project'],
      'Human Capital Management Branch': ['DPSS Academy'],
      'Workforce Safety Leave & Disability Comp Branch': ['Leave Management and Disability Compliance'],
      'CalWORKs & GAIN Program Division': ['CalWORKs Program Section', 'GAIN Program Policy Section I', 'GAIN Program Policy Section II', 'GAIN Program Policy Section III'],
      'General Relief & CalFresh Program Division': ['CalFresh Program Section I', 'CalFresh Program Section II', 'General Relief & CAPI Section'],
      'Medi-Cal / IHSS Program Division': ['Medi-Cal Program Section'],
      'Program Compliance Division': [],
      'Customer Service Center Division I': ['Customer Service Center I - El Monte'],
      'Customer Service Center Division II': ['Customer Service Center II - La Cienega'],
      'Customer Service Center Division III': ['Customer Service Center IV', 'Customer Service Center V', 'Customer Service Center VI', 'Customer Service Center VII', 'Customer Service Center VIII'],
      'IHSS Operations Division': ['IHSS Call Center Main - Industry'],
      'North Division I': ['Norwalk'],
      'North Division II': ['Norwalk'],
      'North Division III': ['Norwalk'],
      'South Division I': ['Norwalk'],
      'South Division II': ['Norwalk'],
      'South Division III': ['Norwalk']
    };

    // Define office assignments for different organizational units
    const bureauToOffices: {[key: string]: string[]} = {
      'Bureau of Administrative Services': ['Crossroads Main', 'Fiscal Operations Division', 'Fiscal Management Division'],
      'Bureau of Technology Services': ['Crossroads Main'],
      'Bureau of Human Resources': ['Bureau of Human Resources'],
      'Bureau of Program & Policy': ['Crossroads Main'],
      'Bureau of Customer Service Centers': ['Crossroads East', 'Crossroads West', 'Crossroads Main', 'IHSS Crossroads'],
      'Bureau of Workforce Services North': ['Crossroads East'],
      'Bureau of Workforce Services South': ['Crossroads West'],
      'Bureau of Special Operations': ['Crossroads Main'],
      'DPSS Administration': ['Crossroads Main']
    };

    // Generate all valid combinations
    Object.keys(bureauToDivisions).forEach(bureau => {
      const divisions = bureauToDivisions[bureau];
      const offices = bureauToOffices[bureau] || ['Crossroads Main'];
      
      divisions.forEach(division => {
        const sections = divisionToSections[division] || [];
        
        // If division has sections, create paths for each section
        if (sections.length > 0) {
          sections.forEach(section => {
            offices.forEach(office => {
              realPaths.push({
                office: office,
                bureau: bureau,
                division: division,
                section: section
              });
            });
          });
        } else {
          // If no sections defined, create path with division only
          offices.forEach(office => {
            realPaths.push({
              office: office,
              bureau: bureau,
              division: division,
              section: null
            });
          });
        }
      });
    });
    
    return realPaths;
  };

  const applyFiltersAndSort = () => {
    let filtered = allPaths.filter(path => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return path.office.toLowerCase().includes(searchLower) ||
             path.bureau.toLowerCase().includes(searchLower) ||
             path.division.toLowerCase().includes(searchLower) ||
             path.section.toLowerCase().includes(searchLower);
    });

    // Sort the filtered paths
    switch (sortBy) {
      case 'office':
        filtered.sort((a, b) => {
          const officeCompare = a.office.localeCompare(b.office);
          if (officeCompare !== 0) return officeCompare;
          return a.bureau.localeCompare(b.bureau);
        });
        break;
      case 'alphabetical':
        filtered.sort((a, b) => {
          return `${a.office} ${a.bureau} ${a.division} ${a.section}`.localeCompare(
            `${b.office} ${b.bureau} ${b.division} ${b.section}`
          );
        });
        break;
      case 'complete':
        filtered.sort((a, b) => {
          if (a.complete && !b.complete) return -1;
          if (!a.complete && b.complete) return 1;
          return a.office.localeCompare(b.office);
        });
        break;
      case 'confidence':
        filtered.sort((a, b) => {
          const confidenceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
          const confidenceCompare = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
          if (confidenceCompare !== 0) return confidenceCompare;
          return a.office.localeCompare(b.office);
        });
        break;
    }

    setFilteredPaths(filtered);
  };

  const shouldHighlight = (text: string) => {
    if (!searchTerm || text === '[missing]' || text === '[no section]') return false;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const handleSelect = (path: OrganizationalPath) => {
    // Allow selection of paths with at least 3 levels (Office → Bureau → Division)
    const hasMinimumLevels = path.officeValue && path.bureauValue && path.divisionValue;
    
    if (!hasMinimumLevels) {
      alert('Please select a path with at least Office, Bureau, and Division.');
      return;
    }

    onSelect(path);
    onClose();
  };

  const renderGroupedPaths = () => {
    let currentOffice = '';
    const elements: React.JSX.Element[] = [];
    
    filteredPaths.forEach((path, index) => {
      // Add office header if changed
      if (path.office !== currentOffice) {
        currentOffice = path.office;
        const officeCount = filteredPaths.filter(p => p.office === currentOffice).length;
        elements.push(
          <div key={`header-${currentOffice}`} className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 border-b flex justify-between">
            <span>{currentOffice}</span>
            <span className="text-gray-500">{officeCount} paths</span>
          </div>
        );
      }
      
      elements.push(renderSinglePath(path, index));
    });
    
    return elements;
  };

  const renderSinglePath = (path: OrganizationalPath, index: number) => {
    const hasMinimumLevels = path.officeValue && path.bureauValue && path.divisionValue;
    
    return (
      <div key={path.id} className="border-b border-gray-100 hover:bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 text-sm">
            <span className={`${path.office === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.office) ? 'bg-yellow-200' : ''}`}>
              {path.office}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.bureau === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.bureau) ? 'bg-yellow-200' : ''}`}>
              {path.bureau}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.division === '[missing]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.division) ? 'bg-yellow-200' : ''}`}>
              {path.division}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className={`${path.section === '[missing]' || path.section === '[no section]' ? 'text-gray-400 italic' : ''} ${shouldHighlight(path.section) ? 'bg-yellow-200' : ''}`}>
              {path.section}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={path.complete ? 'default' : 'secondary'}>
              {path.complete ? 'Complete' : 'Incomplete'}
            </Badge>
            <Badge variant="outline" className={`text-xs ${
              path.confidence === 'high' ? 'border-green-200 text-green-700' :
              path.confidence === 'medium' ? 'border-yellow-200 text-yellow-700' :
              'border-red-200 text-red-700'
            }`}>
              {path.confidence}
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
        <Building2 className="h-5 w-5" />
        Browse Organizational Paths
      </DialogTitle>
      <DialogContent>
        
        <div className="space-y-4">
          {/* Search and Sort Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search offices, bureaus, divisions, sections..."
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
                <MenuItem value="office">Group by Office</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
                <MenuItem value="complete">Complete First</MenuItem>
                <MenuItem value="confidence">By Confidence</MenuItem>
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
              <div className="p-8 text-center text-gray-500">Loading organizational data...</div>
            ) : filteredPaths.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No organizational paths found matching your search.</div>
            ) : sortBy === 'office' ? (
              renderGroupedPaths()
            ) : (
              filteredPaths.map((path, index) => renderSinglePath(path, index))
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Select a path with at least Office, Bureau, and Division to populate the ticket form
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