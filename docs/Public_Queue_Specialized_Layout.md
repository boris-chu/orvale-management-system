# Public Queue Specialized Interface Layout
*Updated: August 25, 2025*

## 🎯 **Specialized Queue Interface Design**

### **Complete Layout Overview**
The public queue interface at `/chat/public-queue` is **fundamentally different** from internal chat and requires a specialized layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: Public Support Queue (Red Theme) + Settings + Work Mode     │
├─────────────────────────────────────────────┬───────────────────────┤
│                                             │ RIGHT SIDEBAR         │
│                                             │ ┌─────────────────────┤
│                                             │ │ STAFF SECTION       │
│                                             │ │ ───────────────     │
│         MAIN WORKSPACE AREA                 │ │ 🟢 John (Ready)     │
│                                             │ │ 🔴 Jane (Helping)   │
│         (Floatable Chat Windows)            │ │ 🔵 Bob (Tickets)    │
│                                             │ │ 🟡 Alice (Away)     │
│                                             │ ├─────────────────────┤
│                                             │ │ QUEUE SECTION       │
│                                             │ │ ───────────────     │
│                                             │ │ ⏳ Guest #123 (3m)  │
│                                             │ │ 🔥 Guest #456 (15m) │
│                                             │ │ ❌ Guest #789 (20m) │
│                                             │ │ 🔄 Guest #012 (2m)  │
│                                             │ └─────────────────────┤
└─────────────────────────────────────────────┴───────────────────────┘
```

## 🎨 **Right Sidebar - Dual Section Design**

### **TOP SECTION: Internal Staff Collaboration**
```javascript
const StaffSection = {
  purpose: 'Internal staff working on public queue',
  location: 'Top half of right sidebar',
  
  staff_statuses: {
    '🟢 Ready': 'Available to take new public chats',
    '🔴 Helping': 'Currently handling a public chat session',
    '🔵 Ticketing': 'Working on tickets, not available for chats',
    '🟡 Away': 'Away/busy, not available',
    '⚫ Offline': 'Not available'
  },
  
  features: [
    'Real-time status updates',
    'Click to send internal message/help request',
    'Staff collaboration for difficult cases',
    'Load balancing visualization (how many chats per staff)',
    'Work mode toggle directly in sidebar'
  ]
};
```

### **BOTTOM SECTION: Public Guest Queue**
```javascript
const QueueSection = {
  purpose: 'Guests waiting for assistance',
  location: 'Bottom half of right sidebar',
  
  guest_statuses: {
    '⏳ Waiting': 'Normal queue, showing wait time',
    '🔥 Urgent': 'High priority (VIP, escalated, or long wait)',
    '❌ Abandoned': 'Staff disconnected, needs priority assistance', 
    '🔄 Reconnected': 'Session recovered, priority boost',
    '⚡ Priority': 'Manually marked as priority by staff',
    '🆘 Escalated': 'Escalated from another department'
  },
  
  display_info: [
    'Guest identifier (name or auto-generated ID)',
    'Wait time (live updating)',
    'Priority level indicator',
    'Department/category if provided',
    'Preview of initial message'
  ]
};
```

## 💬 **Floatable Chat System Design**

### **Singleton Chat Windows**
```javascript
const FloatableChatSystem = {
  concept: 'Each guest session opens in its own floating window',
  
  window_properties: {
    draggable: true,
    resizable: true,
    minimizable: true,
    closable: false, // Prevent accidental closure
    always_on_top: false,
    default_size: '400x600px',
    min_size: '300x400px',
    max_size: 'full_screen'
  },
  
  positioning: {
    initial: 'Center of main workspace, slightly offset',
    cascade: 'New windows cascade down-right',
    snap_zones: 'Left half, right half, corners for organization',
    memory: 'Remember positions between sessions'
  },
  
  singleton_enforcement: {
    rule: 'One floating window per guest session',
    prevention: 'Cannot open same session twice',
    takeover: 'If another staff tries to open, ask for transfer',
    persistence: 'Window survives page refresh'
  }
};
```

### **Chat Window Components**
```javascript
const FloatableChatWindow = {
  header: {
    guest_info: 'Name, wait time, priority badge',
    controls: ['minimize', 'maximize', 'transfer', 'internal_note'],
    status_indicator: 'Connection status (connected/typing/disconnected)'
  },
  
  body: {
    message_area: 'Standard chat interface with public portal styling',
    typing_indicator: 'Guest typing status',
    file_upload_zone: 'Drag & drop support'
  },
  
  footer: {
    message_input: 'Text input with emoji support',
    action_buttons: ['send', 'attach', 'end_chat', 'create_ticket'],
    internal_tools: ['transfer_to_staff', 'add_internal_note', 'escalate']
  }
};
```

## 🔄 **Session Management Logic**

### **Automatic Assignment Flow**
```javascript
const AutoAssignmentFlow = {
  trigger: 'New guest joins queue OR staff becomes ready',
  
  selection_criteria: [
    'Staff in "Ready" mode only',
    'Staff with lowest current chat count',
    'Staff with matching department preference',
    'Staff with best performance rating',
    'Random selection as tiebreaker'
  ],
  
  assignment_process: {
    1: 'Select available staff member',
    2: 'Send assignment notification to staff',
    3: 'Create floating chat window automatically',
    4: 'Update staff status to "Helping"',
    5: 'Remove guest from queue sidebar',
    6: 'Notify guest of connection'
  }
};
```

### **Manual Assignment (Staff-Initiated)**
```javascript
const ManualAssignment = {
  trigger: 'Staff clicks on guest in queue sidebar',
  
  process: {
    1: 'Check if staff is in "Ready" or "Work Mode"',
    2: 'Verify staff not at max concurrent chat limit',
    3: 'Create new floating chat window',
    4: 'Claim the guest session',
    5: 'Update all other staff interfaces (remove from available)',
    6: 'Start the chat session'
  },
  
  conflict_resolution: {
    simultaneous_claims: 'First click wins, others get notification',
    staff_unavailable: 'Show error, suggest switching to Ready mode',
    session_already_taken: 'Show current handler, offer transfer option'
  }
};
```

## 🎨 **Visual Design Specifications**

### **Right Sidebar Layout**
```css
.public-queue-sidebar {
  width: 300px;
  height: 100vh;
  background: var(--queue-sidebar-color);
  border-left: 1px solid var(--queue-border-color);
  
  display: flex;
  flex-direction: column;
}

.staff-section {
  height: 40%; /* Top 40% for staff */
  border-bottom: 2px solid var(--queue-accent-color);
  overflow-y: auto;
  padding: 16px;
}

.queue-section {
  height: 60%; /* Bottom 60% for guest queue */
  overflow-y: auto;
  padding: 16px;
}

.staff-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  
  &:hover {
    background: var(--queue-secondary-color);
  }
}

.queue-guest {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  border-left: 4px solid transparent;
  
  &.priority {
    border-left-color: var(--queue-priority-urgent-color);
  }
  
  &.abandoned {
    border-left-color: var(--queue-abandoned-badge-color);
  }
  
  &:hover {
    background: var(--queue-secondary-color);
    transform: translateX(4px);
    transition: all 0.2s ease;
  }
}
```

### **Floatable Window Styling**
```css
.floatable-chat-window {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  border: 1px solid var(--queue-border-color);
  z-index: 1000;
  
  min-width: 300px;
  min-height: 400px;
  
  &.focused {
    box-shadow: 0 12px 48px rgba(0,0,0,0.15);
    border-color: var(--queue-primary-color);
  }
}

.chat-window-header {
  background: var(--queue-primary-color);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move; /* For dragging */
  border-radius: 8px 8px 0 0;
}

.guest-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wait-time {
  font-size: 12px;
  opacity: 0.9;
}

.priority-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(255,255,255,0.2);
}
```

## 🔧 **Technical Implementation Requirements**

### **React Components Architecture**
```javascript
// Main public queue page
const PublicQueuePage = {
  layout: 'Custom layout (not standard chat layout)',
  components: [
    'PublicQueueHeader',
    'MainWorkspace', 
    'PublicQueueSidebar',
    'FloatableChatManager'
  ]
};

// Specialized components
const PublicQueueSidebar = {
  sections: ['StaffSection', 'QueueSection'],
  real_time_updates: true,
  click_handlers: ['assign_chat', 'contact_staff', 'priority_boost']
};

const FloatableChatManager = {
  window_management: 'Create, position, focus, minimize floatable windows',
  singleton_enforcement: 'Prevent duplicate sessions',
  persistence: 'Save/restore window positions',
  drag_drop: 'Window positioning and organization'
};
```

### **Socket.io Events for Public Queue**
```javascript
const PublicQueueEvents = {
  // Staff status updates
  'staff_work_mode_changed': { staff, old_mode, new_mode },
  'staff_chat_assigned': { staff, session_id, guest_info },
  'staff_chat_ended': { staff, session_id, duration },
  
  // Queue updates  
  'guest_joined_queue': { session_id, guest_info, position },
  'guest_left_queue': { session_id, reason },
  'queue_position_updated': { session_id, new_position, wait_time },
  'priority_boosted': { session_id, old_priority, new_priority, reason },
  
  // Chat window management
  'open_floatable_chat': { session_id, guest_info, window_config },
  'close_floatable_chat': { session_id, reason },
  'transfer_chat_request': { from_staff, to_staff, session_id }
};
```

This specialized layout transforms the public queue into a **professional call center interface** rather than a traditional chat application, optimized for handling multiple customer support sessions simultaneously with clear visual organization and efficient workflow management.