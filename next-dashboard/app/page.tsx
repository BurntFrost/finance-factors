'use client';

import React from 'react';
import LazyChart from './components/LazyChart';
import AddElementDropdown, { ElementType } from './components/AddElementDropdown';
import DynamicElementRenderer from './components/DynamicElementRenderer';
import { useDashboard } from './context/DashboardContext';
import { generateSampleData, generateElementTitle, generateSampleDataByType, generateElementTitleByType } from './utils/sampleDataGenerators';
import { DataType, VisualizationType } from './types/dashboard';
import styles from './page.module.css';

const years = Array.from({ length: 30 }, (_, i) => 1994 + i);
const housePrices = years.map((_, i) => 100000 + i * 10000);
const householdIncome = years.map((_, i) => 30000 + i * 1500);

const priceData = {
  labels: years,
  datasets: [
    {
      label: 'Average House Price (USD)',
      data: housePrices,
      borderColor: 'rgba(75,192,192,1)',
      backgroundColor: 'rgba(75,192,192,0.2)',
    },
  ],
};

const incomeData = {
  labels: years,
  datasets: [
    {
      label: 'Average Household Income (USD)',
      data: householdIncome,
      borderColor: 'rgba(255,99,132,1)',
      backgroundColor: 'rgba(255,99,132,0.2)',
    },
  ],
};

export default function Home() {
  const { state, addElement, removeElement } = useDashboard();

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
        <h1>Finance Factor Dashboard</h1>
        <AddElementDropdown
          onElementSelect={handleElementSelect}
          onElementCreate={handleElementCreate}
        />
      </div>

      {/* Original static charts */}
      <div className={styles.chartContainer}>
        <LazyChart data={priceData} title="Average House Price Over Time" />
      </div>
      <div className={styles.chartContainer}>
        <LazyChart data={incomeData} title="Average Household Income Over Time" />
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
  );
}
