'use client';

import React, { useState, useCallback } from 'react';
import { DashboardElement, ChartData, TableData, SummaryCardData, VisualizationType } from '@/shared/types/dashboard';
// import DynamicChart from './DynamicChart'; // Replaced by EnhancedInteractiveChart
import EnhancedInteractiveChart from './EnhancedInteractiveChart';
import AutomaticChart from './AutomaticChart';
import DataTable from './DataTable';
import { SummaryCardGrid } from './SummaryCard';
import { convertVisualizationData } from '@/shared/utils/dataConverter';
import { visualizationPreferences } from '@/shared/utils/localStorage';
import { useDashboard } from '@/frontend/context/DashboardContext';
import { useCrossfilter } from '@/frontend/context/CrossfilterContext';

interface DynamicElementRendererProps {
  element: DashboardElement;
  onRemove: (id: string) => void;
}

export default function DynamicElementRenderer({ element, onRemove }: DynamicElementRendererProps) {
  const { updateElement } = useDashboard();
  const _crossfilter = useCrossfilter();
  const [isChangingVisualization, setIsChangingVisualization] = useState(false);

  const handleRemove = () => {
    onRemove(element.id);
  };

  // Handler for data point interactions
  const handleDataPointClick = useCallback((dataPoint: any) => {
    console.log('Data point clicked:', dataPoint, 'in element:', element.id);
    // Could trigger crossfilter updates or detailed views
  }, [element.id]);

  // Handler for data point selection (for crossfilter)
  const handleDataPointSelect = useCallback((selectedPoints: any[]) => {
    console.log('Data points selected:', selectedPoints, 'in element:', element.id);
    // Could apply crossfilter based on selection
  }, [element.id]);

  // Handler for export completion
  const _handleExportComplete = useCallback((format: string) => {
    console.log(`Export completed: ${format} for element ${element.id}`);
    // Could show success notification
  }, [element.id]);

  const handleVisualizationChange = useCallback(async (newVisualization: VisualizationType) => {
    if (newVisualization.id === element.type) {
      return; // No change needed
    }

    const previousType = element.type;
    const previousData = element.data;
    setIsChangingVisualization(true);

    try {
      // Validate the new visualization type
      if (!newVisualization.id || !newVisualization.name) {
        throw new Error('Invalid visualization type provided');
      }

      // Check if element has data to convert
      if (!element.data) {
        console.warn('No data available for visualization conversion');
        // For elements without data, just update the type
        updateElement(element.id, {
          type: newVisualization.id,
        });
        visualizationPreferences.save(element.id, newVisualization.id);
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
      } else {
        throw new Error('Data conversion failed - no converted data returned');
      }
    } catch (error) {
      console.error('Failed to change visualization type:', error);

      // Attempt to revert to previous state on error
      try {
        updateElement(element.id, {
          type: previousType,
          data: previousData,
        });
        console.log('Successfully reverted to previous visualization type');
      } catch (revertError) {
        console.error('Failed to revert visualization type:', revertError);
      }

      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        console.warn(`Unable to switch to ${newVisualization.name}. The change has been reverted.`);
      }
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
      // For elements without data (like hardcoded charts), use AutomaticChart
      if (!element.data) {
        return (
          <AutomaticChart
            dataType={element.dataType}
            title={element.title}
            chartType={element.type.replace('-chart', '') as 'line' | 'bar' | 'pie' | 'doughnut'}
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
            onRemove={handleRemove}
            showVisualizationSwitcher={true}
            onVisualizationChange={(newType) => {
              handleVisualizationChange({
                id: `${newType}-chart` as VisualizationType['id'],
                name: newType.charAt(0).toUpperCase() + newType.slice(1) + ' Chart',
                icon: '📊',
                description: `${newType.charAt(0).toUpperCase() + newType.slice(1)} chart visualization`,
                category: 'chart',
                suitableFor: ['time-series', 'categorical']
              });
            }}
            enableRealTime={true}
            showRealTimeIndicator={true}
            // Enhanced interactive features enabled by default
            enableZoom={true}
            enablePan={true}
            enableCrossfilter={false}
            showInteractiveControls={true}
            onDataPointClick={(dataPoint, chart) => {
              console.log('Data point clicked:', dataPoint, chart);
              // Could add custom click handling here
            }}
          />
        );
      }

      // For elements with data, use AutomaticChart with fallback data
      if (!isChartData(element.data)) {
        return <div>No chart data available</div>;
      }
      return (
        <AutomaticChart
          dataType={element.dataType}
          title={element.title}
          chartType={element.type.replace('-chart', '') as 'line' | 'bar' | 'pie' | 'doughnut'}
          height={400}
          showIndicator={true}
          indicatorPosition="top-right"
          refreshInterval={15 * 60 * 1000} // 15 minutes
          fallbackData={element.data} // Use element data as fallback
          onRemove={handleRemove}
          showVisualizationSwitcher={true}
          onVisualizationChange={(newType) => {
            handleVisualizationChange({
              id: `${newType}-chart` as VisualizationType['id'],
              name: newType.charAt(0).toUpperCase() + newType.slice(1) + ' Chart',
              icon: '📊',
              description: `${newType.charAt(0).toUpperCase() + newType.slice(1)} chart visualization`,
              category: 'chart',
              suitableFor: ['time-series', 'categorical']
            });
          }}
          enableRealTime={true}
          showRealTimeIndicator={true}
          // Enhanced interactive features enabled by default
          enableZoom={true}
          enablePan={true}
          enableCrossfilter={true}
          showInteractiveControls={true}
          onDataPointClick={(dataPoint, chart) => {
            console.log('Data point clicked:', dataPoint, chart);
            if (handleDataPointClick) {
              handleDataPointClick(dataPoint);
            }
          }}
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
