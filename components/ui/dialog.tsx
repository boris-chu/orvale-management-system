/**
 * @deprecated This component has been DEPRECATED due to React 19 focus management conflicts.
 * Use Material-UI Dialog instead:
 * 
 * import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
 * 
 * For more information, see CLAUDE.md under "UI Library Mixing - CRITICAL LESSONS LEARNED"
 */

import React from 'react';

console.warn('⚠️ DEPRECATED: shadcn:ui Dialog is deprecated. Use Material-UI Dialog instead.');

// Stub components that show deprecation warnings - DO NOT USE IN NEW CODE
export const Dialog = ({ children, ...props }: any) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      background: '#fee', 
      border: '2px solid #f00', 
      padding: '20px',
      borderRadius: '8px',
      zIndex: 9999
    }}>
      <h3>⚠️ DEPRECATED COMPONENT</h3>
      <p>shadcn:ui Dialog has been removed.</p>
      <p><strong>Use Material-UI Dialog instead:</strong></p>
      <code>import {`{ Dialog }`} from '@mui/material';</code>
    </div>
  );
};

export const DialogContent = ({ children, ...props }: any) => {
  return <div data-deprecated="DialogContent">{children}</div>;
};

export const DialogHeader = ({ children, ...props }: any) => {
  return <div data-deprecated="DialogHeader">{children}</div>;
};

export const DialogTitle = ({ children, ...props }: any) => {
  return <h2 data-deprecated="DialogTitle">{children}</h2>;
};

export const DialogDescription = ({ children, ...props }: any) => {
  return <p data-deprecated="DialogDescription">{children}</p>;
};

export const DialogFooter = ({ children, ...props }: any) => {
  return <div data-deprecated="DialogFooter">{children}</div>;
};

export const DialogTrigger = ({ children, ...props }: any) => {
  return <div data-deprecated="DialogTrigger">{children}</div>;
};