# Data Status Pills Feature

This document describes the data status pills feature added to the Finance Factors Dashboard.

## Overview

The data status pills feature provides visual indicators to help users understand whether the data being displayed is recently updated real data or historical data. This improves user experience by clearly communicating data freshness and authenticity.

## Implementation

### Components Added

1. **DataStatusPill.tsx** - Main pill component
2. **DataStatusPill.module.css** - Styling for the pill component
3. **DataStatusPill.test.tsx** - Unit tests for the component

### Status Types

The system supports four data status types:

- **🟢 Live Data** (`recent`) - Recently updated real data
- **📊 Historical Data** (`historical`) - Real historical financial data for analysis
- **🔴 Outdated** (`stale`) - Real data that may be outdated
- **⏳ Loading...** (`loading`) - Data is being loaded

### Features

#### Visual Design
- Clean, modern pill design with rounded corners
- Color-coded status indicators with icons
- Hover effects with subtle animations
- Responsive design for mobile devices
- Dark mode support
- High contrast mode support

#### Size Variants
- **Small** - For compact layouts (charts, cards)
- **Medium** - Default size for general use
- **Large** - For prominent displays

#### Smart Timestamps
- Displays relative time for recent data ("Just now", "5m ago", "2h ago")
- Automatically determines data freshness
- Hides timestamps on mobile to save space

#### Accessibility
- Proper ARIA labels and tooltips
- High contrast support
- Keyboard navigation friendly

### Integration Points

The data status pills have been integrated into all major UI components:

#### 1. Charts (LazyChart, DynamicChart)
- Pills appear next to chart titles
- Show data source and last update time
- Integrated with refresh functionality

#### 2. Data Tables (DataTable)
- Pills in table headers
- Indicate data source and freshness
- Work with search and pagination

#### 3. Summary Cards (SummaryCard, SummaryCardGrid)
- Individual pills on each card
- Grid-level status for card collections
- Compact display for space efficiency

### Data Model Updates

Extended the following interfaces to support status metadata:

```typescript
interface ChartData {
  // ... existing properties
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}

interface DashboardElement {
  // ... existing properties
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}

interface SummaryCardData {
  // ... existing properties
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}

interface TableData {
  // ... existing properties
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}
```

### Historical Data Updates

All historical data generators now include status metadata:

- `isRealData: false` - Marks data as historical
- `dataSource: 'Historical Data Generator'` - Identifies the source
- Static charts marked with `dataSource: 'Static Historical Data'`

### Utility Functions

#### `getDataStatus(lastUpdated?, isRealData)`
Automatically determines the appropriate status based on:
- Whether data is real or historical
- How recently the data was updated
- Returns appropriate status type for display

### CSS Architecture

The styling follows the existing design system:

- CSS Modules for component isolation
- CSS custom properties for theming
- Responsive breakpoints matching the dashboard
- Consistent with existing component styles

### Performance Considerations

- Lightweight component with minimal re-renders
- CSS animations use transform/opacity for smooth performance
- Lazy evaluation of timestamp formatting
- Efficient status determination logic

## Usage Examples

### Basic Usage
```tsx
<DataStatusPill status="historical" />
<DataStatusPill status="recent" lastUpdated={new Date()} />
<DataStatusPill status="stale" lastUpdated={oldDate} size="small" />
```

### Automatic Status Detection
```tsx
const status = getDataStatus(data.lastUpdated, data.isRealData);
<DataStatusPill status={status} lastUpdated={data.lastUpdated} />
```

### In Chart Headers
```tsx
<div className={styles.titleSection}>
  <h2>{title}</h2>
  <DataStatusPill 
    status={getDataStatus(data.lastUpdated, data.isRealData)} 
    lastUpdated={data.lastUpdated}
    size="small"
  />
</div>
```

## Testing

- Unit tests cover all status types and utility functions
- Visual testing through development server
- TypeScript compilation verification
- Build process validation

## Future Enhancements

Potential improvements for future versions:

1. **Real-time Updates** - WebSocket integration for live status updates
2. **Custom Status Types** - Allow applications to define custom statuses
3. **Batch Status Updates** - Efficiently update multiple elements
4. **Status History** - Track data freshness over time
5. **Integration Alerts** - Notify when data becomes stale
6. **API Integration** - Automatic status detection from data sources

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design for all screen sizes
- Graceful degradation for older browsers
