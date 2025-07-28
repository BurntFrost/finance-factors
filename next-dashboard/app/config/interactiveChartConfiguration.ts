'use client';

import { ChartOptions, TooltipItem, Chart } from 'chart.js';
import { getChartConfig } from './chartConfiguration';

export interface InteractiveChartOptions extends ChartOptions {
  plugins?: {
    zoom?: {
      pan?: {
        enabled: boolean;
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
      zoom?: {
        wheel?: {
          enabled: boolean;
          speed?: number;
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
            speed: 0.1,
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
        callbacks: customTooltip && baseConfig ? {
          title: (tooltipItems: TooltipItem<any>[]) => {
            if (baseConfig.tooltip?.title) {
              return baseConfig.tooltip.title(tooltipItems);
            }
            return tooltipItems[0]?.label || '';
          },
          label: (tooltipItem: TooltipItem<any>) => {
            if (baseConfig.tooltip?.label) {
              return baseConfig.tooltip.label(tooltipItem);
            }
            return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}`;
          },
          afterLabel: (tooltipItem: TooltipItem<any>) => {
            if (baseConfig.tooltip?.afterLabel) {
              return baseConfig.tooltip.afterLabel(tooltipItem);
            }
            return '';
          },
          footer: (tooltipItems: TooltipItem<any>[]) => {
            // Add data source information
            const dataPoint = tooltipItems[0];
            if (dataPoint?.dataset?.data) {
              const pointData = (dataPoint.dataset.data as any)[dataPoint.dataIndex];
              if (pointData?.dataSource) {
                return [`Source: ${pointData.dataSource}`, `Updated: ${pointData.lastUpdated || 'Unknown'}`];
              }
            }
            return ['Source: Live API Data'];
          },
        } : undefined,
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
