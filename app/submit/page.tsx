'use client';

import { useEffect } from 'react';

export default function SubmitTicket() {
  useEffect(() => {
    // Redirect to the original public portal
    window.location.href = '/public-portal/';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to ticket submission form...</p>
      </div>
    </div>
  );
}