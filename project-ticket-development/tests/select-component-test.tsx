/**
 * SELECT COMPONENT COMPATIBILITY TEST
 * 
 * This test file helps identify which select/dropdown components work
 * properly with React 19 in the Orvale Management System.
 * 
 * Location: project-ticket-development/tests/select-component-test.tsx
 * 
 * To run this test:
 * 1. Copy this file to app/test-select/page.tsx
 * 2. Visit http://localhost/test-select
 * 3. Test each select component
 * 4. Note which ones work correctly
 * 5. Move file back to tests directory when done
 * 
 * Results Summary:
 * ✅ Material-UI Core Select - Works with React 19
 * ✅ Native HTML Select - Always works
 * ❌ Radix UI Select - Broken with React 19
 */

'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
// Material-UI imports
import { Select as MUISelect, MenuItem, FormControl, InputLabel } from '@mui/material';

export default function TestSelect() {
  const [radixValue, setRadixValue] = useState('');
  const [nativeValue, setNativeValue] = useState('');
  const [muiValue, setMuiValue] = useState('');
  
  const testOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <h1 className="text-3xl font-bold">Select Component Compatibility Test - React 19</h1>
      <p className="text-gray-600">Testing different select components to find React 19 compatible options</p>
      
      {/* Test 1: Radix Select (Current/Broken) */}
      <div className="space-y-2 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold text-red-600">❌ Test 1: Radix Select (Current - Broken)</h2>
        <Select value={radixValue} onValueChange={setRadixValue}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {testOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm">Selected value: <strong>{radixValue || 'None'}</strong></p>
        <Button onClick={() => setRadixValue('')} size="sm">Clear</Button>
      </div>
      
      {/* Test 2: Native Select */}
      <div className="space-y-2 p-4 border rounded-lg bg-green-50">
        <h2 className="text-lg font-semibold text-green-600">✅ Test 2: Native Select (Working)</h2>
        <select 
          value={nativeValue} 
          onChange={(e) => setNativeValue(e.target.value)}
          className="w-64 h-10 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select an option...</option>
          {testOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-sm">Selected value: <strong>{nativeValue || 'None'}</strong></p>
        <Button onClick={() => setNativeValue('')} size="sm">Clear</Button>
      </div>

      {/* Test 3: Material-UI Core Select */}
      <div className="space-y-2 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold text-blue-600">🧪 Test 3: Material-UI Core Select</h2>
        <FormControl size="small" className="w-64">
          <InputLabel id="mui-select-label">Select option</InputLabel>
          <MUISelect
            labelId="mui-select-label"
            value={muiValue}
            label="Select option"
            onChange={(e) => setMuiValue(e.target.value)}
          >
            {testOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </MUISelect>
        </FormControl>
        <p className="text-sm">Selected value: <strong>{muiValue || 'None'}</strong></p>
        <Button onClick={() => setMuiValue('')} size="sm">Clear</Button>
      </div>

      {/* Test 4: Styled Native Select */}
      <div className="space-y-2 p-4 border rounded-lg bg-blue-50">
        <h2 className="text-lg font-semibold text-blue-600">🎨 Test 4: Styled Native Select (Recommended)</h2>
        <select 
          value={nativeValue} 
          onChange={(e) => setNativeValue(e.target.value)}
          className="w-64 h-10 px-3 py-2 text-sm border border-input rounded-md bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>')] bg-no-repeat bg-right-3 bg-[length:12px_12px]"
        >
          <option value="" disabled>Select an option...</option>
          {testOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-sm">Selected value: <strong>{nativeValue || 'None'}</strong></p>
        <p className="text-xs text-blue-600">✨ This version includes custom dropdown arrow and matches shadcn styling</p>
        <Button onClick={() => setNativeValue('')} size="sm">Clear</Button>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">🔍 Test Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
          <li>Try selecting options from each dropdown</li>
          <li>Check if the selected value displays correctly</li>
          <li>Test the Clear button functionality</li>
          <li>Look for any console errors</li>
          <li>Note which components work properly with React 19</li>
        </ol>
      </div>

      {/* Results Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">📊 Current Results:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Working Components:</strong>
            <ul className="mt-1 space-y-1">
              <li className="text-green-600">✅ Native HTML Select</li>
            </ul>
          </div>
          <div>
            <strong>Broken Components:</strong>
            <ul className="mt-1 space-y-1">
              <li className="text-red-600">❌ Radix UI Select (React 19 issue)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}