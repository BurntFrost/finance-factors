/**
 * Data Transformers
 * 
 * This module provides utilities to transform API responses into consistent
 * ChartData format that matches the existing sample data structure.
 */

import { ChartData, SummaryCardData, TableData } from '../types/dashboard';

// Color palettes for charts (matching existing sample data)
const CHART_COLORS = {
  primary: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)', 'rgba(54,162,235,1)', 'rgba(255,206,86,1)', 'rgba(153,102,255,1)'],
  background: ['rgba(75,192,192,0.2)', 'rgba(255,99,132,0.2)', 'rgba(54,162,235,0.2)', 'rgba(255,206,86,0.2)', 'rgba(153,102,255,0.2)'],
};

// Generic API response interfaces
interface ApiTimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

interface ApiDataPoint {
  name: string;
  value: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

interface ApiTableRow {
  [key: string]: string | number | boolean;
}

// Base transformer class
abstract class BaseTransformer<TInput, TOutput> {
  abstract transform(input: TInput, dataType: string): TOutput;
  
  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  }
  
  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  protected formatPercentage(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }
  
  protected getColorForIndex(index: number): { border: string; background: string } {
    const colorIndex = index % CHART_COLORS.primary.length;
    return {
      border: CHART_COLORS.primary[colorIndex],
      background: CHART_COLORS.background[colorIndex],
    };
  }
}

// Chart data transformer
class ChartDataTransformer extends BaseTransformer<ApiTimeSeriesData[], ChartData> {
  transform(input: ApiTimeSeriesData[], dataType: string): ChartData {
    if (!Array.isArray(input) || input.length === 0) {
      return this.createEmptyChartData(dataType);
    }
    
    // Sort by date
    const sortedData = input.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Extract labels and data
    const labels = sortedData.map(item => this.formatDate(item.date));
    const values = sortedData.map(item => item.value);
    
    // Get dataset configuration based on data type
    const datasetConfig = this.getDatasetConfig(dataType);
    const colors = this.getColorForIndex(0);
    
    return {
      labels,
      datasets: [
        {
          label: datasetConfig.label,
          data: values,
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
      ],
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    };
  }
  
  private createEmptyChartData(dataType: string): ChartData {
    const config = this.getDatasetConfig(dataType);
    return {
      labels: [],
      datasets: [
        {
          label: config.label,
          data: [],
          borderColor: CHART_COLORS.primary[0],
          backgroundColor: CHART_COLORS.background[0],
        },
      ],
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    };
  }
  
  private getDatasetConfig(dataType: string): { label: string } {
    const configs: Record<string, { label: string }> = {
      'house-prices': { label: 'Average House Price (USD)' },
      'salary-income': { label: 'Average Household Income (USD)' },
      'cost-of-living': { label: 'Cost of Living Index' },
      'tuition-education': { label: 'Average Tuition Cost (USD)' },
      'medical-costs': { label: 'Average Medical Costs (USD)' },
      'childcare-costs': { label: 'Average Childcare Costs (USD)' },
      'transportation-costs': { label: 'Average Transportation Costs (USD)' },
      'food-prices': { label: 'Food Price Index' },
      'utilities-costs': { label: 'Average Utility Costs (USD)' },
      'investment-returns': { label: 'Investment Returns (%)' },
    };
    
    return configs[dataType] || { label: 'Value' };
  }
}

// Multi-series chart data transformer
class MultiSeriesChartDataTransformer extends BaseTransformer<Record<string, ApiTimeSeriesData[]>, ChartData> {
  transform(input: Record<string, ApiTimeSeriesData[]>, dataType: string): ChartData {
    const seriesNames = Object.keys(input);
    if (seriesNames.length === 0) {
      return this.createEmptyMultiSeriesChartData(dataType);
    }
    
    // Get all unique dates and sort them
    const allDates = new Set<string>();
    Object.values(input).forEach(series => {
      series.forEach(item => allDates.add(item.date));
    });
    const sortedDates = Array.from(allDates).sort();
    
    // Create labels
    const labels = sortedDates.map(date => this.formatDate(date));
    
    // Create datasets
    const datasets = seriesNames.map((seriesName, index) => {
      const colors = this.getColorForIndex(index);
      const seriesData = input[seriesName];
      
      // Create data array with values for each date
      const data = sortedDates.map(date => {
        const dataPoint = seriesData.find(item => item.date === date);
        return dataPoint ? dataPoint.value : null;
      });
      
      return {
        label: seriesName,
        data,
        borderColor: colors.border,
        backgroundColor: colors.background,
      };
    });
    
    return {
      labels,
      datasets,
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    };
  }
  
  private createEmptyMultiSeriesChartData(dataType: string): ChartData {
    return {
      labels: [],
      datasets: [],
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    };
  }
}

// Table data transformer
class TableDataTransformer extends BaseTransformer<ApiTableRow[], TableData> {
  transform(input: ApiTableRow[], dataType: string): TableData {
    if (!Array.isArray(input) || input.length === 0) {
      return this.createEmptyTableData(dataType);
    }
    
    // Get column configuration based on data type
    const columnConfig = this.getColumnConfig(dataType);
    
    // Transform rows
    const rows = input.map(row => {
      const transformedRow: Record<string, unknown> = {};
      columnConfig.forEach(col => {
        transformedRow[col.key] = row[col.key] || '';
      });
      return transformedRow;
    });
    
    return {
      columns: columnConfig,
      rows,
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    };
  }
  
  private createEmptyTableData(dataType: string): TableData {
    return {
      columns: this.getColumnConfig(dataType),
      rows: [],
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    };
  }
  
  private getColumnConfig(dataType: string) {
    const configs: Record<string, Array<{ key: string; label: string; type: 'text' | 'number' | 'currency' | 'percentage'; sortable: boolean }>> = {
      'house-prices': [
        { key: 'region', label: 'Region', type: 'text', sortable: true },
        { key: 'avgPrice', label: 'Avg Price', type: 'currency', sortable: true },
        { key: 'medianPrice', label: 'Median Price', type: 'currency', sortable: true },
        { key: 'change', label: 'YoY Change (%)', type: 'percentage', sortable: true },
      ],
      'salary-income': [
        { key: 'occupation', label: 'Occupation', type: 'text', sortable: true },
        { key: 'avgSalary', label: 'Avg Salary', type: 'currency', sortable: true },
        { key: 'medianSalary', label: 'Median Salary', type: 'currency', sortable: true },
        { key: 'change', label: 'YoY Change (%)', type: 'percentage', sortable: true },
      ],
    };
    
    return configs[dataType] || [
      { key: 'name', label: 'Name', type: 'text' as const, sortable: true },
      { key: 'value', label: 'Value', type: 'number' as const, sortable: true },
    ];
  }
}

// Summary card data transformer
class SummaryCardDataTransformer extends BaseTransformer<ApiDataPoint[], SummaryCardData[]> {
  transform(input: ApiDataPoint[], dataType: string): SummaryCardData[] {
    if (!Array.isArray(input) || input.length === 0) {
      return this.createEmptySummaryCards(dataType);
    }
    
    return input.map(item => ({
      title: item.name,
      value: this.formatValueByType(item.value, dataType),
      change: item.metadata?.change ? {
        value: item.metadata.change as number,
        type: (item.metadata.change as number) >= 0 ? 'increase' as const : 'decrease' as const,
        period: 'YoY',
      } : undefined,
      icon: this.getIconForDataType(dataType),
      color: this.getColorForDataType(dataType),
      isRealData: true,
      lastUpdated: new Date(),
      dataSource: 'Live API Data',
    }));
  }
  
  private createEmptySummaryCards(dataType: string): SummaryCardData[] {
    return [
      {
        title: 'No Data Available',
        value: 'N/A',
        icon: this.getIconForDataType(dataType),
        color: '#666',
        isRealData: true,
        lastUpdated: new Date(),
        dataSource: 'Live API Data',
      },
    ];
  }
  
  private formatValueByType(value: number, dataType: string): string {
    if (dataType.includes('price') || dataType.includes('cost') || dataType.includes('income') || dataType.includes('salary')) {
      return this.formatCurrency(value);
    }
    if (dataType.includes('return') || dataType.includes('change')) {
      return this.formatPercentage(value);
    }
    return value.toLocaleString();
  }
  
  private getIconForDataType(dataType: string): string {
    const icons: Record<string, string> = {
      'house-prices': '🏠',
      'salary-income': '💰',
      'cost-of-living': '🛒',
      'tuition-education': '🎓',
      'medical-costs': '🏥',
      'childcare-costs': '👶',
      'transportation-costs': '🚗',
      'food-prices': '🍎',
      'utilities-costs': '⚡',
      'investment-returns': '📈',
    };
    return icons[dataType] || '📊';
  }
  
  private getColorForDataType(dataType: string): string {
    const colors: Record<string, string> = {
      'house-prices': '#10b981',
      'salary-income': '#3b82f6',
      'cost-of-living': '#f59e0b',
      'tuition-education': '#8b5cf6',
      'medical-costs': '#ef4444',
      'childcare-costs': '#ec4899',
      'transportation-costs': '#06b6d4',
      'food-prices': '#84cc16',
      'utilities-costs': '#f97316',
      'investment-returns': '#6366f1',
    };
    return colors[dataType] || '#6b7280';
  }
}

// Factory function to get appropriate transformer
export function getTransformer(visualizationType: string) {
  switch (visualizationType) {
    case 'line-chart':
    case 'bar-chart':
      return new ChartDataTransformer();
    case 'pie-chart':
    case 'doughnut-chart':
      return new MultiSeriesChartDataTransformer();
    case 'data-table':
      return new TableDataTransformer();
    case 'summary-card':
      return new SummaryCardDataTransformer();
    default:
      return new ChartDataTransformer();
  }
}

// Convenience functions for common transformations
export const transformers = {
  chartData: new ChartDataTransformer(),
  multiSeriesChartData: new MultiSeriesChartDataTransformer(),
  tableData: new TableDataTransformer(),
  summaryCardData: new SummaryCardDataTransformer(),
};
