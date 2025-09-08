# StaffTicketModal Infinite Loop & MUI Select Issues - Debugging Session

**Date:** August 29, 2025  
**Issue:** StaffTicketModal not working properly from public queue chat interface  
**Status:** ✅ **RESOLVED**

## 🐛 **Problem Summary**

When creating tickets from chat sessions via the "Create Ticket" button in the public queue, multiple issues occurred:

1. **Categories not loading** in REQUEST tab dropdown
2. **Created tickets not appearing** in Pending queue
3. **Infinite console spam** with repeated API calls
4. **React Rules of Hooks violation**

## 🔍 **Root Cause Analysis**

### **Primary Issue: Infinite Re-render Loop**
The StaffTicketModal was stuck in an infinite loop caused by:

```javascript
// ❌ PROBLEM: Object recreated on every render
<StaffTicketModal
  defaultValues={ticketModalContext ? {
    title: `Chat Session: ${guest.name}`,
    // ... other properties
  } : undefined}
/>
```

**Loop Process:**
1. Parent component renders → Creates new `defaultValues` object
2. `useEffect([open, defaultValues, currentUser])` detects new object reference
3. Modal reloads data → Triggers API calls and state updates
4. Parent re-renders → Creates new `defaultValues` object again
5. **Infinite loop continues...**

### **Secondary Issues:**

#### **MUI Select Validation Errors**
```
MUI: You have provided an out-of-range value `General Support` for the select component.
Available values are `applicationSystemSupport`, `technicalSupport`, etc.
```

- **Cause**: Invalid category keys used as default values
- **Impact**: Select components reject invalid values, preventing dropdown population

#### **Wrong Ticket Status & Team Assignment**
- **Status**: Using `'open'` (doesn't exist in queue filters) instead of `'pending'`
- **Team**: Tickets assigned to `HELPDESK` instead of user's team (`ITTS_Region7`)

#### **React Rules of Hooks Violation**
```
React has detected a change in the order of Hooks called by PublicQueuePage.
Previous render: 29. undefined
Next render:     29. useMemo
```

- **Cause**: Added `useMemo` inline within JSX instead of at component top level
- **Impact**: Breaks React's hook tracking system

## ✅ **Solutions Implemented**

### **1. Fixed Infinite Loop with Memoized Default Values**

**Before:**
```javascript
// ❌ Creates new object every render
<StaffTicketModal
  defaultValues={ticketModalContext ? {
    title: `Chat Session: ${ticketModalContext.guestInfo.guestName}`,
    // ...
  } : undefined}
/>
```

**After:**
```javascript
// ✅ Memoized at component top level
const ticketModalDefaultValues = useMemo(() => {
  if (!ticketModalContext) return undefined;
  
  return {
    title: `Chat Session: ${ticketModalContext.guestInfo.guestName}`,
    description: `Chat session with ${ticketModalContext.guestInfo.guestName}.\n\nInitial message: ${ticketModalContext.guestInfo.initialMessage}\n\nDepartment: ${ticketModalContext.guestInfo.department}`,
    userDisplayName: ticketModalContext.guestInfo.guestName,
    userEmail: `${ticketModalContext.guestInfo.guestName.toLowerCase().replace(/\s+/g, '.')}@guest.com`,
    submittedBy: ticketModalContext.guestInfo.guestName,
    priority: ticketModalContext.guestInfo.priority === 'urgent' ? 'urgent' : 
             ticketModalContext.guestInfo.priority === 'high' ? 'high' : 'medium',
    category: '', // Empty - let user select
    requestType: '', // Empty - let user select  
    status: 'pending', // Correct status for queue
    assignedTeam: currentUser?.team_id || 'ITTS_Region7' // User's team
  };
}, [ticketModalContext, currentUser?.team_id]);

<StaffTicketModal
  defaultValues={ticketModalDefaultValues}
/>
```

### **2. Fixed MUI Select Validation Errors**

**Before:**
```javascript
category: 'General Support', // ❌ Invalid key
requestType: 'Other', // ❌ Invalid key
```

**After:**
```javascript
category: '', // ✅ Let user select valid category
requestType: '', // ✅ Let user select after category loads
```

**Valid Category Keys:**
```javascript
{
  "applicationSystemSupport": "Application/System Support",
  "hardwareInfrastructureManagement": "Hardware - Infrastructure Management", 
  "hardwareTechnicalSupport": "Hardware - Technical Support",
  "infrastructureManagement": "Infrastructure Management",
  "mediaServicesSupport": "Media Services Support",
  "technicalSupport": "Technical Support",
  "technicalSupportAdmin": "Technical Support Admin",
  "vtcSupport": "VTC Support",
  "webexSupport": "WebEx Support"
}
```

### **3. Fixed Ticket Status & Team Assignment**

**Before:**
```javascript
status: 'open', // ❌ Doesn't exist in queue filters
assignedTeam: 'HELPDESK' // ❌ Wrong team (from API fallback)
```

**After:**
```javascript  
status: 'pending', // ✅ Appears in Pending queue
assignedTeam: currentUser?.team_id || 'ITTS_Region7' // ✅ User's team
```

### **4. Fixed React Rules of Hooks Violation**

**Before:**
```javascript
// ❌ Hook used inline in JSX (line 1442)
<StaffTicketModal
  defaultValues={useMemo(() => {
    // ...
  }, [deps])}
/>
```

**After:**
```javascript
// ✅ Hook at component top level (line 157)
const ticketModalDefaultValues = useMemo(() => {
  // ...
}, [ticketModalContext, currentUser?.team_id]);

<StaffTicketModal
  defaultValues={ticketModalDefaultValues}
/>
```

### **5. Enhanced StaffTicketModal with Form Reset & Debug Logging**

Added comprehensive logging and form reset to prevent state pollution:

```javascript
useEffect(() => {
  if (open) {
    console.log('📂 [StaffTicketModal] Modal opened - Loading data...');
    
    // Reset form first to prevent state pollution
    setFormData({
      title: '', category: '', requestType: '', // ... all fields
    });
    
    loadCategories();
    loadTeams();
    loadUsers();
    
    // Apply default values AFTER reset
    if (defaultValues) {
      console.log('📝 [StaffTicketModal] Applying default values:', defaultValues);
      setFormData(prev => ({ ...prev, ...defaultValues }));
    }
  }
}, [open, defaultValues, currentUser]);
```

## 📊 **Before vs After**

| Issue | Before | After |
|-------|--------|-------|
| **Console** | Infinite spam of API calls | Clean, single load |
| **Categories** | Empty dropdown | Properly loaded options |
| **Created Tickets** | Not visible (wrong team/status) | Appear in Pending queue |
| **Ticket IDs** | CS-YYMMDD-XXX created but lost | CS-YYMMDD-XXX visible |
| **React Warnings** | Rules of Hooks violation | No violations |
| **MUI Errors** | Select validation errors | No validation errors |

## 🧪 **Testing Results**

### **Database Verification:**
```sql
SELECT submission_id, issue_title, status, ticket_source, assigned_team 
FROM user_tickets 
WHERE submission_id LIKE 'CS-%' 
ORDER BY submitted_at DESC;
```

**Results:**
- `CS-250829-005` | Chat Session: Patricia Collins | **pending** | chat_sourced | **ITTS_Region7** ✅
- `CS-250829-004` | Chat Session: Patricia Collins | **pending** | chat_sourced | **ITTS_Region7** ✅

### **User Experience:**
1. ✅ Click "Create Ticket" → Modal opens once (no loops)
2. ✅ Categories load properly in REQUEST tab
3. ✅ Form pre-populated with chat context
4. ✅ Create ticket → Success with CS- prefix
5. ✅ Ticket appears in user's team Pending queue

## 🎯 **Key Learnings**

### **React Performance:**
- **Always memoize complex objects** passed as props to prevent unnecessary re-renders
- **Use `useMemo`, `useCallback`, or move objects outside render** for stable references
- **Monitor `useEffect` dependencies** carefully - object recreations trigger loops

### **MUI Form Validation:**
- **Use exact key values** from data structures, not display names
- **Empty string defaults** are safer than invalid values for Select components
- **MUI Select silently fails** with invalid values, breaking form state

### **React Rules of Hooks:**
- **All hooks must be at top level** of functional components
- **Never use hooks conditionally** or inside loops/JSX
- **Consistent hook order** required across all renders

### **Database Debugging:**
- **Check actual data** in database vs. UI expectations  
- **Team assignment logic** in APIs may override frontend values
- **Status field values** must match exactly what queue filters expect

## 📁 **Files Modified**

1. **`/app/chat/public-queue/page.tsx`**
   - Added memoized `ticketModalDefaultValues`
   - Fixed default values (status, assignedTeam, empty category/requestType)
   - Moved `useMemo` to proper hook location

2. **`/components/StaffTicketModal.tsx`**
   - Added comprehensive debug logging
   - Implemented form reset on modal open
   - Enhanced error handling for category loading

3. **`/app/api/staff/tickets/route.ts`** 
   - Already had CS- prefix logic working correctly

## 🚀 **Deployment Ready**

All issues resolved and tested:
- ✅ No infinite loops or performance issues
- ✅ Proper category loading and form validation  
- ✅ CS- prefixed tickets created and visible
- ✅ Clean React component with proper hook usage
- ✅ Enhanced debugging capabilities for future issues

The StaffTicketModal integration with the public chat queue is now fully functional and production-ready.