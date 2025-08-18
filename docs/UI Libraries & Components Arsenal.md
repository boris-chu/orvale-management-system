# UI Libraries & Components Arsenal

## 📚 Complete Catalog of Available UI Components and Libraries

This document provides a comprehensive reference to all UI components and libraries available in the Orvale Management System development environment.

**Last Updated**: August 18, 2025  
**Location**: `/docs/UI Libraries & Components Arsenal.md`

---

## 🎨 Available UI Libraries

### 1. **shadcn/ui** (Primary UI Components)
**Location**: `/components/ui/`  
**Purpose**: Modern, accessible React components built on Radix UI  
**Status**: ✅ Active & Recommended

#### Core Components
| Component | File | Usage | Best For |
|-----------|------|-------|----------|
| **Button** | `button.tsx` | Interactive actions | All buttons, CTAs |
| **Card** | `card.tsx` | Content containers | Dashboards, lists |
| **Dialog** | `dialog.tsx` | Modal overlays | Forms, confirmations |
| **Input** | `input.tsx` | Text inputs | Forms, search |
| **Label** | `label.tsx` | Form labels | Form accessibility |
| **Select** | `select.tsx` | Dropdown menus | ⚠️ **React 19 Issue** |
| **Tabs** | `tabs.tsx` | Content organization | Multi-panel interfaces |
| **Badge** | `badge.tsx` | Status indicators | Status, tags, counts |
| **Alert** | `alert.tsx` | Notifications | Messages, warnings |
| **Textarea** | `textarea.tsx` | Multi-line text | Descriptions, comments |

#### Component Variants & Features
```tsx
// Button variants
<Button variant="default" />      // Primary blue
<Button variant="destructive" />  // Red danger
<Button variant="outline" />      // Border only
<Button variant="secondary" />    // Gray background
<Button variant="ghost" />        // Transparent
<Button variant="link" />         // Link style

// Button sizes
<Button size="default" />         // Standard
<Button size="sm" />             // Small
<Button size="lg" />             // Large
<Button size="icon" />           // Square icon

// Badge variants
<Badge variant="default" />       // Blue
<Badge variant="secondary" />     // Gray
<Badge variant="destructive" />   // Red
<Badge variant="outline" />       // Border only
```

### 2. **Material-UI (MUI)** (Select Components)
**Location**: External import via `@mui/material`  
**Purpose**: React 19 compatible select components  
**Status**: ✅ **Working Solution for Dropdowns**

#### Available Components
| Component | Import | Usage | React 19 Status |
|-----------|--------|-------|----------------|
| **Select** | `@mui/material` | Dropdown selections | ✅ **Working** |
| **MenuItem** | `@mui/material` | Select options | ✅ **Working** |
| **FormControl** | `@mui/material` | Form containers | ✅ **Working** |
| **InputLabel** | `@mui/material` | Input labels | ✅ **Working** |

#### Implementation Pattern
```tsx
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

<FormControl size="small" className="w-full">
  <InputLabel id="select-label">Choose Option</InputLabel>
  <Select
    labelId="select-label"
    value={value}
    label="Choose Option"
    onChange={handleChange}
  >
    <MenuItem value="option1">Option 1</MenuItem>
    <MenuItem value="option2">Option 2</MenuItem>
  </Select>
</FormControl>
```

### 3. **EvilCharts** (Advanced UI Components)
**Location**: `/project-ticket-development/ui-libraries/evilcharts/`  
**Purpose**: Modern charts and advanced UI components  
**Status**: ✅ **Available for Advanced Features**

#### Chart Components
| Category | Components | Use Cases |
|----------|------------|-----------|
| **Bar Charts** | `gradient-bar-chart`, `glowing-bar-chart`, `duotone-bar-chart` | Metrics, comparisons |
| **Line Charts** | `glowing-line`, `dotted-line`, `rainbow-glow-gradient-line` | Trends, time series |
| **Area Charts** | `gradient-chart`, `animated-highlighted-chart` | Volume data |
| **Pie Charts** | `rounded-pie-chart`, `radial-chart` | Proportions, breakdowns |
| **Radar Charts** | `glowing-stroke-radar-chart` | Multi-dimensional data |

#### Advanced UI Components
| Component | File | Purpose | Features |
|-----------|------|---------|----------|
| **ShimmerText** | `shimmer-text.tsx` | Animated text | Loading states, highlights |
| **ShinyText** | `shiny-text.tsx` | Animated text | Attention-grabbing text |
| **Button** | `components/ui/button.tsx` | Enhanced buttons | Additional variants |
| **Badge** | `components/ui/badge.tsx` | Status indicators | More styling options |
| **Skeleton** | `components/ui/skeleton.tsx` | Loading placeholders | Content loading |
| **Steps** | `components/ui/steps.tsx` | Progress indicators | Multi-step processes |

#### Chart Usage Examples
```tsx
// Import from evilcharts
import { GradientBarChart } from "@/charts/bar-charts/gradient-bar-chart"
import { GlowingLine } from "@/charts/line-charts/glowing-line"
import { RoundedPieChart } from "@/charts/pie-charts/rounded-pie-chart"

// Usage in dashboards
<GradientBarChart data={ticketData} />
<GlowingLine data={timeSeriesData} />
<RoundedPieChart data={statusBreakdown} />
```

### 4. **Framer Motion** (Animations)
**Location**: External import via `framer-motion`  
**Purpose**: Smooth animations and transitions  
**Status**: ✅ **Installed & Active**

#### Available Features
| Feature | Usage | Best For |
|---------|-------|----------|
| **motion.div** | Basic animations | Fades, scales, moves |
| **AnimatePresence** | Enter/exit animations | Modal transitions |
| **Layout animations** | Layout changes | Smooth repositioning |
| **Gesture animations** | User interactions | Hover, tap effects |

#### Animation Patterns
```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Fade in/out
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>

// Scale animation
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>

// Conditional rendering with animation
<AnimatePresence>
  {condition && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
  )}
</AnimatePresence>
```

### 5. **Lucide React** (Icons)
**Location**: External import via `lucide-react`  
**Purpose**: Comprehensive icon library  
**Status**: ✅ **Primary Icon Library**

#### Commonly Used Icons
| Category | Icons | Usage |
|----------|-------|-------|
| **Actions** | `Save`, `Edit`, `Delete`, `Search`, `Eye` | Buttons, actions |
| **Status** | `Check`, `X`, `AlertTriangle`, `Clock` | Status indicators |
| **Navigation** | `ChevronRight`, `ArrowUp`, `FolderOpen` | Navigation, hierarchies |
| **Content** | `User`, `Building2`, `Tag`, `Ticket` | Content representation |
| **System** | `RefreshCw`, `Settings`, `Download` | System functions |

```tsx
import { Save, Check, AlertTriangle, Building2 } from 'lucide-react';

<Button>
  <Save className="h-4 w-4 mr-2" />
  Save Changes
</Button>
```

---

## 🎯 Component Selection Strategy

### Form Components
| Need | Recommended Library | Component | Reason |
|------|-------------------|-----------|--------|
| **Buttons** | shadcn/ui | `Button` | Comprehensive variants |
| **Text Input** | shadcn/ui | `Input` | Consistent styling |
| **Dropdowns** | Material-UI | `Select` | **React 19 compatible** |
| **Text Areas** | shadcn/ui | `Textarea` | Form consistency |
| **Labels** | shadcn/ui | `Label` | Accessibility |

### Layout Components
| Need | Recommended Library | Component | Reason |
|------|-------------------|-----------|--------|
| **Containers** | shadcn/ui | `Card` | Consistent containers |
| **Modals** | shadcn/ui | `Dialog` | Accessible modals |
| **Tabs** | shadcn/ui | `Tabs` | Content organization |
| **Badges** | shadcn/ui | `Badge` | Status indicators |

### Data Visualization
| Need | Recommended Library | Component | Reason |
|------|-------------------|-----------|--------|
| **Bar Charts** | EvilCharts | `gradient-bar-chart` | Modern styling |
| **Line Charts** | EvilCharts | `glowing-line` | Attractive trends |
| **Pie Charts** | EvilCharts | `rounded-pie-chart` | Clean proportions |
| **Dashboards** | EvilCharts | Multiple chart types | Comprehensive suite |

### Animation & Interaction
| Need | Recommended Library | Component | Reason |
|------|-------------------|-----------|--------|
| **Page Transitions** | Framer Motion | `motion.div` | Smooth transitions |
| **Button States** | Framer Motion | `whileHover`, `whileTap` | Interactive feedback |
| **Loading States** | EvilCharts | `ShimmerText` | Elegant loading |
| **Modal Animations** | Framer Motion | `AnimatePresence` | Smooth modals |

---

## 🚀 Implementation Patterns

### Smart Save Button (Current Implementation)
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, RefreshCw } from 'lucide-react';

<AnimatePresence mode="wait">
  {hasChanges() && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <Button 
        className={saveStatus === 'saved' ? 'bg-green-600' : 'bg-blue-600'}
        disabled={saveStatus === 'saving'}
      >
        {saveStatus === 'saved' ? <Check /> : 
         saveStatus === 'saving' ? <RefreshCw className="animate-spin" /> : 
         <Save />}
      </Button>
    </motion.div>
  )}
</AnimatePresence>
```

### Browse Modal Pattern (Current Implementation)
```tsx
// Browse button
<Button onClick={() => setShowBrowser(true)}>
  <Search className="h-4 w-4" />
  Browse Paths
</Button>

// Modal with comprehensive data viewer
<Dialog open={showBrowser} onOpenChange={setShowBrowser}>
  <DialogContent className="max-w-5xl">
    {/* Search, sort, and selection interface */}
  </DialogContent>
</Dialog>
```

### Notification System Pattern
```tsx
// Non-intrusive notification
{notification && (
  <div className={`fixed top-4 right-4 p-4 rounded-lg ${
    notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white`}>
    {notification.message}
  </div>
)}
```

---

## 🔧 Development Guidelines

### CSS Framework
- **Primary**: Tailwind CSS for all styling
- **Utility Classes**: Use Tailwind utilities for consistent spacing, colors
- **Custom Styles**: Minimal custom CSS, prefer Tailwind utilities

### Color Scheme
```css
/* Primary Colors */
--blue-600: #2563eb      /* Primary actions */
--green-600: #16a34a     /* Success states */
--red-600: #dc2626       /* Error states */
--gray-600: #4b5563      /* Secondary text */

/* Status Colors */
--pending: #3b82f6       /* Blue */
--in-progress: #6366f1   /* Indigo */
--completed: #10b981     /* Green */
--escalated: #8b5cf6     /* Purple */
```

### Responsive Design
- **Mobile First**: Design for mobile, enhance for desktop
- **Breakpoints**: `sm:`, `md:`, `lg:` Tailwind breakpoints
- **Grid System**: CSS Grid and Flexbox via Tailwind

---

## 🎯 Best Practices

### Component Usage
1. **shadcn/ui first** for standard components
2. **Material-UI for selects** until React 19 compatibility is resolved
3. **EvilCharts for visualizations** and advanced UI elements
4. **Framer Motion for animations** that enhance UX
5. **Lucide React for all icons**

### Performance Considerations
1. **Lazy load** chart components
2. **Use React.memo** for expensive components
3. **Dynamic imports** for non-critical components
4. **Optimize bundle size** by importing only needed components

### Accessibility
1. **Use semantic HTML** elements
2. **Include ARIA labels** for screen readers
3. **Keyboard navigation** support
4. **Color contrast** compliance
5. **Focus management** in modals

---

## 📈 Future Enhancements

### Planned Additions
1. **Data Tables** from shadcn/ui for advanced ticket lists
2. **Date Pickers** for scheduling and filtering
3. **Rich Text Editors** for ticket descriptions
4. **File Upload** components for attachments
5. **Advanced Charts** from EvilCharts for analytics

### Component Wishlist
- **Calendar** component for scheduling
- **Timeline** component for ticket history
- **Kanban Board** components for project management
- **Tree View** for organizational hierarchy
- **Advanced Search** with filters and facets

---

*This document serves as the authoritative reference for all UI components available in the Orvale Management System. Refer to this document when selecting components for new features or troubleshooting existing implementations.*