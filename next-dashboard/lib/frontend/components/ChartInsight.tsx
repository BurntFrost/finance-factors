'use client';

import React, { useState, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { INSIGHT_COPY } from '@/shared/constants/plainLanguageCopy';
import styles from './ChartInsight.module.css';

export interface ChartInsightProps {
  dataType: string;
  labels: string[];
  values: number[];
}

export default function ChartInsight({ dataType, labels, values }: ChartInsightProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [insight, setInsight] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [_errorMessage, setErrorMessage] = useState('');

  const handleGenerate = useCallback(async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setIsExpanded(true);

    track('insight_requested', { dataType });

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataType, data: { labels, values } }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error);

      setInsight(json.insight);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, [dataType, labels, values, status]);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setInsight('');
    setErrorMessage('');
    setIsExpanded(false);
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.trigger}>
        {status === 'idle' && (
          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            aria-label={INSIGHT_COPY.generateAriaLabel}
          >
            {INSIGHT_COPY.generateButton}
          </button>
        )}

        {(status === 'done' || status === 'loading' || status === 'error') && (
          <button
            className={styles.toggleButton}
            onClick={handleToggle}
            aria-expanded={isExpanded}
            aria-controls="chart-insight-panel"
          >
            <span className={styles.toggleLabel}>{INSIGHT_COPY.sectionLabel}</span>
            <span className={styles.chevron} aria-hidden="true">
              {isExpanded ? '▲' : '▼'}
            </span>
          </button>
        )}
      </div>

      {isExpanded && (
        <div
          id="chart-insight-panel"
          role="region"
          aria-label={INSIGHT_COPY.sectionLabel}
          className={styles.panel}
        >
          {status === 'loading' && (
            <p className={styles.loading} aria-live="polite">
              {INSIGHT_COPY.loading}
            </p>
          )}

          {status === 'done' && (
            <p className={styles.insightText} aria-live="polite">
              {insight}
            </p>
          )}

          {status === 'error' && (
            <div className={styles.error} aria-live="polite">
              <p>{INSIGHT_COPY.errorMessage}</p>
              <button className={styles.retryButton} onClick={handleRetry}>
                {INSIGHT_COPY.retry}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
