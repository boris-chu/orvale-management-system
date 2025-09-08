# Public Queue Chat-Ticket Integration Layout
*Updated: August 25, 2025*

## 🎯 **Three-Panel Layout Design**

### **Complete Interface Layout**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: Public Support Queue (Red Theme) + Work Mode + Settings     │
├─────────────────────────────────────────────┬───────────────────────┤
│                                             │ RIGHT SIDEBAR         │
│                                             │ ┌─────────────────────┤
│                                             │ │ STAFF SECTION       │
│         MIDDLE: STAFF TICKET MODAL          │ │ ───────────────     │
│                                             │ │ 🟢 John (Ready)     │
│         ┌─────────────────────────────────┐ │ │ 🔴 Jane (Helping)   │
│         │ 📋 Create Ticket from Chat     │ │ │ 🔵 Bob (Tickets)    │
│         │                                │ │ ├─────────────────────┤
│         │ Auto-filled from chat:         │ │ │ QUEUE SECTION       │
│         │ • Guest Name: John Smith       │ │ │ ───────────────     │
│         │ • Email: auto@detected.com     │ │ │ ⏳ Guest #123 (3m)  │
│         │ • Description: [Chat Summary]  │ │ │ 🔥 Guest #456 (15m) │
│         │ • Category: [From Pre-chat]    │ │ │ ❌ Guest #789 (20m) │
│         │                                │ │ │ 🔄 Guest #012 (2m)  │
│         │ [Additional Staff Fields...]   │ │ └─────────────────────┤
│         │                                │ │                       │
│         │ 💬 Link: Active Chat Session  │ │                       │
│         │ [Create Ticket] [Save Draft]   │ │                       │
│         └─────────────────────────────────┘ │                       │
├─────────────────────────────────────────────┤                       │
│ BOTTOM: FLOATABLE CHAT WINDOWS              │                       │
│                                             │                       │
│ 💬 Chat: Guest #123    💬 Chat: Guest #456  │                       │
│ [Minimized/Windowed chat sessions]         │                       │
└─────────────────────────────────────────────┴───────────────────────┘
```

## 🎫 **Chat-Integrated Ticket Creation System**

### **Ticket Type: "Chat-Submitted"**
```javascript
const ChatSubmittedTicket = {
  type: 'chat_submitted', // New ticket type
  prefix: 'CS-', // Chat Submitted tickets: CS-YYMMDD-XXX
  
  auto_filled_fields: {
    // From Chat Session
    guest_name: 'session.visitor_name',
    guest_email: 'session.visitor_email', 
    guest_phone: 'session.visitor_phone',
    department: 'session.visitor_department',
    
    // From Pre-chat Form
    initial_category: 'session.pre_chat_data.category',
    initial_description: 'session.pre_chat_data.description',
    priority: 'session.priority_level',
    
    // From Chat Conversation
    chat_transcript: 'formatted_message_history',
    chat_session_id: 'session.session_id',
    chat_duration: 'session.total_chat_duration',
    
    // Staff Information
    handled_by: 'current_staff_username',
    created_via: 'public_portal_chat',
    resolution_method: 'chat_session'
  },
  
  unique_features: [
    'Real-time chat link (if session still active)',
    'Complete chat transcript embedded',
    'Guest contact information pre-validated',
    'Pre-chat form answers included',
    'Session performance metrics attached'
  ]
};
```

### **Enhanced Staff Ticket Modal Integration**
```javascript
const ChatIntegratedTicketModal = {
  base_component: 'StaffTicketModal', // Reuse existing component
  
  enhancements: {
    // Auto-population from chat
    chat_data_integration: {
      guest_info: 'Auto-fill contact fields',
      conversation_summary: 'AI-generated description from chat transcript',
      category_detection: 'Smart categorization based on chat content',
      priority_inheritance: 'Inherit priority from chat session'
    },
    
    // Chat session linking
    active_session_display: {
      session_status: 'Show if chat is still active',
      real_time_messages: 'Continue receiving messages while creating ticket',
      session_controls: 'End chat, transfer, or keep alive',
      transcript_preview: 'Expandable chat history preview'
    },
    
    // Enhanced workflow
    creation_options: {
      'create_and_end_chat': 'Standard flow - create ticket and end chat',
      'create_and_continue_chat': 'Keep chat active for further assistance', 
      'save_draft_continue_chat': 'Save ticket draft, continue chatting',
      'escalate_with_ticket': 'Create ticket and escalate to specialist'
    }
  }
};
```

## 📊 **Database Schema Enhancements**

### **New Fields for Chat-Ticket Linking**
```sql
-- Add chat-specific fields to user_tickets table
ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS chat_session_id TEXT;
ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS chat_transcript TEXT;
ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS chat_duration_minutes INTEGER;
ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS pre_chat_form_data TEXT; -- JSON
ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS guest_contact_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS ticket_source TEXT DEFAULT 'portal'; -- 'portal', 'staff', 'chat_submitted'

-- Create chat-ticket relationship table
CREATE TABLE IF NOT EXISTS chat_ticket_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id TEXT NOT NULL,
    ticket_id TEXT NOT NULL,
    relationship_type TEXT CHECK(relationship_type IN ('created_from_chat', 'linked_to_chat', 'escalated_from_chat')) DEFAULT 'created_from_chat',
    created_by TEXT NOT NULL, -- Staff member who created the link
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_session_id) REFERENCES public_chat_sessions_enhanced(session_id),
    FOREIGN KEY (ticket_id) REFERENCES user_tickets(ticket_id),
    FOREIGN KEY (created_by) REFERENCES users(username),
    UNIQUE(chat_session_id, ticket_id) -- Prevent duplicate relationships
);

-- Enhanced ticket sequences for chat tickets
INSERT OR IGNORE INTO ticket_sequences (team_id, sequence_number) VALUES ('CHAT', 0);
```

### **Chat Transcript Storage Format**
```javascript
const ChatTranscriptFormat = {
  structure: {
    session_info: {
      session_id: 'session_123',
      guest_name: 'John Smith',
      guest_email: 'john@example.com',
      start_time: '2025-08-25T10:30:00Z',
      end_time: '2025-08-25T10:45:00Z',
      duration_minutes: 15,
      staff_handled_by: 'jane.doe',
      resolution_status: 'resolved_with_ticket'
    },
    
    pre_chat_form: {
      department: 'IT Support',
      category: 'Hardware Issue',
      description: 'Computer won\'t start',
      urgency: 'Medium',
      custom_fields: {...}
    },
    
    conversation: [
      {
        timestamp: '2025-08-25T10:30:15Z',
        sender_type: 'guest',
        sender_name: 'John Smith',
        message: 'Hi, my computer won\'t start this morning',
        message_type: 'text'
      },
      {
        timestamp: '2025-08-25T10:30:45Z', 
        sender_type: 'staff',
        sender_name: 'Jane Doe (Support)',
        message: 'Hi John, I\'d be happy to help with that. Can you tell me what happens when you press the power button?',
        message_type: 'text'
      }
      // ... more messages
    ],
    
    session_events: [
      {
        timestamp: '2025-08-25T10:30:00Z',
        event: 'chat_started',
        details: 'Guest connected to queue'
      },
      {
        timestamp: '2025-08-25T10:30:30Z',
        event: 'staff_assigned',
        details: 'Assigned to jane.doe'
      }
      // ... more events
    ]
  }
};
```

## 🔄 **Enhanced Workflow Integration**

### **Chat-to-Ticket Creation Flow**
```javascript
const ChatToTicketFlow = {
  triggers: [
    'Staff clicks "Create Ticket" in chat window',
    'Chat session ends with unresolved issue',
    'Guest requests ticket for follow-up',
    'Staff needs to escalate to specialist'
  ],
  
  process: {
    1: 'Open StaffTicketModal with chat data pre-filled',
    2: 'Generate conversation summary using AI/keywords',
    3: 'Smart category suggestion based on chat content',
    4: 'Staff reviews and adds additional context',
    5: 'Create ticket with unique CS- prefix',
    6: 'Link chat session to ticket in database',
    7: 'Optionally end chat or keep active for follow-up',
    8: 'Notify guest of ticket creation with ticket ID'
  }
};
```

### **Ticket Modal Enhancements**
```javascript
const EnhancedStaffTicketModal = {
  // New chat-specific tab
  chat_integration_tab: {
    title: 'Chat Information',
    sections: [
      'Session Details (duration, wait time, staff)',
      'Pre-chat Form Answers (category, description)', 
      'Chat Transcript Preview (expandable)',
      'Guest Contact Verification Status',
      'Session Performance Metrics'
    ]
  },
  
  // Enhanced user information section
  user_information_enhancements: {
    guest_contact_fields: {
      name: { source: 'chat_session', verified: true },
      email: { source: 'pre_chat_form', verified: 'pending' },
      phone: { source: 'pre_chat_form', verified: false },
      department: { source: 'pre_chat_form', verified: true }
    },
    
    verification_indicators: {
      verified: '✅ Verified from chat',
      pending: '⏳ Needs verification', 
      unverified: '❌ Not verified',
      auto_detected: '🤖 Auto-detected'
    }
  },
  
  // Smart suggestions
  ai_assistance: {
    category_suggestion: 'Based on chat keywords and pre-chat form',
    priority_recommendation: 'Based on chat urgency and wait time',
    description_generation: 'AI summary of chat conversation',
    follow_up_suggestions: 'Recommended next steps based on chat resolution'
  }
};
```

## 🎯 **Updated Todo Integration**

This integration affects several todos:

1. **Staff Ticket Modal Enhancement**: Extend existing StaffTicketModal for chat integration
2. **Chat Session Management**: Link active chat sessions to ticket creation
3. **Auto-Ticket Creation**: Smart ticket generation from chat conversations  
4. **Database Schema Updates**: New chat-ticket relationship tables
5. **Queue Interface Layout**: Three-panel layout (sidebar, ticket modal, chat windows)

### **New Ticket Categories in System**
- **Portal Tickets**: User-submitted via public portal (`UP-YYMMDD-XXX`)
- **Staff Tickets**: Staff-created for internal/external users (`SF-YYMMDD-XXX`) 
- **Chat Tickets**: Created from public portal chat sessions (`CS-YYMMDD-XXX`)

This creates a **complete customer support ecosystem** where guests can start with chat, get immediate help, and have their conversation automatically converted to a trackable ticket for follow-up, all while maintaining full integration with the existing Orvale Management System ticket workflow.