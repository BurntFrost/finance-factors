'use client';

import React from 'react';
import { CagrResult } from '@/frontend/lib/cagr';
import styles from './ReturnsHero.module.css';

interface ReturnsHeroProps {
  returns: CagrResult[];
  isLoading: boolean;
}

export default function ReturnsHero({ returns, isLoading }: ReturnsHeroProps) {
  if (isLoading) {
    return (
      <div className={styles.hero}>
        <h2 className={styles.title}>S&P 500 Returns</h2>
        <div className={styles.cards}>
          {['1Y', '5Y', '10Y', '20Y'].map((p) => (
            <div key={p} className={styles.card}>
              <div className={styles.period}>{p}</div>
              <div className={styles.skeleton} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.hero}>
      <h2 className={styles.title}>S&P 500 Annualized Returns</h2>
      <div className={styles.cards}>
        {returns.map((r) => {
          const isPositive = r.cagr >= 0;
          return (
            <div
              key={r.period}
              className={`${styles.card} ${isPositive ? styles.positive : styles.negative}`}
            >
              <div className={styles.period}>{r.period}</div>
              <div className={styles.cagr}>
                {isPositive ? '+' : ''}
                {(r.cagr * 100).toFixed(1)}%
              </div>
              <div className={styles.subtitle}>per year</div>
              <div className={styles.absolute}>
                Total: {isPositive ? '+' : ''}
                {(r.absoluteGain * 100).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
