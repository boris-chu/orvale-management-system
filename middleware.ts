/**
 * Next.js Middleware
 * Lightweight request processing middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add any request headers or processing here
  // Keep this lightweight - no heavy initialization
  
  return NextResponse.next();
}

export const config = {
  // Run middleware only where needed
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}