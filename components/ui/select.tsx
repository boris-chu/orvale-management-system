/**
 * @deprecated This component has been DEPRECATED due to React 19 focus management conflicts.
 * Use Material-UI Select instead:
 * 
 * import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
 * 
 * For more information, see CLAUDE.md under "UI Library Mixing - CRITICAL LESSONS LEARNED"
 */

import React from 'react';

console.warn('⚠️ DEPRECATED: shadcn:ui Select is deprecated. Use Material-UI Select instead.');

// Stub components that show deprecation warnings - DO NOT USE IN NEW CODE
export const Select = ({ children, ...props }: any) => {
  return (
    <div style={{ 
      background: '#fee', 
      border: '2px solid #f00', 
      padding: '10px',
      borderRadius: '4px',
      margin: '4px 0'
    }}>
      <strong>⚠️ DEPRECATED:</strong> Use Material-UI Select instead
      {children}
    </div>
  );
};

export const SelectContent = ({ children, ...props }: any) => {
  return <div data-deprecated="SelectContent">{children}</div>;
};

export const SelectItem = ({ children, ...props }: any) => {
  return <div data-deprecated="SelectItem">{children}</div>;
};

export const SelectTrigger = ({ children, ...props }: any) => {
  return <button data-deprecated="SelectTrigger">{children}</button>;
};

export const SelectValue = ({ children, ...props }: any) => {
  return <span data-deprecated="SelectValue">{children || 'Select...'}</span>;
};