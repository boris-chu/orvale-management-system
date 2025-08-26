'use client';

import { useState } from 'react';
import {
  Box, TextField, Button, Typography, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert,
  FormHelperText
} from '@mui/material';
import { Send, Person, Email, Phone, Business } from '@mui/icons-material';

interface PreChatFormProps {
  settings: {
    require_name: boolean;
    require_email: boolean;
    require_phone: boolean;
    require_department: boolean;
    custom_fields: any[];
    welcome_message: string;
  };
  onSubmit: (data: any) => void;
  loading: boolean;
}

export const PreChatForm = ({ settings, onSubmit, loading }: PreChatFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    message: '',
    customFields: {}
  });
  const [errors, setErrors] = useState<any>({});

  const departments = [
    'General Support',
    'Technical Support',
    'Billing',
    'Sales',
    'Human Resources',
    'Other'
  ];

  const validateForm = () => {
    const newErrors: any = {};

    if (settings.require_name && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (settings.require_email) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (settings.require_phone && !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (settings.require_department && !formData.department) {
      newErrors.department = 'Please select a department';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please describe how we can help you';
    }

    // Validate custom fields
    settings.custom_fields?.forEach((field: any) => {
      if (field.required && !formData.customFields[field.id]) {
        newErrors[`custom_${field.id}`] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldId]: value }
    }));
    // Clear error
    if (errors[`custom_${fieldId}`]) {
      setErrors((prev: any) => ({ ...prev, [`custom_${fieldId}`]: '' }));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Start a Conversation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {settings.welcome_message}
      </Typography>

      {/* Name Field */}
      {(settings.require_name || true) && (
        <TextField
          fullWidth
          label="Your Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          required={settings.require_name}
          InputProps={{
            startAdornment: <Person sx={{ color: 'action.active', mr: 1 }} />
          }}
          sx={{ mb: 2 }}
        />
      )}

      {/* Email Field */}
      {(settings.require_email || true) && (
        <TextField
          fullWidth
          type="email"
          label="Email Address"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
          required={settings.require_email}
          InputProps={{
            startAdornment: <Email sx={{ color: 'action.active', mr: 1 }} />
          }}
          sx={{ mb: 2 }}
        />
      )}

      {/* Phone Field */}
      {settings.require_phone && (
        <TextField
          fullWidth
          type="tel"
          label="Phone Number"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={!!errors.phone}
          helperText={errors.phone}
          required
          InputProps={{
            startAdornment: <Phone sx={{ color: 'action.active', mr: 1 }} />
          }}
          sx={{ mb: 2 }}
        />
      )}

      {/* Department Field */}
      {settings.require_department && (
        <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.department}>
          <InputLabel>Department</InputLabel>
          <Select
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            label="Department"
            startAdornment={<Business sx={{ color: 'action.active', mr: 1, ml: 1.5 }} />}
          >
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </Select>
          {errors.department && (
            <FormHelperText>{errors.department}</FormHelperText>
          )}
        </FormControl>
      )}

      {/* Custom Fields */}
      {settings.custom_fields?.map((field: any) => {
        if (field.type === 'text') {
          return (
            <TextField
              key={field.id}
              fullWidth
              label={field.label}
              value={formData.customFields[field.id] || ''}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              error={!!errors[`custom_${field.id}`]}
              helperText={errors[`custom_${field.id}`]}
              required={field.required}
              sx={{ mb: 2 }}
            />
          );
        } else if (field.type === 'select') {
          return (
            <FormControl 
              key={field.id} 
              fullWidth 
              sx={{ mb: 2 }} 
              error={!!errors[`custom_${field.id}`]}
            >
              <InputLabel>{field.label}</InputLabel>
              <Select
                value={formData.customFields[field.id] || ''}
                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                label={field.label}
              >
                {field.options?.map((option: string) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              {errors[`custom_${field.id}`] && (
                <FormHelperText>{errors[`custom_${field.id}`]}</FormHelperText>
              )}
            </FormControl>
          );
        }
        return null;
      })}

      {/* Message Field */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="How can we help you?"
        value={formData.message}
        onChange={(e) => handleChange('message', e.target.value)}
        error={!!errors.message}
        helperText={errors.message}
        required
        sx={{ mb: 3 }}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <Send />}
      >
        {loading ? 'Starting Chat...' : 'Start Chat'}
      </Button>
    </Box>
  );
};