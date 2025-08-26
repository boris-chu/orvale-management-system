'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Dynamically import the widget to avoid SSR issues
const PublicChatWidget = dynamic(
  () => import('./PublicChatWidget').then(mod => mod.PublicChatWidget),
  { ssr: false }
);

interface PublicChatProviderProps {
  children: React.ReactNode;
}

export default function PublicChatProvider({ children }: PublicChatProviderProps) {
  const pathname = usePathname();
  const [enabledPages, setEnabledPages] = useState<string[]>([]);
  const [disabledPages, setDisabledPages] = useState<string[]>([]);
  const [widgetEnabled, setWidgetEnabled] = useState(false);
  
  useEffect(() => {
    // Load page visibility settings from the API
    loadPageSettings();
  }, []);

  const loadPageSettings = async () => {
    try {
      const response = await fetch('/api/public-portal/widget-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.enabled) {
          setWidgetEnabled(true);
          if (data.enabled_pages) {
            setEnabledPages(JSON.parse(data.enabled_pages));
          }
          if (data.disabled_pages) {
            setDisabledPages(JSON.parse(data.disabled_pages));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load public chat settings:', error);
    }
  };

  // Don't render on admin or internal pages
  const isInternalPage = pathname.startsWith('/admin') || 
                        pathname.startsWith('/developer') || 
                        pathname.startsWith('/tickets') ||
                        pathname.startsWith('/helpdesk') ||
                        pathname.startsWith('/chat');

  return (
    <>
      {children}
      {widgetEnabled && !isInternalPage && (
        <PublicChatWidget 
          enabledPages={enabledPages}
          disabledPages={disabledPages}
        />
      )}
    </>
  );
}