'use client';

import type { ChartOptions, TooltipItem, Chart } from 'chart.js';
import { getChartConfig } from './chartConfiguration';

export interface InteractiveChartOptions extends ChartOptions {
  plugins?: {
    zoom?: {
      pan?: {
        enabled: boolean;
        mode: 'x' | 'y' | 'xy';
        threshold?: number;
        rangeMin?: {
          x?: number;
          y?: number;
        };
        rangeMax?: {
          x?: number;
          y?: number;
        };
      };
      zoom?: {
        wheel?: {
          enabled: boolean;
          speed?: number;
          modifierKey?: 'ctrl' | 'alt' | 'shift' | 'meta';
        };
        pinch?: {
          enabled: boolean;
        };
        mode: 'x' | 'y' | 'xy';
        rangeMin?: {
          x?: number;
          y?: number;
        };
        rangeMax?: {
          x?: number;
          y?: number;
        };
      };
    };
    tooltip?: {
      enabled: boolean;
      mode: 'index' | 'dataset' | 'point' | 'nearest' | 'x' | 'y';
      intersect: boolean;
      position: 'average' | 'nearest';
      callbacks?: {
        title?: (tooltipItems: TooltipItem<any>[]) => string | string[];
        label?: (tooltipItem: TooltipItem<any>) => string | string[];
        afterLabel?: (tooltipItem: TooltipItem<any>) => string | string[];
        footer?: (tooltipItems: TooltipItem<any>[]) => string | string[];
      };
    };
    legend?: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
      onClick?: (event: any, legendItem: any, legend: any) => void;
    };
  };
  onClick?: (event: any, elements: any[], chart: Chart) => void;
  onHover?: (event: any, elements: any[], chart: Chart) => void;
}

/**
 * Get enhanced interactive chart options with zoom, pan, and crossfilter capabilities
 */
export function getInteractiveChartOptions(
  dataType: string,
  options: {
    enableZoom?: boolean;
    enablePan?: boolean;
    enableCrossfilter?: boolean;
    onDataPointClick?: (dataPoint: any, chart: Chart) => void;
    onDataPointHover?: (dataPoint: any, chart: Chart) => void;
    customTooltip?: boolean;
  } = {}
): InteractiveChartOptions {
  const {
    enableZoom = true,
    enablePan = true,
    enableCrossfilter = false,
    onDataPointClick,
    onDataPointHover,
    customTooltip = true,
  } = options;

  // Get base configuration from existing chart config
  const baseConfig = getChartConfig(dataType);

  const interactiveOptions: InteractiveChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      zoom: {
        pan: {
          enabled: enablePan,
          mode: 'x',
          threshold: 5,
          rangeMin: {
            x: undefined,
          },
          rangeMax: {
            x: undefined,
          },
        },
        zoom: {
          wheel: {
            enabled: enableZoom,
            speed: 0.07,
            modifierKey: 'ctrl',
          },
          pinch: {
            enabled: enableZoom,
          },
          mode: 'x',
          rangeMin: {
            x: undefined,
          },
          rangeMax: {
            x: undefined,
          },
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        position: 'nearest',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        titleColor: 'rgb(248, 250, 252)',
        bodyColor: 'rgb(248, 250, 252)',
        borderColor: 'rgba(248, 250, 252, 0.12)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        boxPadding: 6,
        callbacks: customTooltip && baseConfig ? {
          title: function(tooltipItems: TooltipItem<any>[]) {
            try {
              if (baseConfig.tooltip?.title && typeof baseConfig.tooltip.title === 'function') {
                return baseConfig.tooltip.title(tooltipItems);
              }
              return tooltipItems[0]?.label || '';
            } catch (error) {
              console.warn('Tooltip title callback error:', error);
              return tooltipItems[0]?.label || '';
            }
          },
          label: function(tooltipItem: TooltipItem<any>) {
            try {
              if (baseConfig.tooltip?.label && typeof baseConfig.tooltip.label === 'function') {
                return baseConfig.tooltip.label(tooltipItem);
              }
              return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}`;
            } catch (error) {
              console.warn('Tooltip label callback error:', error);
              return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}`;
            }
          },
          afterLabel: function(tooltipItem: TooltipItem<any>) {
            try {
              if (baseConfig.tooltip?.afterLabel && typeof baseConfig.tooltip.afterLabel === 'function') {
                return baseConfig.tooltip.afterLabel(tooltipItem);
              }
              return '';
            } catch (error) {
              console.warn('Tooltip afterLabel callback error:', error);
              return '';
            }
          },
          footer: function(tooltipItems: TooltipItem<any>[]) {
            try {
              // Add data source information
              const dataPoint = tooltipItems[0];
              if (dataPoint?.dataset?.data) {
                const pointData = (dataPoint.dataset.data as any)[dataPoint.dataIndex];
                if (pointData?.dataSource) {
                  return [`Source: ${pointData.dataSource}`, `Updated: ${pointData.lastUpdated || 'Unknown'}`];
                }
              }
              return ['Source: Live API Data'];
            } catch (error) {
              console.warn('Tooltip footer callback error:', error);
              return ['Source: Live API Data'];
            }
          },
        } : {
          title: function(tooltipItems: TooltipItem<any>[]) {
            return tooltipItems[0]?.label || '';
          },
          label: function(tooltipItem: TooltipItem<any>) {
            return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}`;
          }
        },
      },
      legend: {
        display: baseConfig?.legend?.display ?? true,
        position: baseConfig?.legend?.position ?? 'top',
        onClick: enableCrossfilter ? (event: any, legendItem: any, legend: any) => {
          // Custom legend click for crossfilter functionality
          const chart = legend.chart;
          const datasetIndex = legendItem.datasetIndex;
          const meta = chart.getDatasetMeta(datasetIndex);
          
          // Toggle dataset visibility
          meta.hidden = meta.hidden === null ? !chart.data.datasets[datasetIndex].hidden : null;
          chart.update();
          
          // Trigger crossfilter update if enabled
          if (enableCrossfilter && onDataPointClick) {
            onDataPointClick({ type: 'legend', datasetIndex, visible: !meta.hidden }, chart);
          }
        } : undefined,
      },
    },
    onClick: onDataPointClick ? (event: any, elements: any[], chart: Chart) => {
      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const dataPoint = chart.data.datasets[datasetIndex].data[dataIndex];
        
        onDataPointClick({
          type: 'dataPoint',
          datasetIndex,
          dataIndex,
          value: dataPoint,
          dataset: chart.data.datasets[datasetIndex],
        }, chart);
      }
    } : undefined,
    onHover: onDataPointHover ? (event: any, elements: any[], chart: Chart) => {
      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const dataPoint = chart.data.datasets[datasetIndex].data[dataIndex];
        
        onDataPointHover({
          type: 'dataPoint',
          datasetIndex,
          dataIndex,
          value: dataPoint,
          dataset: chart.data.datasets[datasetIndex],
        }, chart);
      }
    } : undefined,
    scales: {
      x: {
        type: 'time',
        display: true,
        title: {
          display: true,
          text: baseConfig?.axes?.x?.label || 'Time',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        type: 'linear',
        display: true,
        beginAtZero: baseConfig?.axes?.y?.beginAtZero ?? false,
        title: {
          display: true,
          text: baseConfig?.axes?.y?.label || 'Value',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return interactiveOptions;
}

/**
 * Reset zoom and pan on a chart
 */
export function resetChartZoom(chart: Chart): void {
  if (chart && (chart as any).resetZoom) {
    (chart as any).resetZoom();
  }
}

/**
 * Enable/disable zoom on a chart
 */
export function toggleChartZoom(chart: Chart, enabled: boolean): void {
  if (chart && chart.options?.plugins?.zoom) {
    chart.options.plugins.zoom.zoom!.wheel!.enabled = enabled;
    chart.options.plugins.zoom.zoom!.pinch!.enabled = enabled;
    chart.update('none');
  }
}

/**
 * Enable/disable pan on a chart
 */
export function toggleChartPan(chart: Chart, enabled: boolean): void {
  if (chart && chart.options?.plugins?.zoom) {
    chart.options.plugins.zoom.pan!.enabled = enabled;
    chart.update('none');
  }
}

/** Zoom scale factor for zoom-in (e.g. 1.25 = 25% in) */
const ZOOM_IN_FACTOR = 1.25;

/** Zoom scale factor for zoom-out (e.g. 0.8 = 20% out) */
const ZOOM_OUT_FACTOR = 0.8;

/**
 * Zoom the chart in by a fixed factor (button-triggered).
 */
export function zoomChartIn(chart: Chart): void {
  if (chart && typeof (chart as any).zoom === 'function') {
    (chart as any).zoom(ZOOM_IN_FACTOR, 'zoom');
  }
}

/**
 * Zoom the chart out by a fixed factor (button-triggered).
 */
export function zoomChartOut(chart: Chart): void {
  if (chart && typeof (chart as any).zoom === 'function') {
    (chart as any).zoom(ZOOM_OUT_FACTOR, 'zoom');
  }
}
