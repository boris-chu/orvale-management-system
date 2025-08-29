# Public Portal Cross-Namespace Messaging Fix

## Issue Fixed
Staff in the main namespace could not communicate with guests in the public portal namespace, and vice versa. Messages were not flowing between the two namespaces.

## Root Causes
1. **Missing Cross-Namespace Handlers**: Main namespace lacked handlers for public portal events
2. **No Session Deduplication**: Multiple sessions created for same guest causing confusion
3. **Isolated Communication**: Each namespace only handled its own events

## Solutions Applied

### 1. Cross-Namespace Staff Handlers (Main Namespace)
Added handlers to main namespace socket connection for staff to interact with public portal:

```javascript
// Handle staff messages to guests from main namespace
socket.on('staff:message', async (data) => {
  // Save to database
  // Send to guest via publicPortalNamespace.to(`session:${sessionId}`)
  // Send confirmation to staff via main namespace
});

// Handle staff connecting to sessions
socket.on('staff:connect_to_session', async (data) => {
  // Assign agent to session
  // Update database
  // Remove from queue
  // Notify guest via publicPortalNamespace
});

// Other handlers: staff:typing, staff:disconnect_from_session, staff:end_session
```

### 2. Cross-Namespace Guest Messages (Public Portal Namespace)
Enhanced guest message handler to emit to main namespace:

```javascript
socket.on('guest:message', async (data) => {
  // Save message to database
  // Forward to assigned agent via publicPortalNamespace
  // ALSO emit to main namespace for singleton client
  io.emit('guest:message', {
    sessionId: socket.sessionId,
    messageId,
    message,
    type,
    guestName: session.guestName,
    timestamp: new Date()
  });
});
```

### 3. Session Deduplication Logic
Added 30-minute session reuse window to prevent duplicate sessions:

```javascript
function checkForExistingSession() {
  db.get(
    `SELECT session_id, status, created_at 
     FROM public_chat_sessions 
     WHERE visitor_name = ? AND visitor_email = ? 
     AND status IN ('waiting', 'active') 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [name, email],
    (err, existingRow) => {
      if (existingRow && timeDiff < 30_minutes) {
        // Reuse existing session
        socket.sessionId = existingSessionId;
        // Update socket and memory
        // Send session:started with reconnected: true
      } else {
        // Create new session
        createNewGuestSession();
      }
    }
  );
}
```

## Message Flow After Fix

```
Guest sends message in Public Portal Namespace
    ↓
Saved to database (public_chat_messages)
    ↓
Emitted to assigned agent in Public Portal Namespace
    ↓
ALSO emitted to Main Namespace for singleton clients
    ↓
Staff sees message in their interface

Staff sends message in Main Namespace
    ↓
Saved to database (public_chat_messages)
    ↓
Emitted to guest via Public Portal Namespace
    ↓
Emitted confirmation back to staff in Main Namespace
    ↓
Guest sees message in public chat widget
```

## Benefits

1. **✅ Bidirectional Communication**: Staff ↔ Guest messaging works seamlessly
2. **✅ Session Continuity**: Same guest reuses session within 30 minutes
3. **✅ Reduced Duplicates**: No multiple sessions for same guest
4. **✅ Singleton Compatibility**: Works with Socket.io singleton pattern
5. **✅ Database Consistency**: All messages properly saved and tracked

## Testing
- Clean database state with no stale sessions
- Cross-namespace message delivery verified
- Session deduplication tested with 30-minute window
- Real-time updates working for both staff and guests

## Files Modified
- `socket-server.js`: Added cross-namespace handlers and session deduplication

## Database Impact
- Uses existing `public_chat_messages` and `public_chat_sessions` tables
- No schema changes required
- Session reuse reduces database growth