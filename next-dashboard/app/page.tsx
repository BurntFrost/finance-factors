'use client';

import React, { useState } from 'react';
import AutomaticChart from './components/AutomaticChart';
import AddElementDropdown, { ElementType } from './components/AddElementDropdown';
import DynamicElementRenderer from './components/DynamicElementRenderer';
import ViewModeToggle from './components/ViewModeToggle';
import DarkModeToggle from './components/DarkModeToggle';
import ApiHealthStatus from './components/ApiHealthStatus';
import HydrationSafeWrapper from './components/HydrationSafeWrapper';
import { useDashboard } from './context/DashboardContext';
import { useViewMode } from './context/ViewModeContext';
import { generateHistoricalData, generateElementTitle, generateHistoricalDataByType, generateElementTitleByType } from './utils/historicalDataGenerators';
import { DataType, VisualizationType } from './types/dashboard';
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
  const { state, addElement, removeElement } = useDashboard();
  const { state: viewModeState } = useViewMode();

  // State to track which hardcoded charts are visible
  const [visibleCharts, setVisibleCharts] = useState<Set<string>>(
    new Set(HARDCODED_CHARTS.map(chart => chart.id))
  );

  // Handler to remove hardcoded charts
  const handleRemoveHardcodedChart = (chartId: string) => {
    setVisibleCharts(prev => {
      const newSet = new Set(prev);
      newSet.delete(chartId);
      return newSet;
    });
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
          <ViewModeToggle size="medium" />
          <HydrationSafeWrapper fallback={<div className="ml-4 p-3 bg-gray-50 rounded-lg">Loading API status...</div>}>
            <ApiHealthStatus className="ml-4" />
          </HydrationSafeWrapper>
          {viewModeState.isEditMode && (
            <AddElementDropdown
              onElementSelect={handleElementSelect}
              onElementCreate={handleElementCreate}
            />
          )}
        </div>
      </div>

      {/* Dashboard Grid Layout */}
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
              refreshInterval={15 * 60 * 1000} // 15 minutes
              onRemove={() => handleRemoveHardcodedChart(chart.id)}
              showVisualizationSwitcher={true}
              onVisualizationChange={(newType) => {
                console.log(`Chart ${chart.id} visualization changed to ${newType}`);
                // Note: For hardcoded charts, we could store the preference in localStorage
                // or update the chart state if needed
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
    </div>
  );
}
