'use client';

import React from 'react';
import { SummaryCardData } from '../types/dashboard';
import DataStatusPill, { getDataStatus } from './DataStatusPill';
import styles from './SummaryCard.module.css';

interface SummaryCardProps {
  title: string;
  data: SummaryCardData;
  onRemove?: () => void;
}

export default function SummaryCard({ title, data, onRemove }: SummaryCardProps) {
  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      // Format large numbers with appropriate suffixes
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return '📈';
      case 'decrease':
        return '📉';
      case 'neutral':
        return '➡️';
      default:
        return '';
    }
  };

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return '#28a745';
      case 'decrease':
        return '#dc3545';
      case 'neutral':
        return '#6c757d';
      default:
        return 'inherit';
    }
  };

  return (
    <div 
      className={styles.card}
      style={{ 
        borderLeftColor: data.color || '#007bff',
        backgroundColor: data.color ? `${data.color}08` : undefined
      }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          {data.icon && <span className={styles.cardIcon}>{data.icon}</span>}
          <h3 className={styles.title}>{data.title}</h3>
        </div>
        <div className={styles.cardActions}>
          <DataStatusPill
            status={getDataStatus(data.lastUpdated, data.isRealData)}
            lastUpdated={data.lastUpdated}
            size="small"
          />
          {onRemove && (
            <button
              className={styles.removeButton}
              onClick={onRemove}
              aria-label="Remove card"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.mainValue}>
          {formatValue(data.value)}
        </div>

        {data.change && (
          <div className={styles.changeContainer}>
            <div 
              className={styles.changeValue}
              style={{ color: getChangeColor(data.change.type) }}
            >
              <span className={styles.changeIcon}>
                {getChangeIcon(data.change.type)}
              </span>
              <span className={styles.changeText}>
                {data.change.value > 0 ? '+' : ''}{data.change.value}%
              </span>
            </div>
            <div className={styles.changePeriod}>
              {data.change.period}
            </div>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardSubtitle}>{title}</span>
      </div>
    </div>
  );
}

// Grid container for multiple summary cards
interface SummaryCardGridProps {
  title: string;
  cards: SummaryCardData[];
  onRemove?: () => void;
}

export function SummaryCardGrid({ title, cards, onRemove }: SummaryCardGridProps) {
  // Determine overall data status from the cards
  const hasRealData = cards.some(card => card.isRealData);
  const latestUpdate = cards.reduce((latest, card) => {
    if (!card.lastUpdated) return latest;
    if (!latest) return card.lastUpdated;
    return card.lastUpdated > latest ? card.lastUpdated : latest;
  }, undefined as Date | undefined);

  return (
    <div className={styles.gridContainer}>
      <div className={styles.gridHeader}>
        <div className={styles.titleSection}>
          <h2 className={styles.gridTitle}>{title}</h2>
          <DataStatusPill
            status={getDataStatus(latestUpdate, hasRealData)}
            lastUpdated={latestUpdate}
            size="small"
          />
        </div>
        {onRemove && (
          <button
            className={styles.removeButton}
            onClick={onRemove}
            aria-label="Remove card grid"
          >
            🗑️ Remove
          </button>
        )}
      </div>
      
      <div className={styles.cardGrid}>
        {cards.map((cardData, index) => (
          <SummaryCard
            key={index}
            title={cardData.title}
            data={cardData}
          />
        ))}
      </div>
    </div>
  );
}
