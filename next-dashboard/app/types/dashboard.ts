export interface ChartData {
  labels: (string | number)[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string | string[];
    backgroundColor?: string | string[];
    [key: string]: unknown;
  }>;
}

export interface DashboardElement {
  id: string;
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart' | 'data-table' | 'summary-card';
  title: string;
  data?: ChartData | TableData | SummaryCardData[];
  config?: Record<string, unknown>;
  position?: {
    row: number;
    col: number;
  };
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
}
