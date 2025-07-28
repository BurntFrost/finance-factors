# Finance Factors Dashboard - Design System

## Overview

This design system establishes the visual and interaction standards for the Finance Factors Dashboard, integrating shadcn/ui components with our existing financial data visualization context.

## Design Principles

### 1. **Data-First Design**
- Visual hierarchy that prioritizes financial data and insights
- Clear distinction between data states (live, historical, loading, error)
- Minimal visual noise to enhance data readability

### 2. **Professional Accessibility**
- WCAG 2.1 AA compliance for financial industry standards
- High contrast ratios for data visualization
- Keyboard navigation for all interactive elements

### 3. **Performance-Conscious**
- Lightweight components that don't impact chart rendering
- Efficient responsive design for mobile trading/analysis
- Fast loading for real-time financial data

## Color Palette

### Primary Colors
```css
/* Light Theme */
--primary: #007bff;           /* Primary blue for actions */
--primary-foreground: #ffffff;

/* Dark Theme */
--primary: #4dabf7;           /* Lighter blue for dark mode */
--primary-foreground: #0a0a0a;
```

### Semantic Colors
```css
/* Financial Data States */
--success: #28a745;           /* Positive trends, live data */
--warning: #ffc107;           /* Caution, historical data */
--destructive: #dc3545;       /* Negative trends, errors */
--info: #17a2b8;             /* Neutral information */

/* Data Visualization */
--chart-positive: #28a745;    /* Upward trends */
--chart-negative: #dc3545;    /* Downward trends */
--chart-neutral: #6c757d;     /* Stable/neutral data */
```

### Background & Surface Colors
```css
/* Light Theme */
--background: #ffffff;
--card: #ffffff;
--popover: #ffffff;
--muted: #f8f9fa;
--accent: #e9ecef;
--border: #e0e0e0;

/* Dark Theme */
--background: #0a0a0a;
--card: #1a1a1a;
--popover: #1a1a1a;
--muted: #2a2a2a;
--accent: #404040;
--border: #404040;
```

## Typography

### Font Stack
- **Primary**: Geist Sans (already configured)
- **Monospace**: Geist Mono (for data/numbers)

### Scale
```css
--font-size-xs: 0.75rem;      /* 12px - Small labels */
--font-size-sm: 0.875rem;     /* 14px - Body text */
--font-size-base: 1rem;       /* 16px - Default */
--font-size-lg: 1.125rem;     /* 18px - Subheadings */
--font-size-xl: 1.25rem;      /* 20px - Headings */
--font-size-2xl: 1.5rem;      /* 24px - Page titles */
--font-size-3xl: 1.875rem;    /* 30px - Dashboard title */
```

### Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (labels, buttons)
- **Semibold**: 600 (headings)
- **Bold**: 700 (emphasis, data values)

## Spacing System

### Base Unit: 0.25rem (4px)

```css
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-5: 1.25rem;   /* 20px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
--spacing-16: 4rem;     /* 64px */
```

## Component Specifications

### Cards
- **Default**: Clean white/dark background with subtle border
- **Data Card**: Enhanced with colored left border for data type indication
- **Chart Container**: Optimized padding for Chart.js integration
- **Summary Card**: Compact layout for key metrics

### Buttons
- **Primary**: Main actions (Add Chart, Save, etc.)
- **Secondary**: Secondary actions (Cancel, Reset)
- **Ghost**: Subtle actions (Remove, Edit)
- **Icon**: Toggle buttons (Dark Mode, View Mode)

### Status Indicators
- **Pill Shape**: Rounded indicators for data status
- **Color Coded**: Green (live), Yellow (historical), Red (error), Gray (loading)
- **Animated**: Subtle pulse for loading states

### Form Elements
- **Consistent Height**: 40px for all input elements
- **Clear Focus States**: Visible focus rings for accessibility
- **Error States**: Red border and helper text for validation

## Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Grid System
- **Mobile**: 1 column
- **Tablet**: 2 columns
- **Desktop**: 3 columns
- **Large**: 4 columns (for many charts)

## Accessibility Standards

### Focus Management
- Visible focus indicators on all interactive elements
- Logical tab order through dashboard components
- Skip links for screen readers

### Color Contrast
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text and UI components
- High contrast mode support

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for complex components
- Live regions for dynamic data updates

## Animation & Transitions

### Timing Functions
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### Durations
- **Fast**: 150ms (hover states, focus)
- **Normal**: 200ms (component transitions)
- **Slow**: 300ms (layout changes, modals)

### Reduced Motion
- Respect `prefers-reduced-motion` for accessibility
- Disable animations for users who prefer reduced motion

## Implementation Guidelines

### Component Priority Order
1. **Foundation**: Button, Card, Input, Select
2. **Layout**: Container, Grid, Separator
3. **Feedback**: Alert, Toast, Badge, Progress
4. **Navigation**: Tabs, Dropdown Menu, Toggle
5. **Data Display**: Table, Skeleton, Tooltip
6. **Overlay**: Dialog, Popover, Sheet

### Migration Strategy
- Coexist with existing CSS Modules
- Gradual component-by-component migration
- Preserve all existing Chart.js functionality
- Maintain performance benchmarks

## Quality Assurance

### Testing Requirements
- Visual regression testing for all components
- Accessibility testing with screen readers
- Performance impact measurement
- Cross-browser compatibility verification

### Documentation Standards
- Component usage examples
- Accessibility notes for each component
- Performance considerations
- Migration notes from existing components
