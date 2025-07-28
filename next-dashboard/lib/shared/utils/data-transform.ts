/**
 * Shared Data Transformation Utilities
 * 
 * Pure functions for transforming data between different formats
 */

import type { ChartData, TableData, SummaryCardData, StandardDataPoint } from '../types';
import { CHART_COLORS } from '../constants';

/**
 * Transform standard data points to Chart.js format
 */
export function transformToChartData(
  dataPoints: StandardDataPoint[],
  label: string = 'Data',
  options?: {
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut';
    colorIndex?: number;
  }
): ChartData {
  const { chartType = 'line', colorIndex = 0 } = options || {};
  
  const labels = dataPoints.map(point => point.date);
  const data = dataPoints.map(point => point.value);
  
  const dataset = {
    label,
    data,
    borderColor: CHART_COLORS.primary[colorIndex % CHART_COLORS.primary.length],
    backgroundColor: chartType === 'pie' || chartType === 'doughnut' 
      ? CHART_COLORS.primary 
      : CHART_COLORS.background[colorIndex % CHART_COLORS.background.length],
    borderWidth: chartType === 'line' ? 2 : 1,
    fill: chartType === 'line' ? false : true,
  };
  
  return {
    labels,
    datasets: [dataset],
  };
}

/**
 * Transform Chart.js data to table format
 */
export function chartDataToTableData(chartData: ChartData): TableData {
  const columns = [
    { key: 'label', label: 'Date/Label', type: 'string' as const, sortable: true },
    ...chartData.datasets.map((dataset, index) => ({
      key: `value_${index}`,
      label: dataset.label,
      type: 'number' as const,
      sortable: true,
    })),
  ];
  
  const rows = chartData.labels.map((label, index) => {
    const row: Record<string, string | number> = {
      label: String(label),
    };
    
    chartData.datasets.forEach((dataset, datasetIndex) => {
      row[`value_${datasetIndex}`] = dataset.data[index] ?? 0;
    });
    
    return row;
  });
  
  return {
    columns,
    rows,
    isRealData: chartData.isRealData,
    lastUpdated: chartData.lastUpdated,
    dataSource: chartData.dataSource,
  };
}

/**
 * Transform table data to Chart.js format
 */
export function tableDataToChartData(tableData: TableData): ChartData {
  // Find the label column (first string column)
  const labelColumn = tableData.columns.find(col => col.type === 'string');
  if (!labelColumn) {
    throw new Error('Table data must have at least one string column for labels');
  }
  
  // Find numeric columns for datasets
  const numericColumns = tableData.columns.filter(col => col.type === 'number');
  if (numericColumns.length === 0) {
    throw new Error('Table data must have at least one numeric column');
  }
  
  const labels = tableData.rows.map(row => String(row[labelColumn.key] || ''));
  
  const datasets = numericColumns.map((column, index) => ({
    label: column.label,
    data: tableData.rows.map(row => {
      const value = row[column.key];
      return typeof value === 'number' ? value : null;
    }),
    borderColor: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
    backgroundColor: CHART_COLORS.background[index % CHART_COLORS.background.length],
  }));
  
  return {
    labels,
    datasets,
    isRealData: tableData.isRealData,
    lastUpdated: tableData.lastUpdated,
    dataSource: tableData.dataSource,
  };
}

/**
 * Transform Chart.js data to summary cards
 */
export function chartDataToSummaryCards(
  chartData: ChartData,
  dataType: string
): SummaryCardData[] {
  return chartData.datasets.map((dataset, index) => {
    const values = dataset.data.filter((val): val is number => val !== null);
    const latestValue = values[values.length - 1] || 0;
    const previousValue = values[values.length - 2] || latestValue;
    const change = latestValue - previousValue;
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
    
    return {
      title: dataset.label,
      value: latestValue,
      change: {
        value: changePercent,
        period: 'vs previous',
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      },
      trend: values.slice(-10).map((value, idx) => ({
        date: String(chartData.labels[chartData.labels.length - 10 + idx] || idx),
        value,
      })),
      isRealData: chartData.isRealData,
      lastUpdated: chartData.lastUpdated,
      dataSource: chartData.dataSource,
    };
  });
}

/**
 * Transform summary cards to Chart.js data
 */
export function summaryCardsToChartData(cards: SummaryCardData[]): ChartData {
  const labels = cards.map(card => card.title);
  const data = cards.map(card => typeof card.value === 'number' ? card.value : 0);
  
  return {
    labels,
    datasets: [{
      label: 'Values',
      data,
      backgroundColor: CHART_COLORS.primary,
      borderColor: CHART_COLORS.primary[0],
      borderWidth: 1,
    }],
  };
}

/**
 * Validate and sanitize data points
 */
export function validateDataPoints(data: unknown[]): StandardDataPoint[] {
  return data
    .filter((item): item is Record<string, unknown> => 
      typeof item === 'object' && item !== null
    )
    .map((item, index) => ({
      date: String(item.date || item.x || index),
      value: Number(item.value || item.y || 0),
      label: item.label ? String(item.label) : undefined,
    }))
    .filter(point => !isNaN(point.value));
}

/**
 * Calculate basic statistics for a dataset
 */
export function calculateStatistics(values: number[]) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      sum: 0,
      count: 0,
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median,
    sum,
    count: values.length,
  };
}
