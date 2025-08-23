import { format, formatDistanceToNow, parseISO } from 'date-fns'

/**
 * Format a date string to local time in user's timezone
 * @param dateString - ISO date string from database (UTC)
 * @param formatString - Optional format string (defaults to time only)
 * @returns Formatted date string in local timezone
 */
export function formatLocalTime(dateString: string, formatString: string = 'h:mm a'): string {
  try {
    // SQLite returns timestamps without timezone, treat as UTC
    const date = dateString.includes('Z') || dateString.includes('+') 
      ? parseISO(dateString)
      : parseISO(dateString + 'Z') // Add Z to indicate UTC
    return format(date, formatString)
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Format a date string to local date and time
 * @param dateString - ISO date string from database (UTC)
 * @returns Formatted date and time string in local timezone
 */
export function formatLocalDateTime(dateString: string): string {
  return formatLocalTime(dateString, 'MMM d, yyyy h:mm a')
}

/**
 * Get relative time (e.g., "2 minutes ago")
 * @param dateString - ISO date string from database (UTC)
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string): string {
  try {
    // SQLite returns timestamps without timezone, treat as UTC
    const date = dateString.includes('Z') || dateString.includes('+') 
      ? parseISO(dateString)
      : parseISO(dateString + 'Z') // Add Z to indicate UTC
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return dateString
  }
}

/**
 * Check if a date is today in user's local timezone
 * @param dateString - ISO date string from database (UTC)
 * @returns True if the date is today
 */
export function isToday(dateString: string): boolean {
  try {
    // SQLite returns timestamps without timezone, treat as UTC
    const date = dateString.includes('Z') || dateString.includes('+') 
      ? parseISO(dateString)
      : parseISO(dateString + 'Z') // Add Z to indicate UTC
    const today = new Date()
    return date.toDateString() === today.toDateString()
  } catch (error) {
    return false
  }
}

/**
 * Format message timestamp based on when it was sent
 * - Today: Show time only (e.g., "2:30 PM")
 * - This week: Show day and time (e.g., "Mon 2:30 PM")
 * - Older: Show full date (e.g., "Jan 15, 2024")
 */
export function formatMessageTime(dateString: string): string {
  try {
    // SQLite returns timestamps without timezone, treat as UTC
    const date = dateString.includes('Z') || dateString.includes('+') 
      ? parseISO(dateString)
      : parseISO(dateString + 'Z') // Add Z to indicate UTC
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      // Today - show time only
      return format(date, 'h:mm a')
    } else if (diffInDays < 7) {
      // This week - show day and time
      return format(date, 'EEE h:mm a')
    } else if (date.getFullYear() === now.getFullYear()) {
      // This year - show month and day
      return format(date, 'MMM d')
    } else {
      // Older - show full date
      return format(date, 'MMM d, yyyy')
    }
  } catch (error) {
    console.error('Error formatting message time:', error)
    return dateString
  }
}