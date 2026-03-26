/**
 * AI Insights API Route
 *
 * Generates plain-language insights about economic trends
 * using Vercel AI Gateway + Claude Haiku.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';

export const maxDuration = 30;

interface InsightRequestBody {
  dataType: string;
  data: {
    labels: string[];
    values: number[];
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: InsightRequestBody = await request.json();
    const { dataType, data } = body;

    if (!dataType || !data?.labels?.length || !data?.values?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      model: 'anthropic/claude-haiku-4.5',
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
