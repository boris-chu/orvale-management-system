'use client';

import React from 'react';

export default function TestSelectRedirect() {
  React.useEffect(() => {
    // Redirect to home with a message about the test file location
    window.location.href = '/?message=Select component test moved to project-ticket-development/tests/select-component-test.tsx';
  }, []);

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Test Moved</h1>
      <p className="text-gray-600 mb-4">
        The select component test has been moved to:
      </p>
      <code className="bg-gray-100 p-2 rounded">
        project-ticket-development/tests/select-component-test.tsx
      </code>
      <p className="text-sm text-gray-500 mt-4">
        Redirecting to home page...
      </p>
    </div>
  );
}