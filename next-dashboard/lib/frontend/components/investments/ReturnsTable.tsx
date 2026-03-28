'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AssetData } from '@/frontend/hooks/useInvestmentData';
import styles from './ReturnsTable.module.css';

interface ReturnsTableProps {
  assets: Record<string, AssetData>;
  isLoading: boolean;
}

type SortColumn = '1Y' | '5Y' | '10Y' | '20Y' | 'name';
type SortDirection = 'asc' | 'desc';

function formatReturn(value: number | undefined): string {
  if (value === undefined) return '—';
  const pct = (value * 100).toFixed(1);
  return value >= 0 ? `+${pct}%` : `${pct}%`;
}

function getReturnForPeriod(asset: AssetData, period: string): number | undefined {
  return asset.returns.find((r) => r.period === period)?.cagr;
}

/** Tiny inline sparkline rendered via Canvas */
function Sparkline({ data }: { data: { date: string; value: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    // Use last 60 points for a cleaner sparkline
    const points = sorted.slice(-60);

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 2;

    ctx.clearRect(0, 0, w, h);

    const isPositive = values[values.length - 1] >= values[0];
    ctx.strokeStyle = isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    points.forEach((point, i) => {
      const x = padding + (i / (points.length - 1)) * (w - padding * 2);
      const y = h - padding - ((point.value - min) / range) * (h - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={100}
      height={30}
      className={styles.sparkline}
      aria-hidden="true"
    />
  );
}

export default function ReturnsTable({ assets, isLoading: _isLoading }: ReturnsTableProps) {
  const [sortCol, setSortCol] = useState<SortColumn>('1Y');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (col: SortColumn) => {
    if (col === sortCol) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const rows = useMemo(() => {
    const assetList = Object.values(assets);
    return assetList.sort((a, b) => {
      if (sortCol === 'name') {
        return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const aVal = getReturnForPeriod(a, sortCol) ?? -Infinity;
      const bVal = getReturnForPeriod(b, sortCol) ?? -Infinity;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [assets, sortCol, sortDir]);

  const sortIndicator = (col: SortColumn) => {
    if (col !== sortCol) return '';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Investment Returns Comparison</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={styles.th}
                onClick={() => handleSort('name')}
                role="columnheader"
                aria-sort={sortCol === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Asset{sortIndicator('name')}
              </th>
              <th className={styles.th}>Trend</th>
              {(['1Y', '5Y', '10Y', '20Y'] as const).map((period) => (
                <th
                  key={period}
                  className={`${styles.th} ${styles.sortable}`}
                  onClick={() => handleSort(period)}
                  role="columnheader"
                  aria-sort={sortCol === period ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {period} CAGR{sortIndicator(period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => (
              <tr key={asset.dataType} className={styles.row}>
                <td className={styles.nameCell}>
                  <span className={styles.assetName}>{asset.name}</span>
                  <span className={styles.symbol}>{asset.symbol}</span>
                </td>
                <td className={styles.sparklineCell}>
                  {asset.isLoading ? (
                    <div className={styles.sparklineSkeleton} />
                  ) : (
                    <Sparkline data={asset.timeSeries} />
                  )}
                </td>
                {(['1Y', '5Y', '10Y', '20Y'] as const).map((period) => {
                  const val = getReturnForPeriod(asset, period);
                  const isPositive = val !== undefined && val >= 0;
                  return (
                    <td
                      key={period}
                      className={`${styles.returnCell} ${
                        val === undefined
                          ? ''
                          : isPositive
                            ? styles.positiveCell
                            : styles.negativeCell
                      }`}
                    >
                      {asset.isLoading ? (
                        <div className={styles.cellSkeleton} />
                      ) : (
                        formatReturn(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
