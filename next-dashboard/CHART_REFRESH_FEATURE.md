# Chart Refresh Feature

This document describes the manual chart refresh functionality added to the Finance Factors Dashboard.

## Overview

The chart refresh feature allows users to manually refresh charts without reloading the entire page or fetching new data from the server. This provides a smooth user experience with visual feedback during the refresh process.

## Implementation

### Components Modified

1. **LazyChart.tsx** - Enhanced with refresh functionality
2. **LazyChart.module.css** - New CSS styles for the refresh button and animations
3. **RefreshableChart.tsx** - Advanced version with data refresh capabilities

### Features

#### Basic Refresh (LazyChart.tsx)
- **Manual Refresh Button**: Clickable button to refresh the chart
- **Visual Feedback**: Spinning animation during refresh
- **Chart Re-rendering**: Uses Chart.js `update('active')` method for smooth animation
- **Responsive Design**: Button adapts to mobile screens

#### Advanced Refresh (RefreshableChart.tsx)
- **Data Refresh Support**: Optional `onRefresh` callback for fetching new data
- **Auto-refresh**: Optional automatic refresh at specified intervals
- **Last Updated Timestamp**: Shows when the chart was last refreshed
- **Error Handling**: Graceful error handling during refresh operations

## Usage

### Basic Usage (Current Implementation)

The existing `LazyChart` component now includes a refresh button:

```tsx
<LazyChart data={priceData} title="Average House Price Over Time" />
```

### Advanced Usage (Optional)

For charts that need to fetch new data:

```tsx
import RefreshableChart from './components/RefreshableChart';

// Example with data refresh
const fetchNewData = async () => {
  const response = await fetch('/api/chart-data');
  return response.json();
};

<RefreshableChart 
  data={initialData} 
  title="Live Data Chart"
  onRefresh={fetchNewData}
  refreshInterval={30} // Auto-refresh every 30 seconds
/>
```

## Technical Details

### Chart.js Integration

The refresh functionality uses Chart.js's built-in update methods:

- `chart.update('active')` - Smooth animation update
- `chart.update('resize')` - Alternative update mode
- Animation duration: 750ms with easeInOutQuart easing

### CSS Classes

New CSS classes in `LazyChart.module.css`:

- `.refreshButton` - Main button styling
- `.refreshIcon` - Icon styling and spin animation
- `.spinning` - Applied during refresh for rotation animation
- `.chartContainer` - Container with improved spacing
- `.chartHeader` - Flex layout for title and button
- `.chartWrapper` - Chart container with shadow and padding

### Performance Considerations

- **Lazy Loading**: Chart components remain lazy-loaded
- **Animation Throttling**: 300ms delay prevents rapid clicking
- **Memory Management**: Auto-refresh intervals are properly cleaned up
- **Error Boundaries**: Refresh errors are caught and logged

## Browser Compatibility

- **Modern Browsers**: Full support for CSS animations and async/await
- **Mobile Responsive**: Touch-friendly button sizing
- **Dark Mode**: Automatic adaptation to system color scheme

## Future Enhancements

Potential improvements for the refresh feature:

1. **Refresh Strategies**: Different refresh modes (data only, visual only, full refresh)
2. **Progress Indicators**: More detailed loading states
3. **Keyboard Shortcuts**: Hotkey support for refresh (e.g., Ctrl+R)
4. **Batch Refresh**: Refresh multiple charts simultaneously
5. **Smart Refresh**: Only refresh when data has actually changed
6. **Offline Support**: Queue refresh requests when offline

## Testing

To test the refresh functionality:

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Click the "Refresh Chart" button on any chart
4. Observe the spinning animation and smooth chart re-rendering

## API Reference

### LazyChart Props

```tsx
interface LazyChartProps {
  data: ChartData;
  title: string;
}
```

### RefreshableChart Props

```tsx
interface RefreshableChartProps {
  data: ChartData;
  title: string;
  onRefresh?: () => Promise<ChartData> | ChartData;
  refreshInterval?: number; // seconds
}
```

### ChartData Interface

```tsx
interface ChartData {
  labels: number[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }>;
}
```
