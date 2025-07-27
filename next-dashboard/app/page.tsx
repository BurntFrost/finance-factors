'use client';

import React from 'react';
import AutomaticChart from './components/AutomaticChart';
import AddElementDropdown, { ElementType } from './components/AddElementDropdown';
import DynamicElementRenderer from './components/DynamicElementRenderer';
import ViewModeToggle from './components/ViewModeToggle';
import ApiHealthStatus from './components/ApiHealthStatus';
import HydrationSafeWrapper from './components/HydrationSafeWrapper';
import { useDashboard } from './context/DashboardContext';
import { useViewMode } from './context/ViewModeContext';
import { generateHistoricalData, generateElementTitle, generateHistoricalDataByType, generateElementTitleByType } from './utils/historicalDataGenerators';
import { DataType, VisualizationType } from './types/dashboard';
import styles from './page.module.css';

export default function Home() {
  const { state, addElement, removeElement } = useDashboard();
  const { state: viewModeState } = useViewMode();

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
        <div className={styles.headerContent}>
          <h1>Finance Factor Dashboard</h1>
          <ViewModeToggle size="medium" />
          <HydrationSafeWrapper fallback={<div className="ml-4 p-3 bg-gray-50 rounded-lg">Loading API status...</div>}>
            <ApiHealthStatus className="ml-4" />
          </HydrationSafeWrapper>
        </div>
        {viewModeState.isEditMode && (
          <AddElementDropdown
            onElementSelect={handleElementSelect}
            onElementCreate={handleElementCreate}
          />
        )}
      </div>

      {/* Dashboard Grid Layout */}
      <div className={styles.dashboardGrid}>
        {/* Automatic data source charts */}
        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="house-prices"
            title="Average House Price Over Time"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="salary-income"
            title="Average Household Income Over Time"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        {/* Economic Indicators */}
        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="inflation-cpi"
            title="Consumer Price Index (CPI)"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="core-inflation"
            title="Core Inflation Rate"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="fed-balance-sheet"
            title="Federal Reserve Balance Sheet"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="federal-funds-rate"
            title="Federal Funds Rate"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="unemployment-rate"
            title="Unemployment Rate"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="gdp-growth"
            title="GDP Growth Rate"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="money-supply-m1"
            title="Money Supply (M1)"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="money-supply-m2"
            title="Money Supply (M2)"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="treasury-10y"
            title="10-Year Treasury Yield"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

        <div className={styles.chartContainer}>
          <AutomaticChart
            dataType="treasury-2y"
            title="2-Year Treasury Yield"
            chartType="line"
            height={400}
            showIndicator={true}
            indicatorPosition="top-right"
            refreshInterval={15 * 60 * 1000} // 15 minutes
          />
        </div>

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
