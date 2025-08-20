/**
 * Time formatting utilities for consistent 24-hour time display
 */

export interface TimeFormatOptions {
  includeSeconds?: boolean;
  includeDate?: boolean;
  dateFormat?: 'short' | 'long' | 'numeric';
  timeZone?: string;
}

/**
 * Format date/time using 12-hour format (regular time)
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted string in 12-hour format
 */
export function formatRegularTime(date: string | Date, options: TimeFormatOptions = {}): string {
  const {
    includeSeconds = true,
    includeDate = true,
    dateFormat = 'numeric',
    timeZone = undefined
  } = options;

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour12: true, // 12-hour format
    timeZone
  };

  // Add date formatting if requested
  if (includeDate) {
    if (dateFormat === 'short') {
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
    } else if (dateFormat === 'long') {
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
    } else {
      formatOptions.month = 'numeric';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
    }
  }

  // Add time formatting
  formatOptions.hour = 'numeric';
  formatOptions.minute = '2-digit';
  
  if (includeSeconds) {
    formatOptions.second = '2-digit';
  }

  return dateObj.toLocaleString('en-US', formatOptions);
}

/**
 * Format date/time using 24-hour format
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted string in 24-hour format
 */
export function format24Hour(date: string | Date, options: TimeFormatOptions = {}): string {
  const {
    includeSeconds = true,
    includeDate = true,
    dateFormat = 'numeric',
    timeZone = undefined
  } = options;

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour12: false,
    timeZone
  };

  // Add date formatting if requested
  if (includeDate) {
    if (dateFormat === 'short') {
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
    } else if (dateFormat === 'long') {
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
    } else {
      formatOptions.month = 'numeric';
      formatOptions.day = 'numeric';
      formatOptions.year = 'numeric';
    }
  }

  // Add time formatting
  formatOptions.hour = '2-digit';
  formatOptions.minute = '2-digit';
  
  if (includeSeconds) {
    formatOptions.second = '2-digit';
  }

  return dateObj.toLocaleString('en-US', formatOptions);
}

/**
 * Format just the time portion in 24-hour format
 * @param date - Date string or Date object
 * @param includeSeconds - Whether to include seconds (default: true)
 * @returns Time string in HH:MM:SS format
 */
export function formatTime24Hour(date: string | Date, includeSeconds: boolean = true): string {
  return format24Hour(date, {
    includeDate: false,
    includeSeconds
  });
}

/**
 * Format just the date portion
 * @param date - Date string or Date object
 * @param format - Date format style
 * @returns Date string
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'numeric' = 'numeric'): string {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {};
  
  if (format === 'short') {
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
    formatOptions.year = 'numeric';
  } else if (format === 'long') {
    formatOptions.month = 'long';
    formatOptions.day = 'numeric';
    formatOptions.year = 'numeric';
  } else {
    formatOptions.month = 'numeric';
    formatOptions.day = 'numeric';
    formatOptions.year = 'numeric';
  }

  return dateObj.toLocaleDateString('en-US', formatOptions);
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
}

/**
 * Format duration in seconds to human readable format
 * @param seconds - Duration in seconds
 * @returns Human readable duration (e.g., "2h 30m 15s")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    const parts = [`${hours}h`];
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
    return parts.join(' ');
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  const parts = [`${days}d`];
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  
  return parts.join(' ');
}

/**
 * Get the current timestamp in 24-hour format
 * @returns Current timestamp string
 */
export function getCurrentTimestamp(): string {
  return format24Hour(new Date());
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

/**
 * Check if a date is this week
 * @param date - Date to check
 * @returns True if date is this week
 */
export function isThisWeek(date: string | Date): boolean {
  const dateObj = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  
  return dateObj >= startOfWeek && dateObj <= endOfWeek;
}