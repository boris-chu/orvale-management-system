'use client';

import { useState } from 'react';
import { Box, TextField, Grid, Paper } from '@mui/material';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ color, onChange }: ColorPickerProps) => {
  const [localColor, setLocalColor] = useState(color);

  const presetColors = [
    '#1976d2', // Blue
    '#388e3c', // Green  
    '#f57c00', // Orange
    '#d32f2f', // Red
    '#7b1fa2', // Purple
    '#0097a7', // Cyan
    '#5d4037', // Brown
    '#616161', // Grey
    '#e91e63', // Pink
    '#ff5722', // Deep Orange
    '#009688', // Teal
    '#3f51b5', // Indigo
    '#795548', // Brown
    '#607d8b', // Blue Grey
    '#ff9800', // Amber
    '#4caf50', // Light Green
    '#2196f3', // Light Blue
    '#9c27b0', // Purple
    '#f44336', // Red
    '#00bcd4', // Cyan
    '#8bc34a', // Light Green
    '#ffc107', // Yellow
    '#ff5722', // Deep Orange
    '#673ab7'  // Deep Purple
  ];

  const handleColorChange = (newColor: string) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    setLocalColor(newColor);
    
    // Only call onChange if it's a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange(newColor);
    }
  };

  return (
    <Box sx={{ width: 320, p: 2 }}>
      {/* Current Color Display */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            backgroundColor: localColor,
            borderRadius: 2,
            border: '2px solid #ccc',
            boxShadow: 1
          }}
        />
        <TextField
          label="Hex Color"
          value={localColor}
          onChange={handleInputChange}
          size="small"
          placeholder="#1976d2"
          inputProps={{ 
            pattern: '^#[0-9A-Fa-f]{6}$',
            maxLength: 7
          }}
        />
      </Box>

      {/* Preset Colors Grid */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 1, fontWeight: 'medium', fontSize: 14 }}>
          Preset Colors
        </Box>
        <Grid container spacing={1}>
          {presetColors.map((presetColor, index) => (
            <Grid item key={index}>
              <Paper
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: presetColor,
                  cursor: 'pointer',
                  border: localColor === presetColor ? '3px solid #333' : '1px solid #ccc',
                  borderRadius: 1,
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: 2
                  },
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleColorChange(presetColor)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* HTML5 Color Picker */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ mb: 1, fontWeight: 'medium', fontSize: 14 }}>
          Custom Color
        </Box>
        <input
          type="color"
          value={localColor}
          onChange={(e) => handleColorChange(e.target.value)}
          style={{
            width: '100%',
            height: 40,
            border: '1px solid #ccc',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        />
      </Box>
    </Box>
  );
};