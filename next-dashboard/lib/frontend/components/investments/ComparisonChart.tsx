'use client';

import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useAutomaticDataSource as useAutomaticDataSourceContext } from '@/frontend/context/AutomaticDataSourceContext';
import { normalizeToBase100 } from '@/frontend/lib/cagr';
import { ChartData } from '@/shared/types/dashboard';
import styles from './ComparisonChart.module.css';

interface DataPoint {
  date: string;
  value: number;
}

interface ComparisonChartProps {
  sp500Data: DataPoint[];
  sp500Loading: boolean;
}

const FACTORS = [
  { id: 'inflation-cpi', label: 'Inflation (CPI)' },
  { id: 'federal-funds-rate', label: 'Fed Funds Rate' },
  { id: 'gdp-growth', label: 'GDP Growth' },
  { id: 'unemployment-rate', label: 'Unemployment' },
  { id: 'treasury-10y', label: '10Y Treasury' },
] as const;

type ChartMode = 'normalized' | 'dual';

export default function ComparisonChart({ sp500Data, sp500Loading }: ComparisonChartProps) {
  const { fetchData } = useAutomaticDataSourceContext();
  const [selectedFactor, setSelectedFactor] = useState<string>(FACTORS[0].id);
  const [mode, setMode] = useState<ChartMode>('normalized');
  const [factorData, setFactorData] = useState<DataPoint[]>([]);
  const [factorLoading, setFactorLoading] = useState(false);

  // Fetch factor data when selection changes
  React.useEffect(() => {
    let cancelled = false;
    setFactorLoading(true);

    fetchData<ChartData>({ dataType: selectedFactor })
      .then((response) => {
        if (cancelled || !response?.data) return;
        const chartData = response.data;
        const labels = chartData.labels ?? [];
        const values = chartData.datasets[0]?.data ?? [];
        const points: DataPoint[] = [];
        for (let i = 0; i < labels.length; i++) {
          const val = values[i];
          if (val !== null && val !== undefined) {
            points.push({ date: String(labels[i]), value: val });
          }
        }
        setFactorData(points);
      })
      .catch(() => {
        if (!cancelled) setFactorData([]);
      })
      .finally(() => {
        if (!cancelled) setFactorLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFactor, fetchData]);

  const chartConfig = useMemo(() => {
    if (sp500Data.length === 0 || factorData.length === 0) return null;

    const factorLabel = FACTORS.find((f) => f.id === selectedFactor)?.label ?? selectedFactor;

    if (mode === 'normalized') {
      const normSp500 = normalizeToBase100(sp500Data);
      const normFactor = normalizeToBase100(factorData);

      return {
        data: {
          labels: normSp500.map((p) => p.date),
          datasets: [
            {
              label: 'S&P 500',
              data: normSp500.map((p) => p.value),
              borderColor: 'hsl(217, 91%, 60%)',
              backgroundColor: 'hsl(217, 91%, 60%, 0.1)',
              tension: 0.3,
              pointRadius: 0,
              fill: false,
            },
            {
              label: factorLabel,
              data: normFactor.map((p) => p.value),
              borderColor: 'hsl(25, 95%, 53%)',
              backgroundColor: 'hsl(25, 95%, 53%, 0.1)',
              tension: 0.3,
              pointRadius: 0,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' as const },
            tooltip: { mode: 'index' as const, intersect: false },
          },
          scales: {
            x: {
              type: 'category' as const,
              ticks: { maxTicksLimit: 12 },
            },
            y: {
              title: { display: true, text: 'Normalized (Start = 100)' },
            },
          },
        },
      };
    }

    // Dual Y-axis mode
    return {
      data: {
        labels: sp500Data
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((p) => p.date),
        datasets: [
          {
            label: 'S&P 500',
            data: sp500Data
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((p) => p.value),
            borderColor: 'hsl(217, 91%, 60%)',
            tension: 0.3,
            pointRadius: 0,
            fill: false,
            yAxisID: 'y',
          },
          {
            label: factorLabel,
            data: factorData
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((p) => p.value),
            borderColor: 'hsl(25, 95%, 53%)',
            tension: 0.3,
            pointRadius: 0,
            fill: false,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' as const },
          tooltip: { mode: 'index' as const, intersect: false },
        },
        scales: {
          x: {
            type: 'category' as const,
            ticks: { maxTicksLimit: 12 },
          },
          y: {
            type: 'linear' as const,
            position: 'left' as const,
            title: { display: true, text: 'S&P 500 (USD)' },
          },
          y1: {
            type: 'linear' as const,
            position: 'right' as const,
            title: { display: true, text: factorLabel },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };
  }, [sp500Data, factorData, mode, selectedFactor]);

  const isLoading = sp500Loading || factorLoading;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>S&P 500 vs Economic Factors</h2>
        <div className={styles.controls}>
          <select
            className={styles.select}
            value={selectedFactor}
            onChange={(e) => setSelectedFactor(e.target.value)}
            aria-label="Select economic factor"
          >
            {FACTORS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <div className={styles.modeToggle} role="radiogroup" aria-label="Chart mode">
            <button
              className={`${styles.modeBtn} ${mode === 'normalized' ? styles.active : ''}`}
              onClick={() => setMode('normalized')}
              role="radio"
              aria-checked={mode === 'normalized'}
            >
              Normalized
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'dual' ? styles.active : ''}`}
              onClick={() => setMode('dual')}
              role="radio"
              aria-checked={mode === 'dual'}
            >
              Dual Axis
            </button>
          </div>
        </div>
      </div>
      <div className={styles.chartArea}>
        {isLoading ? (
          <div className={styles.loading}>Loading comparison data...</div>
        ) : chartConfig ? (
          <Line data={chartConfig.data} options={chartConfig.options} />
        ) : (
          <div className={styles.loading}>No data available</div>
        )}
      </div>
    </div>
  );
}
