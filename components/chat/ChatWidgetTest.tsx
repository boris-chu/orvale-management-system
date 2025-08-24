"use client"

import React from 'react'
import { MessageCircle } from 'lucide-react'

// Simple test widget to verify basic functionality
export function ChatWidgetTest() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        className="w-16 h-16 rounded-full bg-blue-600 text-white shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        onClick={() => console.log('Chat widget test clicked')}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  )
}