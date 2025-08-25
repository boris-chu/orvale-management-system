/**
 * System Initialization API
 * Initializes background services for the Orvale Management System
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeAppServices } from '@/lib/app-startup';

// Track initialization status
let isInitialized = false;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Only allow initialization from localhost in development
    // or from server-side calls in production
    const userAgent = request.headers.get('user-agent') || '';
    const isServerSide = userAgent.includes('Next.js') || !userAgent;
    
    if (process.env.NODE_ENV === 'production' && !isServerSide) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (isInitialized) {
      return NextResponse.json({ 
        message: 'System already initialized',
        status: 'already_running' 
      });
    }

    // Initialize app services
    initializeAppServices();
    isInitialized = true;

    return NextResponse.json({ 
      message: 'System services initialized successfully',
      status: 'initialized',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System initialization failed:', error);
    return NextResponse.json(
      { 
        error: 'System initialization failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Return system initialization status
  return NextResponse.json({
    initialized: isInitialized,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}