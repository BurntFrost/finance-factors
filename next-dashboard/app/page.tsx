'use client';

import React, { lazy, Suspense } from 'react';
import HydrationSafeWrapper from '@/frontend/components/HydrationSafeWrapper';

// Lazy load heavy components for better performance
const DashboardTabBar = lazy(() => import('@/frontend/components/DashboardTabBar'));
const DarkModeToggle = lazy(() => import('@/frontend/components/DarkModeToggle'));
const ParallelDashboard = lazy(() => import('@/frontend/components/ParallelDashboard'));
const InvestmentsSection = lazy(() => import('@/frontend/components/investments/InvestmentsSection'));

import type { ElementType } from '@/frontend/components/AddElementDropdown';
import { useDashboard } from '@/frontend/context/DashboardContext';
import { useViewMode } from '@/frontend/context/ViewModeContext';
import { generateHistoricalData, generateElementTitle, generateHistoricalDataByType, generateElementTitleByType } from '@/shared/utils';
import { DataType, VisualizationType } from '@/shared/types/dashboard';
import { DASHBOARD_COPY } from '@/shared/constants/plainLanguageCopy';
import styles from './page.module.css';

export default function Home() {
  const { addElement } = useDashboard();
  const _viewMode = useViewMode();

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
      <header className={styles.header} role="banner">
        <div className={styles.headerLeft}>
          <HydrationSafeWrapper fallback={<div className="w-12 h-8 bg-gray-200 rounded-lg animate-pulse"></div>}>
            <Suspense fallback={<div className="w-12 h-8 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <DarkModeToggle size="medium" />
            </Suspense>
          </HydrationSafeWrapper>
        </div>
        <div className={styles.titleBlock}>
          <h1>{DASHBOARD_COPY.title}</h1>
          <p className={styles.subtitle}>{DASHBOARD_COPY.subtitle}</p>
        </div>
        <div className={styles.headerContent}>
          <Suspense fallback={<div className="h-10 bg-gray-200 rounded-lg animate-pulse w-48"></div>}>
            <DashboardTabBar
              onSettingsClick={() => {}}
              onElementSelect={handleElementSelect}
              onElementCreate={handleElementCreate}
              showAddElement={true}
            />
          </Suspense>
        </div>
      </header>

      <section className={styles.howToUse} aria-labelledby="how-to-use-heading">
        <h2 id="how-to-use-heading" className={styles.howToUseTitle}>
          {DASHBOARD_COPY.howToUseTitle}
        </h2>
        <p className={styles.howToUseBlurb}>{DASHBOARD_COPY.howToUseBlurb}</p>
      </section>

      <main id="dashboard-main" className={styles.main} aria-label="Dashboard charts and data">
        {_viewMode.state.isInvestmentsMode ? (
          <Suspense fallback={<div className="grid grid-cols-2 gap-6 p-6"><div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div><div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div></div>}>
            <InvestmentsSection />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="grid grid-cols-2 gap-6 p-6"><div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div><div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div></div>}>
            <ParallelDashboard
              staggerDelay={100}
              showLoadingProgress={true}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
