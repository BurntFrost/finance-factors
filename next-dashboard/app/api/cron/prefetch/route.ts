/**
 * Cron Prefetch Route
 *
 * Triggered hourly by Vercel Cron Jobs.
 * Fetches all dashboard data types directly via proxy services and
 * populates the advanced cache so users get instant loads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fredProxyService } from '../../services/fred-proxy';
import { blsProxyService } from '../../services/bls-proxy';
import { cache } from '@/backend/lib/advanced-cache';
import { PROXY_API_ENDPOINTS } from '@/shared/types/proxy';
import { isTraditionalApisEnabled } from '@/backend/lib/feature-toggles';

export const maxDuration = 60;

const DATA_TYPES = [
  'house-prices',
  'salary-income',
  'inflation-cpi',
  'core-inflation',
  'fed-balance-sheet',
  'federal-funds-rate',
  'unemployment-rate',
  'gdp-growth',
  'money-supply-m1',
  'money-supply-m2',
  'treasury-10y',
  'treasury-2y',
] as const;

type PrefetchResult =
  | { dataType: string; status: 'cached'; durationMs: number }
  | { dataType: string; status: 'skipped'; reason: string }
  | { dataType: string; status: 'error'; error: string; durationMs: number };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET environment variable is not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTraditionalApisEnabled()) {
    return NextResponse.json(
      { error: 'Traditional APIs are disabled via feature toggle' },
      { status: 503 }
    );
  }

  const startTime = Date.now();

  const results = await Promise.allSettled(
    DATA_TYPES.map((dataType) => prefetchDataType(dataType))
  );

  const summary: PrefetchResult[] = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      dataType: DATA_TYPES[i],
      status: 'error' as const,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      durationMs: 0,
    };
  });

  const cached = summary.filter((r) => r.status === 'cached').length;
  const skipped = summary.filter((r) => r.status === 'skipped').length;
  const errors = summary.filter((r) => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    totalDurationMs: Date.now() - startTime,
    summary: { total: DATA_TYPES.length, cached, skipped, errors },
    results: summary,
  });
}

async function prefetchDataType(dataType: string): Promise<PrefetchResult> {
  const t = Date.now();
  const endpointConfig = PROXY_API_ENDPOINTS[dataType];

  if (!endpointConfig) {
    return { dataType, status: 'skipped', reason: 'No endpoint config found' };
  }

  // Must match the key format in app/api/proxy/data/route.ts (line 87)
  // When no timeRange is provided, JSON.stringify(undefined) produces "undefined"
  const cacheKey = `api:${dataType}:${JSON.stringify(undefined)}`;

  let response;

  switch (endpointConfig.provider) {
    case 'FRED':
      response = await fredProxyService.fetchSeries(dataType, { useCache: false });
      break;

    case 'BLS':
      response = await blsProxyService.fetchSeries(dataType, {});
      break;

    default:
      return {
        dataType,
        status: 'skipped',
        reason: `Provider ${endpointConfig.provider} not handled by prefetch`,
      };
  }

  if (!response.success) {
    return {
      dataType,
      status: 'error',
      error: response.error ?? 'Fetch returned success: false',
      durationMs: Date.now() - t,
    };
  }

  await cache.set(cacheKey, response, {
    ttl: 24 * 60 * 60,
    tags: [dataType, endpointConfig.provider, 'api-response'],
    priority: 'normal',
  });

  return { dataType, status: 'cached', durationMs: Date.now() - t };
}
