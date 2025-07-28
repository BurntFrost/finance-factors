'use client';

import crossfilter from 'crossfilter2';
import { ChartData } from '../types/dashboard';

export interface CrossfilterDimension {
  id: string;
  name: string;
  accessor: (d: any) => any;
  type: 'time' | 'number' | 'string';
}

export interface CrossfilterGroup {
  dimension: CrossfilterDimension;
  reducer: 'sum' | 'count' | 'average' | 'min' | 'max';
  valueAccessor?: (d: any) => number;
}

export interface FilterState {
  dimensionId: string;
  range?: [any, any];
  values?: any[];
}

export class ChartCrossfilter {
  private cf: any;
  private dimensions: Map<string, any> = new Map();
  private groups: Map<string, any> = new Map();
  private filters: Map<string, FilterState> = new Map();
  private listeners: Set<(data: any) => void> = new Set();

  constructor(data: any[]) {
    this.cf = crossfilter(data);
  }

  /**
   * Add a dimension to the crossfilter
   */
  addDimension(dimension: CrossfilterDimension): void {
    const cfDimension = this.cf.dimension(dimension.accessor);
    this.dimensions.set(dimension.id, {
      ...dimension,
      cfDimension,
    });
  }

  /**
   * Add a group to a dimension
   */
  addGroup(dimensionId: string, group: CrossfilterGroup): void {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) {
      throw new Error(`Dimension ${dimensionId} not found`);
    }

    let cfGroup;
    switch (group.reducer) {
      case 'sum':
        cfGroup = dimension.cfDimension.group().reduceSum(
          group.valueAccessor || ((d: any) => 1)
        );
        break;
      case 'count':
        cfGroup = dimension.cfDimension.group().reduceCount();
        break;
      case 'average':
        cfGroup = dimension.cfDimension.group().reduce(
          (p: any, v: any) => {
            p.count++;
            p.sum += group.valueAccessor ? group.valueAccessor(v) : 1;
            p.avg = p.sum / p.count;
            return p;
          },
          (p: any, v: any) => {
            p.count--;
            p.sum -= group.valueAccessor ? group.valueAccessor(v) : 1;
            p.avg = p.count ? p.sum / p.count : 0;
            return p;
          },
          () => ({ count: 0, sum: 0, avg: 0 })
        );
        break;
      case 'min':
        cfGroup = dimension.cfDimension.group().reduce(
          (p: any, v: any) => {
            const val = group.valueAccessor ? group.valueAccessor(v) : 1;
            return p === null ? val : Math.min(p, val);
          },
          (p: any, v: any) => p, // Remove function - simplified
          () => null
        );
        break;
      case 'max':
        cfGroup = dimension.cfDimension.group().reduce(
          (p: any, v: any) => {
            const val = group.valueAccessor ? group.valueAccessor(v) : 1;
            return p === null ? val : Math.max(p, val);
          },
          (p: any, v: any) => p, // Remove function - simplified
          () => null
        );
        break;
      default:
        cfGroup = dimension.cfDimension.group().reduceCount();
    }

    this.groups.set(`${dimensionId}_${group.reducer}`, cfGroup);
  }

  /**
   * Apply a filter to a dimension
   */
  filter(dimensionId: string, filter: FilterState): void {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) {
      throw new Error(`Dimension ${dimensionId} not found`);
    }

    // Store filter state
    this.filters.set(dimensionId, filter);

    // Apply filter to crossfilter dimension
    if (filter.range) {
      dimension.cfDimension.filterRange(filter.range);
    } else if (filter.values) {
      dimension.cfDimension.filterFunction((d: any) => 
        filter.values!.includes(d)
      );
    } else {
      dimension.cfDimension.filterAll();
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Clear filter on a dimension
   */
  clearFilter(dimensionId: string): void {
    const dimension = this.dimensions.get(dimensionId);
    if (dimension) {
      dimension.cfDimension.filterAll();
      this.filters.delete(dimensionId);
      this.notifyListeners();
    }
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.dimensions.forEach((dimension) => {
      dimension.cfDimension.filterAll();
    });
    this.filters.clear();
    this.notifyListeners();
  }

  /**
   * Get filtered data
   */
  getFilteredData(): any[] {
    return this.cf.allFiltered();
  }

  /**
   * Get group data
   */
  getGroupData(dimensionId: string, reducer: string = 'count'): any[] {
    const group = this.groups.get(`${dimensionId}_${reducer}`);
    return group ? group.all() : [];
  }

  /**
   * Get dimension extent (min/max values)
   */
  getDimensionExtent(dimensionId: string): [any, any] | null {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) return null;

    const bottom = dimension.cfDimension.bottom(1);
    const top = dimension.cfDimension.top(1);
    
    if (bottom.length === 0 || top.length === 0) return null;

    return [
      dimension.accessor(bottom[0]),
      dimension.accessor(top[0])
    ];
  }

  /**
   * Add listener for filter changes
   */
  addListener(callback: (data: any) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: (data: any) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of data changes
   */
  private notifyListeners(): void {
    const filteredData = this.getFilteredData();
    this.listeners.forEach(callback => callback(filteredData));
  }

  /**
   * Get current filter states
   */
  getFilterStates(): Map<string, FilterState> {
    return new Map(this.filters);
  }

  /**
   * Convert filtered data to Chart.js format
   */
  toChartData(
    dimensionId: string,
    valueAccessor?: (d: any) => number,
    labelAccessor?: (d: any) => string
  ): ChartData {
    const filteredData = this.getFilteredData();
    
    const labels = filteredData.map(d => 
      labelAccessor ? labelAccessor(d) : d.label || d.x || d.date
    );
    
    const values = filteredData.map(d => 
      valueAccessor ? valueAccessor(d) : d.value || d.y
    );

    return {
      labels,
      datasets: [{
        label: 'Filtered Data',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      }],
      isRealData: true,
      lastUpdated: new Date(),
    };
  }

  /**
   * Dispose of the crossfilter instance
   */
  dispose(): void {
    this.listeners.clear();
    this.dimensions.clear();
    this.groups.clear();
    this.filters.clear();
    if (this.cf) {
      this.cf.remove();
    }
  }
}

/**
 * Create a crossfilter instance for financial data
 */
export function createFinancialCrossfilter(data: any[]): ChartCrossfilter {
  const cf = new ChartCrossfilter(data);

  // Add common financial dimensions
  cf.addDimension({
    id: 'date',
    name: 'Date',
    accessor: (d: any) => new Date(d.date || d.x),
    type: 'time',
  });

  cf.addDimension({
    id: 'value',
    name: 'Value',
    accessor: (d: any) => d.value || d.y,
    type: 'number',
  });

  // Add groups for common aggregations
  cf.addGroup('date', { dimension: cf.dimensions.get('date')!, reducer: 'count' });
  cf.addGroup('value', { dimension: cf.dimensions.get('value')!, reducer: 'average' });

  return cf;
}

/**
 * Utility to sync multiple charts with crossfilter
 */
export class MultiChartCrossfilter {
  private crossfilters: Map<string, ChartCrossfilter> = new Map();
  private chartUpdateCallbacks: Map<string, (data: ChartData) => void> = new Map();

  /**
   * Add a chart to the crossfilter system
   */
  addChart(
    chartId: string,
    data: any[],
    updateCallback: (data: ChartData) => void
  ): void {
    const cf = createFinancialCrossfilter(data);
    this.crossfilters.set(chartId, cf);
    this.chartUpdateCallbacks.set(chartId, updateCallback);

    // Listen for filter changes and update other charts
    cf.addListener((filteredData) => {
      this.updateOtherCharts(chartId, filteredData);
    });
  }

  /**
   * Apply filter from one chart to all others
   */
  applyFilter(sourceChartId: string, dimensionId: string, filter: FilterState): void {
    this.crossfilters.forEach((cf, chartId) => {
      if (chartId !== sourceChartId) {
        cf.filter(dimensionId, filter);
      }
    });
  }

  /**
   * Clear all filters across all charts
   */
  clearAllFilters(): void {
    this.crossfilters.forEach(cf => cf.clearAllFilters());
  }

  /**
   * Update other charts when one chart's filter changes
   */
  private updateOtherCharts(sourceChartId: string, filteredData: any[]): void {
    this.chartUpdateCallbacks.forEach((callback, chartId) => {
      if (chartId !== sourceChartId) {
        const cf = this.crossfilters.get(chartId);
        if (cf) {
          const chartData = cf.toChartData('date');
          callback(chartData);
        }
      }
    });
  }

  /**
   * Remove a chart from the crossfilter system
   */
  removeChart(chartId: string): void {
    const cf = this.crossfilters.get(chartId);
    if (cf) {
      cf.dispose();
      this.crossfilters.delete(chartId);
      this.chartUpdateCallbacks.delete(chartId);
    }
  }

  /**
   * Dispose of all crossfilter instances
   */
  dispose(): void {
    this.crossfilters.forEach(cf => cf.dispose());
    this.crossfilters.clear();
    this.chartUpdateCallbacks.clear();
  }
}
