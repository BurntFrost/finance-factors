// Frontend barrel exports
// This file provides centralized exports for all frontend modules

// Components
export * from './components/AutomaticChart';
export * from './components/DataSourceIndicator';
// Export DataStatusPill with explicit exports to avoid conflicts
export { default as DataStatusPill, getDataStatus as getDataStatusFromPill } from './components/DataStatusPill';
export type { DataStatus as DataStatusPillType } from './components/DataStatusPill';

export * from './components/DragDropDashboard';
export * from './components/DynamicElementRenderer';
export * from './components/EnhancedInteractiveChart';
export * from './components/ExportMenu';
export * from './components/RealTimeStatusIndicator';
export * from './components/ResizableChartContainer';
export * from './components/DataTable';
export * from './components/SummaryCard';
export * from './components/ChartSkeleton';
export * from './components/IsolationTestComponent';
export * from './components/DataComparisonTool';
export * from './components/DashboardCustomizationPanel';

// UI Components
export * from './components/ui/alert';
export * from './components/ui/badge';
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/chart-card';
export * from './components/ui/financial-card';
export * from './components/ui/input';
export * from './components/ui/modern-refresh-button';

// Export ModernStatusPill with explicit exports to avoid conflicts
export { ModernStatusPill, getDataStatus as getModernDataStatus } from './components/ui/modern-status-pill';
export type { DataStatus as ModernDataStatus } from './components/ui/modern-status-pill';
export * from './components/ui/modern-toggle';
export * from './components/ui/progress';
export * from './components/ui/select';
export * from './components/ui/separator';
export * from './components/ui/skeleton';
export * from './components/ui/switch';
export * from './components/ui/table-card';

// Context Providers
export { AutomaticDataSourceProvider, useAutomaticDataSource as useAutomaticDataSourceContext } from './context/AutomaticDataSourceContext';
export * from './context/CrossfilterContext';
export * from './context/DashboardContext';
export * from './context/DataSourceContext';
export * from './context/ExtendedDataSourceContext';
export * from './context/ViewModeContext';

// Hooks
export * from './hooks/useAutomaticDataSource';
export * from './hooks/useChartDataSource';
export * from './hooks/useDataSource';
export * from './hooks/useIsolatedDataSource';

// Utilities
export * from './lib/utils';
