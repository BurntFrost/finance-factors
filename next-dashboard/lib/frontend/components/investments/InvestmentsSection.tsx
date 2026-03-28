'use client';

import React from 'react';
import { useInvestmentData } from '@/frontend/hooks/useInvestmentData';
import ReturnsHero from './ReturnsHero';
import ComparisonChart from './ComparisonChart';
import ReturnsTable from './ReturnsTable';
import styles from './InvestmentsSection.module.css';

export default function InvestmentsSection() {
  const { assets, isLoading, loadingProgress } = useInvestmentData();

  const sp500 = assets['sp500-index'];

  return (
    <div className={styles.section}>
      {isLoading && (
        <div className={styles.progressBar}>
          <div className={styles.progressText}>
            Loading market data ({loadingProgress.loaded} of {loadingProgress.total})
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <ReturnsHero
        returns={sp500?.returns ?? []}
        isLoading={sp500?.isLoading ?? true}
      />

      <ComparisonChart
        sp500Data={sp500?.timeSeries ?? []}
        sp500Loading={sp500?.isLoading ?? true}
      />

      <ReturnsTable assets={assets} isLoading={isLoading} />
    </div>
  );
}
