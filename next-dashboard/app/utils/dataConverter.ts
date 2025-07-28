/**
 * Data Converter Utilities
 *
 * This module provides utilities to convert data between different visualization formats
 * while preserving the underlying information and metadata.
 */

import { ChartData, TableData, SummaryCardData, TableColumn } from '../types/dashboard';
import { generateHistoricalDataByType } from './historicalDataGenerators';

// Color palettes for consistent styling
const CHART_COLORS = {
  primary: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)', 'rgba(54,162,235,1)', 'rgba(255,206,86,1)', 'rgba(153,102,255,1)'],
  background: ['rgba(75,192,192,0.2)', 'rgba(255,99,132,0.2)', 'rgba(54,162,235,0.2)', 'rgba(255,206,86,0.2)', 'rgba(153,102,255,0.2)'],
};

/**
 * Convert ChartData to TableData
 */
export function chartDataToTableData(chartData: ChartData): TableData {
  const columns: TableColumn[] = [
    { key: 'label', label: 'Period', type: 'text', sortable: true }
  ];

  // Add columns for each dataset
  chartData.datasets.forEach((dataset, index) => {
    columns.push({
      key: `dataset_${index}`,
      label: dataset.label || `Series ${index + 1}`,
      type: 'number',
      sortable: true
    });
  });

  // Create rows by combining labels with dataset values
  const rows = chartData.labels.map((label, labelIndex) => {
    const row: Record<string, unknown> = {
      label: label
    };

    chartData.datasets.forEach((dataset, datasetIndex) => {
      row[`dataset_${datasetIndex}`] = dataset.data[labelIndex] ?? null;
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
 * Convert ChartData to SummaryCardData array
 */
export function chartDataToSummaryCards(chartData: ChartData, dataType: string): SummaryCardData[] {
  const cards: SummaryCardData[] = [];

  chartData.datasets.forEach((dataset, index) => {
    const values = dataset.data.filter((val): val is number => val !== null);
    if (values.length === 0) return;

    const latestValue = values[values.length - 1];
    const previousValue = values.length > 1 ? values[values.length - 2] : null;
    
    let change: SummaryCardData['change'] = undefined;
    if (previousValue !== null && previousValue !== 0) {
      const changePercent = ((latestValue - previousValue) / previousValue) * 100;
      change = {
        value: Math.round(changePercent * 10) / 10,
        type: changePercent > 0 ? 'increase' : changePercent < 0 ? 'decrease' : 'neutral',
        period: 'vs previous'
      };
    }

    cards.push({
      title: dataset.label || `Metric ${index + 1}`,
      value: formatValueForDataType(latestValue, dataType),
      change,
      icon: getIconForDataType(dataType),
      color: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
      isRealData: chartData.isRealData,
      lastUpdated: chartData.lastUpdated,
      dataSource: chartData.dataSource,
    });
  });

  return cards;
}

/**
 * Convert TableData to ChartData
 */
export function tableDataToChartData(tableData: TableData): ChartData {
  if (tableData.rows.length === 0 || tableData.columns.length === 0) {
    return createEmptyChartData(tableData);
  }

  // Find the label column (first text column or first column)
  const labelColumn = tableData.columns.find(col => col.type === 'text') || tableData.columns[0];
  
  // Find numeric columns for datasets
  const numericColumns = tableData.columns.filter(col => 
    col.key !== labelColumn.key && (col.type === 'number' || col.type === 'currency' || col.type === 'percentage')
  );

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
 * Convert TableData to SummaryCardData array
 */
export function tableDataToSummaryCards(tableData: TableData, dataType: string): SummaryCardData[] {
  if (tableData.rows.length === 0) {
    return [];
  }

  const cards: SummaryCardData[] = [];
  const numericColumns = tableData.columns.filter(col => 
    col.type === 'number' || col.type === 'currency' || col.type === 'percentage'
  );

  numericColumns.forEach((column, index) => {
    const values = tableData.rows
      .map(row => row[column.key])
      .filter((val): val is number => typeof val === 'number');

    if (values.length === 0) return;

    const latestValue = values[values.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;

    cards.push({
      title: column.label,
      value: formatValueForDataType(latestValue, dataType),
      change: {
        value: Math.round(((latestValue - average) / average) * 1000) / 10,
        type: latestValue > average ? 'increase' : latestValue < average ? 'decrease' : 'neutral',
        period: 'vs average'
      },
      icon: getIconForDataType(dataType),
      color: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
      isRealData: tableData.isRealData,
      lastUpdated: tableData.lastUpdated,
      dataSource: tableData.dataSource,
    });
  });

  return cards;
}

/**
 * Convert SummaryCardData array to ChartData
 */
export function summaryCardsToChartData(cards: SummaryCardData[]): ChartData {
  if (cards.length === 0) {
    return createEmptyChartData();
  }

  const labels = cards.map(card => card.title);
  const values = cards.map(card => {
    const value = card.value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Try to extract numeric value from formatted strings
      const numericMatch = value.match(/[\d,]+\.?\d*/);
      return numericMatch ? parseFloat(numericMatch[0].replace(/,/g, '')) : 0;
    }
    return 0;
  });

  return {
    labels,
    datasets: [{
      label: 'Values',
      data: values,
      borderColor: CHART_COLORS.primary[0],
      backgroundColor: CHART_COLORS.background[0],
    }],
    isRealData: cards[0]?.isRealData,
    lastUpdated: cards[0]?.lastUpdated,
    dataSource: cards[0]?.dataSource,
  };
}

/**
 * Convert SummaryCardData array to TableData
 */
export function summaryCardsToTableData(cards: SummaryCardData[]): TableData {
  const columns: TableColumn[] = [
    { key: 'title', label: 'Metric', type: 'text', sortable: true },
    { key: 'value', label: 'Value', type: 'text', sortable: true },
    { key: 'change', label: 'Change', type: 'text', sortable: true },
  ];

  const rows = cards.map(card => ({
    title: card.title,
    value: card.value,
    change: card.change ? `${card.change.value > 0 ? '+' : ''}${card.change.value}% ${card.change.period}` : '-',
  }));

  return {
    columns,
    rows,
    isRealData: cards[0]?.isRealData,
    lastUpdated: cards[0]?.lastUpdated,
    dataSource: cards[0]?.dataSource,
  };
}

// Helper functions
function createEmptyChartData(sourceData?: { isRealData?: boolean; lastUpdated?: Date; dataSource?: string }): ChartData {
  return {
    labels: [],
    datasets: [],
    isRealData: sourceData?.isRealData,
    lastUpdated: sourceData?.lastUpdated,
    dataSource: sourceData?.dataSource,
  };
}

function formatValueForDataType(value: number, dataType: string): string | number {
  // Format based on data type context
  if (dataType.includes('price') || dataType.includes('cost') || dataType.includes('income')) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  if (dataType.includes('rate') || dataType.includes('inflation')) {
    return `${value.toFixed(2)}%`;
  }

  return value;
}

function getIconForDataType(dataType: string): string {
  const iconMap: Record<string, string> = {
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
    'inflation-cpi': '📊',
    'core-inflation': '📉',
    'fed-balance-sheet': '🏦',
    'federal-funds-rate': '💹',
    'unemployment-rate': '👥',
    'gdp-growth': '🌟',
    'money-supply-m1': '💵',
    'money-supply-m2': '💴',
    'treasury-10y': '📋',
    'treasury-2y': '📄',
  };

  return iconMap[dataType] || '📊';
}

/**
 * Main conversion function that handles all format transformations
 */
export function convertVisualizationData(
  data: ChartData | TableData | SummaryCardData[],
  fromType: string,
  toType: string,
  dataType: string
): ChartData | TableData | SummaryCardData[] | null {
  // If converting to the same type, return the data as-is
  if (fromType === toType) {
    return data;
  }

  try {
    // Handle ChartData conversions
    if (fromType === 'line-chart' || fromType === 'bar-chart' || fromType === 'pie-chart' || fromType === 'doughnut-chart') {
      const chartData = data as ChartData;
      
      if (toType === 'data-table') {
        return chartDataToTableData(chartData);
      } else if (toType === 'summary-card') {
        return chartDataToSummaryCards(chartData, dataType);
      } else if (toType === 'line-chart' || toType === 'bar-chart' || toType === 'pie-chart' || toType === 'doughnut-chart') {
        return chartData; // Same format, different chart type
      }
    }

    // Handle TableData conversions
    if (fromType === 'data-table') {
      const tableData = data as TableData;
      
      if (toType === 'line-chart' || toType === 'bar-chart' || toType === 'pie-chart' || toType === 'doughnut-chart') {
        return tableDataToChartData(tableData);
      } else if (toType === 'summary-card') {
        return tableDataToSummaryCards(tableData, dataType);
      }
    }

    // Handle SummaryCardData conversions
    if (fromType === 'summary-card') {
      const cardData = data as SummaryCardData[];
      
      if (toType === 'line-chart' || toType === 'bar-chart' || toType === 'pie-chart' || toType === 'doughnut-chart') {
        return summaryCardsToChartData(cardData);
      } else if (toType === 'data-table') {
        return summaryCardsToTableData(cardData);
      }
    }

    // If no conversion is possible, generate new data
    return generateHistoricalDataByType(dataType, toType);
  } catch (error) {
    console.error('Error converting visualization data:', error);
    // Fallback to generating new data
    return generateHistoricalDataByType(dataType, toType);
  }
}
