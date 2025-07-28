'use client';

import React, { useState, useCallback } from 'react';
import { DashboardElement, ChartData, TableData, SummaryCardData, VisualizationType } from '../types/dashboard';
import DynamicChart from './DynamicChart';
import DataTable from './DataTable';
import { SummaryCardGrid } from './SummaryCard';
import { convertVisualizationData } from '../utils/dataConverter';
import { visualizationPreferences } from '../utils/localStorage';
import { useDashboard } from '../context/DashboardContext';

interface DynamicElementRendererProps {
  element: DashboardElement;
  onRemove: (id: string) => void;
}

export default function DynamicElementRenderer({ element, onRemove }: DynamicElementRendererProps) {
  const { updateElement } = useDashboard();
  const [isChangingVisualization, setIsChangingVisualization] = useState(false);

  const handleRemove = () => {
    onRemove(element.id);
  };

  const handleVisualizationChange = useCallback(async (newVisualization: VisualizationType) => {
    if (newVisualization.id === element.type) {
      return; // No change needed
    }

    setIsChangingVisualization(true);

    try {
      // Check if element has data to convert
      if (!element.data) {
        console.warn('No data available for visualization conversion');
        return;
      }

      // Convert the existing data to the new visualization format
      const convertedData = convertVisualizationData(
        element.data,
        element.type,
        newVisualization.id,
        element.dataType
      );

      if (convertedData) {
        // Update the element with new type and converted data
        updateElement(element.id, {
          type: newVisualization.id,
          data: convertedData,
        });

        // Save user preference for this element
        visualizationPreferences.save(element.id, newVisualization.id);
      }
    } catch (error) {
      console.error('Failed to change visualization type:', error);
    } finally {
      // Add a small delay for smooth transition
      setTimeout(() => {
        setIsChangingVisualization(false);
      }, 300);
    }
  }, [element, updateElement]);

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
          dataType={element.dataType}
          onRemove={handleRemove}
          onVisualizationChange={handleVisualizationChange}
          config={element.config}
          isChangingVisualization={isChangingVisualization}
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
          dataType={element.dataType}
          onRemove={handleRemove}
          onVisualizationChange={handleVisualizationChange}
          isChangingVisualization={isChangingVisualization}
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
          dataType={element.dataType}
          onRemove={handleRemove}
          onVisualizationChange={handleVisualizationChange}
          isChangingVisualization={isChangingVisualization}
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
