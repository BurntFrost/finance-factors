'use client';

import React, { useState } from 'react';
import AutomaticChart from '@/frontend/components/AutomaticChart';
// import EnhancedInteractiveChart from '@/frontend/components/EnhancedInteractiveChart'; // Will be used by DynamicElementRenderer
import DragDropDashboard from '@/frontend/components/DragDropDashboard';
import { ElementType } from '@/frontend/components/AddElementDropdown';
import DynamicElementRenderer from '@/frontend/components/DynamicElementRenderer';
import DashboardTabBar from '@/frontend/components/DashboardTabBar';
import DarkModeToggle from '@/frontend/components/DarkModeToggle';
import HydrationSafeWrapper from '@/frontend/components/HydrationSafeWrapper';
import ClientOnlyRealTimeFeatures from '@/frontend/components/ClientOnlyRealTimeFeatures';
import DashboardCustomizationPanel from '@/frontend/components/DashboardCustomizationPanel';
import { useDashboard } from '@/frontend/context/DashboardContext';
import { useViewMode } from '@/frontend/context/ViewModeContext';
// import { useCrossfilter } from '@/frontend/context/CrossfilterContext'; // Temporarily disabled
import { generateHistoricalData, generateElementTitle, generateHistoricalDataByType, generateElementTitleByType } from '@/shared/utils';
import { DataType, VisualizationType } from '@/shared/types/dashboard';
import styles from './page.module.css';

// Define the hardcoded charts
const HARDCODED_CHARTS = [
  { id: 'house-prices', dataType: 'house-prices', title: 'Average House Price Over Time' },
  { id: 'salary-income', dataType: 'salary-income', title: 'Average Household Income Over Time' },
  { id: 'inflation-cpi', dataType: 'inflation-cpi', title: 'Consumer Price Index (CPI)' },
  { id: 'core-inflation', dataType: 'core-inflation', title: 'Core Inflation Rate' },
  { id: 'fed-balance-sheet', dataType: 'fed-balance-sheet', title: 'Federal Reserve Balance Sheet' },
  { id: 'federal-funds-rate', dataType: 'federal-funds-rate', title: 'Federal Funds Rate' },
  { id: 'unemployment-rate', dataType: 'unemployment-rate', title: 'Unemployment Rate' },
  { id: 'gdp-growth', dataType: 'gdp-growth', title: 'GDP Growth Rate' },
  { id: 'money-supply-m1', dataType: 'money-supply-m1', title: 'Money Supply (M1)' },
  { id: 'money-supply-m2', dataType: 'money-supply-m2', title: 'Money Supply (M2)' },
  { id: 'treasury-10y', dataType: 'treasury-10y', title: '10-Year Treasury Yield' },
  { id: 'treasury-2y', dataType: 'treasury-2y', title: '2-Year Treasury Yield' },
];

export default function Home() {
  const { state, addElement, removeElement, reorderElements } = useDashboard();
  const { state: _viewModeState } = useViewMode();
  // const _crossfilter = useCrossfilter(); // Temporarily disabled

  // State to track which hardcoded charts are visible
  const [visibleCharts, setVisibleCharts] = useState<Set<string>>(
    new Set(HARDCODED_CHARTS.map(chart => chart.id))
  );

  // State for advanced features
  const [showCustomizationPanel, setShowCustomizationPanel] = useState(false);
  const [enableDragDrop, setEnableDragDrop] = useState(false); // Temporarily disabled
  const [enableRealTime, setEnableRealTime] = useState(false); // Temporarily disabled

  // Handler to remove hardcoded charts
  const handleRemoveHardcodedChart = (chartId: string) => {
    setVisibleCharts(prev => {
      const newSet = new Set(prev);
      newSet.delete(chartId);
      return newSet;
    });
  };

  // Handler for drag and drop reordering
  const handleElementsReorder = (reorderedElements: any[]) => {
    reorderElements(reorderedElements);
  };

  // Handler for data point interactions
  const _handleDataPointClick = (dataPoint: any, chartId: string) => {
    console.log('Data point clicked:', dataPoint, 'in chart:', chartId);
    // Could trigger crossfilter updates or detailed views
  };

  // Handler for export completion
  const _handleExportComplete = (format: string, chartId: string) => {
    console.log(`Export completed: ${format} for chart ${chartId}`);
    // Could show success notification
  };

  // Legacy handler for backward compatibility
  const handleElementSelect = (elementType: ElementType) => {
    const data = generateHistoricalData(elementType.id);
    const title = generateElementTitle(elementType.id);

    if (data) {
      addElement({
        type: elementType.id as 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart' | 'data-table' | 'summary-card',
        dataType: 'generic', // Default data type for legacy elements
        title,
        data,
        config: {}
      });
    }
  };

  // New two-step handler
  const handleElementCreate = (dataType: DataType, visualizationType: VisualizationType) => {
    const data = generateHistoricalDataByType(dataType.id, visualizationType.id);
    const title = generateElementTitleByType(dataType.id, visualizationType.id);

    if (data) {
      addElement({
        type: visualizationType.id,
        dataType: dataType.id,
        title,
        data,
        config: {}
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <HydrationSafeWrapper fallback={<div className="w-12 h-8 bg-gray-200 rounded-lg animate-pulse"></div>}>
            <DarkModeToggle size="medium" />
          </HydrationSafeWrapper>
        </div>
        <h1>Finance Factor Dashboard</h1>
        <div className={styles.headerContent}>
          <DashboardTabBar
            onSettingsClick={() => setShowCustomizationPanel(true)}
            onElementSelect={handleElementSelect}
            onElementCreate={handleElementCreate}
            showAddElement={true}
          />
          <ClientOnlyRealTimeFeatures
            enableRealTime={enableRealTime}
            showRealTimeIndicator={true}
          />
        </div>
      </div>

      {/* Enhanced Dashboard Layout with Drag & Drop */}
      {enableDragDrop ? (
        <DragDropDashboard
          elements={[
            // Convert hardcoded charts to dashboard elements
            ...HARDCODED_CHARTS.filter(chart => visibleCharts.has(chart.id)).map((chart) => ({
              id: chart.id,
              type: 'line-chart' as const,
              dataType: chart.dataType,
              title: chart.title,
              data: undefined, // Will be loaded by AutomaticChart
              config: {},
              isRealData: false,
              dataSource: 'API',
              createdAt: new Date(),
              updatedAt: new Date(),
              position: { row: 0, col: 0 }, // Add required position property
            })),
            // Include dynamic elements
            ...state.elements
          ]}
          onElementsReorder={handleElementsReorder}
          onElementRemove={(elementId) => {
            // Handle removal for both hardcoded and dynamic elements
            if (HARDCODED_CHARTS.some(chart => chart.id === elementId)) {
              handleRemoveHardcodedChart(elementId);
            } else {
              removeElement(elementId);
            }
          }}
          gridColumns={2}
          gap={24}
          enableResize={enableDragDrop} // Enable resize when drag & drop is enabled
        />
      ) : (
        // Fallback to traditional grid layout
        <div className={styles.dashboardGrid}>
          {/* Render hardcoded charts dynamically */}
          {HARDCODED_CHARTS.filter(chart => visibleCharts.has(chart.id)).map((chart) => (
            <div key={chart.id} className={styles.chartContainer}>
              <AutomaticChart
                dataType={chart.dataType}
                title={chart.title}
                chartType="line"
                height={400}
                showIndicator={true}
                indicatorPosition="top-right"
                refreshInterval={enableRealTime ? 15 * 60 * 1000 : undefined} // 15 minutes if real-time enabled
                onRemove={() => handleRemoveHardcodedChart(chart.id)}
                showVisualizationSwitcher={true}
                onVisualizationChange={(newType) => {
                  console.log(`Chart ${chart.id} visualization changed to ${newType}`);
                }}
                enableRealTime={enableRealTime}
                showRealTimeIndicator={enableRealTime}
                // Enhanced interactive features enabled by default
                enableZoom={true}
                enablePan={true}
                enableCrossfilter={false}
                showInteractiveControls={true}
                onDataPointClick={(dataPoint, chart) => {
                  console.log(`Chart ${chart.id} data point clicked:`, dataPoint, chart);
                }}
              />
            </div>
          ))}

          {/* Dynamic elements */}
          {state.elements.map((element) => (
            <div key={element.id} className={styles.chartContainer}>
              <DynamicElementRenderer
                element={element}
                onRemove={removeElement}
              />
            </div>
          ))}
        </div>
      )}

      {/* Dashboard Customization Panel - Temporarily disabled */}
      {false && (
        <DashboardCustomizationPanel
          isOpen={showCustomizationPanel}
          onClose={() => setShowCustomizationPanel(false)}
          onSettingsChange={(settings) => {
            setEnableDragDrop(settings.enableDragDrop ?? enableDragDrop);
            setEnableRealTime(settings.enableRealTime ?? enableRealTime);
            console.log('Dashboard settings updated:', settings);
          }}
          currentSettings={{
            enableDragDrop,
            enableRealTime,
            visibleCharts: Array.from(visibleCharts),
          }}
        />
      )}
    </div>
  );
}
