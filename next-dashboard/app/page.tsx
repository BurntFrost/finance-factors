'use client';

import React from 'react';
import LazyChart from './components/LazyChart';
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
  return (
    <div className={styles.container}>
      <h1>Finance Factor Dashboard</h1>
      <div className={styles.chartContainer}>
        <LazyChart data={priceData} title="Average House Price Over Time" />
      </div>
      <div className={styles.chartContainer}>
        <LazyChart data={incomeData} title="Average Household Income Over Time" />
      </div>
    </div>
  );
}
