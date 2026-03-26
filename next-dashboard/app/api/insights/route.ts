/**
 * AI Insights API Route
 *
 * Generates plain-language insights about economic trends
 * using the Anthropic provider + Claude Haiku.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 30;

// --- Rate limiter (in-memory, per function instance) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// --- Allowed data types (prevents prompt injection) ---
const VALID_DATA_TYPES = new Set([
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
  'cost-of-living',
  'food-prices',
]);

interface InsightRequestBody {
  dataType: string;
  data: {
    labels: string[];
    values: number[];
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body: InsightRequestBody = await request.json();
    const { dataType, data } = body;

    if (!dataType || !data?.labels?.length || !data?.values?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!VALID_DATA_TYPES.has(dataType)) {
      return NextResponse.json({ error: 'Invalid dataType' }, { status: 400 });
    }

    if (data.labels.length !== data.values.length) {
      return NextResponse.json({ error: 'Labels and values length mismatch' }, { status: 400 });
    }

    // Sample data to avoid sending hundreds of points in the prompt
    const MAX_POINTS = 24;
    const step = Math.max(1, Math.floor(data.labels.length / MAX_POINTS));
    const sampledLabels = data.labels.filter((_, i) => i % step === 0);
    const sampledValues = data.values.filter((_, i) => i % step === 0);
    const first = sampledValues[0];
    const last = sampledValues[sampledValues.length - 1];
    const pctChange = first !== 0 ? (((last - first) / Math.abs(first)) * 100).toFixed(1) : 'N/A';

    const dataPoints = sampledLabels
      .map((label, i) => `${label}: ${sampledValues[i]}`)
      .join(', ');

    const { text } = await generateText({
      model: anthropic('claude-haiku-4.5-20251001'),
      system:
        'You are an economic data analyst writing plain-language summaries for a general audience. Be concise, factual, and avoid jargon. Do not use bullet points or headers. Write exactly 2-3 sentences.',
      prompt: `Describe the trend in this US economic dataset.\n\nIndicator: ${dataType}\nOverall change: ${pctChange}%\nData points (sampled): ${dataPoints}\n\nWrite a 2-3 sentence plain-language insight about what this data shows and what it might mean for everyday people.`,
    });

    return NextResponse.json({ insight: text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[insights] generateText failed:', message);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
