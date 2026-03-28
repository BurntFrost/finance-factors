'use client';

/**
 * Investment Data Hook
 *
 * Fetches multiple ETF time series with staggered requests to respect
 * Alpha Vantage rate limits (5 req/min). Computes CAGR for each asset.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutomaticDataSource as useAutomaticDataSourceContext } from '@/frontend/context/AutomaticDataSourceContext';
import { calculateReturns, CagrResult } from '@/frontend/lib/cagr';
import { ChartData } from '@/shared/types/dashboard';

interface DataPoint {
  date: string;
  value: number;
}

export interface AssetData {
  dataType: string;
  name: string;
  symbol: string;
  timeSeries: DataPoint[];
  returns: CagrResult[];
  isLoading: boolean;
  error: string | null;
}

export interface UseInvestmentDataResult {
  assets: Record<string, AssetData>;
  isLoading: boolean;
  loadingProgress: { loaded: number; total: number };
  refreshAll: () => void;
}

const INVESTMENT_ASSETS = [
  { dataType: 'sp500-index', name: 'S&P 500', symbol: 'SPY' },
  { dataType: 'nasdaq-100', name: 'Nasdaq 100', symbol: 'QQQ' },
  { dataType: 'sector-realestate', name: 'Real Estate', symbol: 'VNQ' },
  { dataType: 'sector-energy', name: 'Energy', symbol: 'XLE' },
  { dataType: 'sector-financials', name: 'Financials', symbol: 'XLF' },
  { dataType: 'sector-healthcare', name: 'Healthcare', symbol: 'XLV' },
  { dataType: 'gold', name: 'Gold', symbol: 'GLD' },
  { dataType: 'long-term-treasuries', name: 'Treasuries', symbol: 'TLT' },
  { dataType: 'emerging-markets', name: 'Emerging Mkts', symbol: 'VWO' },
] as const;

// Stagger: 4 concurrent, 12s between batches
const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 12_000;

function toDataPoints(labels: (string | number)[], values: (number | null)[]): DataPoint[] {
  const points: DataPoint[] = [];
  for (let i = 0; i < labels.length; i++) {
    const val = values[i];
    if (val !== null && val !== undefined) {
      points.push({ date: String(labels[i]), value: val });
    }
  }
  return points;
}

export function useInvestmentData(): UseInvestmentDataResult {
  const { fetchData } = useAutomaticDataSourceContext();
  const [assets, setAssets] = useState<Record<string, AssetData>>(() => {
    const initial: Record<string, AssetData> = {};
    for (const asset of INVESTMENT_ASSETS) {
      initial[asset.dataType] = {
        ...asset,
        timeSeries: [],
        returns: [],
        isLoading: true,
        error: null,
      };
    }
    return initial;
  });
  const fetchedRef = useRef(false);

  const fetchAsset = useCallback(
    async (asset: (typeof INVESTMENT_ASSETS)[number]) => {
      try {
        const response = await fetchData<ChartData>({ dataType: asset.dataType });
        if (!response || !response.data) {
          throw new Error('No data returned');
        }

        const chartData = response.data;
        const values = chartData.datasets[0]?.data ?? [];
        const labels = chartData.labels ?? [];
        const timeSeries = toDataPoints(labels, values);
        const returns = calculateReturns(timeSeries);

        setAssets((prev) => ({
          ...prev,
          [asset.dataType]: {
            ...prev[asset.dataType],
            timeSeries,
            returns,
            isLoading: false,
            error: null,
          },
        }));
      } catch (err) {
        setAssets((prev) => ({
          ...prev,
          [asset.dataType]: {
            ...prev[asset.dataType],
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch',
          },
        }));
      }
    },
    [fetchData]
  );

  const fetchAll = useCallback(async () => {
    // Reset loading state
    setAssets((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], isLoading: true, error: null };
      }
      return next;
    });

    // Stagger in batches
    for (let i = 0; i < INVESTMENT_ASSETS.length; i += BATCH_SIZE) {
      const batch = INVESTMENT_ASSETS.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map((asset) => fetchAsset(asset)));

      // Delay between batches (except the last one)
      if (i + BATCH_SIZE < INVESTMENT_ASSETS.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
  }, [fetchAsset]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAll();
  }, [fetchAll]);

  const loadingCount = Object.values(assets).filter((a) => a.isLoading).length;

  return {
    assets,
    isLoading: loadingCount > 0,
    loadingProgress: {
      loaded: INVESTMENT_ASSETS.length - loadingCount,
      total: INVESTMENT_ASSETS.length,
    },
    refreshAll: () => {
      fetchedRef.current = false;
      fetchAll();
    },
  };
}

export { INVESTMENT_ASSETS };
