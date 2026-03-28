/**
 * CAGR (Compound Annual Growth Rate) utilities for investment data.
 */

export interface CagrResult {
  period: '1Y' | '5Y' | '10Y' | '20Y';
  years: number;
  cagr: number; // Decimal, e.g. 0.12 = 12%
  absoluteGain: number; // Decimal, e.g. 1.5 = 150% total gain
  startValue: number;
  endValue: number;
  startDate: string;
  endDate: string;
}

interface DataPoint {
  date: string;
  value: number;
}

const PERIODS = [
  { period: '1Y' as const, years: 1 },
  { period: '5Y' as const, years: 5 },
  { period: '10Y' as const, years: 10 },
  { period: '20Y' as const, years: 20 },
];

/**
 * Calculate CAGR for multiple time periods from a time series.
 * Data must be sorted newest-first (descending by date).
 */
export function calculateReturns(data: DataPoint[]): CagrResult[] {
  if (data.length < 2) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sorted[0];
  const results: CagrResult[] = [];

  for (const { period, years } of PERIODS) {
    const targetDate = new Date(latest.date);
    targetDate.setFullYear(targetDate.getFullYear() - years);

    // Find the closest data point to the target date
    const startPoint = findClosest(sorted, targetDate);
    if (!startPoint || startPoint.value <= 0) continue;

    const cagr = Math.pow(latest.value / startPoint.value, 1 / years) - 1;
    const absoluteGain = (latest.value - startPoint.value) / startPoint.value;

    results.push({
      period,
      years,
      cagr,
      absoluteGain,
      startValue: startPoint.value,
      endValue: latest.value,
      startDate: startPoint.date,
      endDate: latest.date,
    });
  }

  return results;
}

function findClosest(sorted: DataPoint[], target: Date): DataPoint | null {
  const targetMs = target.getTime();
  let best: DataPoint | null = null;
  let bestDiff = Infinity;

  for (const point of sorted) {
    const diff = Math.abs(new Date(point.date).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = point;
    }
  }

  // Only accept if within 45 days of target
  if (bestDiff > 45 * 24 * 60 * 60 * 1000) return null;
  return best;
}

/**
 * Normalize a time series so the first point = 100.
 * Useful for comparing assets with different price scales.
 */
export function normalizeToBase100(data: DataPoint[]): DataPoint[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const base = sorted[0].value;
  if (base === 0) return sorted;

  return sorted.map((point) => ({
    date: point.date,
    value: (point.value / base) * 100,
  }));
}
