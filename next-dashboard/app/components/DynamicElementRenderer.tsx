'use client';

import React from 'react';
import { DashboardElement, ChartData, TableData, SummaryCardData } from '../types/dashboard';
import DynamicChart from './DynamicChart';
import DataTable from './DataTable';
import { SummaryCardGrid } from './SummaryCard';

interface DynamicElementRendererProps {
  element: DashboardElement;
  onRemove: (id: string) => void;
}

export default function DynamicElementRenderer({ element, onRemove }: DynamicElementRendererProps) {
  const handleRemove = () => {
    onRemove(element.id);
  };

  // Type guards
  const isChartData = (data: unknown): data is ChartData => {
    return !!(data && typeof data === 'object' && data !== null && 'labels' in data && 'datasets' in data);
  };

  const isTableData = (data: unknown): data is TableData => {
    return !!(data && typeof data === 'object' && data !== null && 'columns' in data && 'rows' in data);
  };

  const isSummaryCardData = (data: unknown): data is SummaryCardData[] => {
    return !!(Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'title' in data[0] && 'value' in data[0]);
  };

  switch (element.type) {
    case 'line-chart':
    case 'bar-chart':
    case 'pie-chart':
    case 'doughnut-chart':
      if (!element.data || !isChartData(element.data)) {
        return <div>No chart data available</div>;
      }
      return (
        <DynamicChart
          type={element.type}
          data={element.data}
          title={element.title}
          onRemove={handleRemove}
          config={element.config}
        />
      );

    case 'data-table':
      if (!element.data || !isTableData(element.data)) {
        return <div>No table data available</div>;
      }
      return (
        <DataTable
          title={element.title}
          data={element.data}
          onRemove={handleRemove}
        />
      );

    case 'summary-card':
      if (!element.data || !isSummaryCardData(element.data)) {
        return <div>No card data available</div>;
      }
      return (
        <SummaryCardGrid
          title={element.title}
          cards={element.data}
          onRemove={handleRemove}
        />
      );

    default:
      return (
        <div style={{ 
          padding: '2rem', 
          border: '2px dashed #ccc', 
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>Unknown element type: {element.type}</p>
          <button onClick={handleRemove}>Remove</button>
        </div>
      );
  }
}
