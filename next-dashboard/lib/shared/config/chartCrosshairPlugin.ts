'use client';

import type { Chart, Plugin } from 'chart.js';

export interface CrosshairPluginOptions {
  lineColor?: string;
  lineWidth?: number;
  lineDash?: number[];
}

/**
 * Chart.js plugin that draws a crosshair at the tooltip position when hovering
 * over chart data, so the exact value at the intersection is visible.
 */
export const chartCrosshairPlugin: Plugin<'line' | 'bar'> = {
  id: 'crosshair',
  afterDraw(chart: Chart) {
    const chartType = (chart as { config?: { type?: string } }).config?.type;
    if (chartType !== 'line' && chartType !== 'bar') return;

    const tooltip = chart.tooltip;
    if (!tooltip?.opacity || tooltip.opacity === 0) return;

    const ctx = chart.ctx;
    const plugins = chart.options?.plugins as Record<string, CrosshairPluginOptions | undefined> | undefined;
    const options = (plugins?.crosshair ?? {}) as CrosshairPluginOptions;
    const lineColor = options.lineColor ?? 'rgba(100, 116, 139, 0.6)';
    const lineWidth = options.lineWidth ?? 1;
    const lineDash = options.lineDash ?? [4, 4];

    const tooltipAny = tooltip as { caretX?: number; caretY?: number; x?: number; y?: number };
    const x = tooltipAny.caretX ?? tooltipAny.x;
    const y = tooltipAny.caretY ?? tooltipAny.y;
    if (x == null || y == null || typeof x !== 'number' || typeof y !== 'number') return;

    const { left, right, top, bottom } = chart.chartArea;
    ctx.save();

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(lineDash);
    ctx.beginPath();

    // Vertical line (full height of chart area)
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);

    // Horizontal line (full width of chart area)
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);

    ctx.stroke();
    ctx.restore();
  },
};
