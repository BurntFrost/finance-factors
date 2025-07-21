'use client';

import React from 'react';
import LazyChart from './components/LazyChart';
import AddElementDropdown, { ElementType } from './components/AddElementDropdown';
import DynamicElementRenderer from './components/DynamicElementRenderer';
import DataSourceSelector from './components/DataSourceSelector';
import { useDashboard } from './context/DashboardContext';
import { useHousePricesData, useIncomeData } from './hooks/useDataSource';
import { generateSampleData, generateElementTitle, generateSampleDataByType, generateElementTitleByType } from './utils/sampleDataGenerators';
import { DataType, VisualizationType, ChartData } from './types/dashboard';
import styles from './page.module.css';

export default function Home() {
  const { state, addElement, removeElement } = useDashboard();

  // Use data source hooks for house prices and income data
  const housePricesResult = useHousePricesData();
  const incomeResult = useIncomeData();

  // Legacy handler for backward compatibility
  const handleElementSelect = (elementType: ElementType) => {
    const data = generateSampleData(elementType.id);
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
    const data = generateSampleDataByType(dataType.id, visualizationType.id);
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
          <DataSourceSelector />
        </div>
        <AddElementDropdown
          onElementSelect={handleElementSelect}
          onElementCreate={handleElementCreate}
        />
      </div>

      {/* Dashboard Grid Layout */}
      <div className={styles.dashboardGrid}>
        {/* Data source aware charts */}
        <div className={styles.chartContainer}>
          {housePricesResult.data ? (
            <LazyChart
              data={housePricesResult.data as ChartData}
              title="Average House Price Over Time"
            />
          ) : housePricesResult.isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}>Loading house prices data...</div>
            </div>
          ) : housePricesResult.error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorMessage}>
                Error loading house prices: {housePricesResult.error.message}
                <button
                  onClick={housePricesResult.refresh}
                  className={styles.retryButton}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.chartContainer}>
          {incomeResult.data ? (
            <LazyChart
              data={incomeResult.data as ChartData}
              title="Average Household Income Over Time"
            />
          ) : incomeResult.isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}>Loading income data...</div>
            </div>
          ) : incomeResult.error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorMessage}>
                Error loading income data: {incomeResult.error.message}
                <button
                  onClick={incomeResult.refresh}
                  className={styles.retryButton}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}
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
