export interface ChartData {
  labels: (string | number)[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string | string[];
    backgroundColor?: string | string[];
    [key: string]: unknown;
  }>;
  // Data status metadata
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}

// Data type categories for financial data
export interface DataType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'financial' | 'economic' | 'personal';
}

// Visualization type for dashboard elements
export interface VisualizationType {
  id: 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart' | 'data-table' | 'summary-card';
  name: string;
  description: string;
  icon: string;
  category: 'chart' | 'data' | 'widget';
  suitableFor: string[]; // Data types this visualization works well with
}

export interface DashboardElement {
  id: string;
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart' | 'data-table' | 'summary-card';
  dataType: string; // References DataType.id
  title: string;
  data?: ChartData | TableData | SummaryCardData[];
  config?: Record<string, unknown>;
  position?: {
    row: number;
    col: number;
  };
  // Data status metadata
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardState {
  elements: DashboardElement[];
  layout: 'grid' | 'stack';
  isLoading: boolean;
  error?: string;
}

export type DashboardAction =
  | { type: 'ADD_ELEMENT'; payload: DashboardElement }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<DashboardElement> } }
  | { type: 'REORDER_ELEMENTS'; payload: DashboardElement[] }
  | { type: 'SET_LAYOUT'; payload: 'grid' | 'stack' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined };

export interface SummaryCardData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon?: string;
  color?: string;
  // Data status metadata
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'percentage';
  sortable?: boolean;
}

export interface TableData {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  // Data status metadata
  isRealData?: boolean;
  lastUpdated?: Date;
  dataSource?: string;
}
