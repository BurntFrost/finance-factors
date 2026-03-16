import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParallelDashboard from '../ParallelDashboard';
import { AutomaticDataSourceProvider } from '../../context/AutomaticDataSourceContext';

// Mock the useParallelDashboardData hook
jest.mock('../../hooks/useParallelDashboardData', () => ({
  useStandardDashboardData: jest.fn(),
}));

// Mock CSS modules
jest.mock('../ParallelDashboard.module.css', () => ({
  container: 'container',
  loadingProgress: 'loadingProgress',
  progressBar: 'progressBar',
  progressFill: 'progressFill',
  progressText: 'progressText',
  controls: 'controls',
  refreshButton: 'refreshButton',
  errorSummary: 'errorSummary',
  stats: 'stats',
  chartsGrid: 'chartsGrid',
  chartContainer: 'chartContainer',
  chartHeader: 'chartHeader',
  chartTitle: 'chartTitle',
  removeButton: 'removeButton',
  chartContent: 'chartContent',
  loadingContainer: 'loadingContainer',
  spinner: 'spinner',
  skeletonHeader: 'skeletonHeader',
  skeletonChart: 'skeletonChart',
  performanceInfo: 'performanceInfo',
  performanceDetails: 'performanceDetails',
}));

// Mock AutomaticChart component
jest.mock('../AutomaticChart', () => {
  return function MockAutomaticChart() {
    return <div data-testid="mock-chart">Mock Chart</div>;
  };
});

const { useStandardDashboardData } = require('../../hooks/useParallelDashboardData');

describe('ParallelDashboard Progress Bar Fix', () => {
  const mockHookReturn = {
    data: {},
    dataSourceStatus: {} as Record<string, 'live' | 'historical-fallback' | null>,
    isLoading: false,
    errors: {},
    lastUpdated: {},
    isAnyLoading: false,
    hasAnyError: false,
    refreshAll: jest.fn(),
    refreshSingle: jest.fn(),
    getLoadingProgress: () => ({ completed: 0, total: 12, percentage: 0 }),
    isInitialLoad: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useStandardDashboardData.mockReturnValue(mockHookReturn);
  });

  it('should not show progress bar when isInitialLoad is false, even if loading states are true', () => {
    // Simulate background retry scenario
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
      isAnyLoading: true,
      isInitialLoad: false, // This is the key - not initial load
    });

    render(
      <AutomaticDataSourceProvider>
        <ParallelDashboard showLoadingProgress={true} />
      </AutomaticDataSourceProvider>
    );

    // Progress bar should NOT be visible
    expect(screen.queryByText(/Loading dashboard data/)).not.toBeInTheDocument();
  });

  it('should show progress bar when isInitialLoad is true and loading states are true', () => {
    // Simulate initial load scenario
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
      isAnyLoading: true,
      isInitialLoad: true, // This is the key - initial load
      getLoadingProgress: () => ({ completed: 3, total: 12, percentage: 25 }),
    });

    render(
      <AutomaticDataSourceProvider>
        <ParallelDashboard showLoadingProgress={true} />
      </AutomaticDataSourceProvider>
    );

    // Progress bar should be visible
    expect(screen.getByText(/Loading dashboard data/)).toBeInTheDocument();
    expect(screen.getByText(/3\/12 \(25%\)/)).toBeInTheDocument();
  });

  it('should hide progress bar when isInitialLoad becomes false after initial load completes', async () => {
    // Start with initial load
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
      isAnyLoading: true,
      isInitialLoad: true,
      getLoadingProgress: () => ({ completed: 0, total: 12, percentage: 0 }),
    });

    const { rerender } = render(
      <AutomaticDataSourceProvider>
        <ParallelDashboard showLoadingProgress={true} />
      </AutomaticDataSourceProvider>
    );

    // Progress bar should be visible initially
    expect(screen.getByText(/Loading dashboard data/)).toBeInTheDocument();

    // Simulate completion of initial load
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isLoading: false,
      isAnyLoading: false,
      isInitialLoad: false, // Initial load completed
      getLoadingProgress: () => ({ completed: 12, total: 12, percentage: 100 }),
    });

    rerender(
      <AutomaticDataSourceProvider>
        <ParallelDashboard showLoadingProgress={true} />
      </AutomaticDataSourceProvider>
    );

    // Progress bar should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard data/)).not.toBeInTheDocument();
    });
  });

  it('should not show progress bar when showLoadingProgress is false', () => {
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
      isAnyLoading: true,
      isInitialLoad: true,
    });

    render(
      <AutomaticDataSourceProvider>
        <ParallelDashboard showLoadingProgress={false} />
      </AutomaticDataSourceProvider>
    );

    // Progress bar should not be visible
    expect(screen.queryByText(/Loading dashboard data/)).not.toBeInTheDocument();
  });

  it('should show refresh button as disabled when loading', () => {
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isAnyLoading: true,
    });

    render(
      <AutomaticDataSourceProvider>
        <ParallelDashboard />
      </AutomaticDataSourceProvider>
    );

    const refreshButton = screen.getByText('Refreshing...');
    expect(refreshButton).toBeDisabled();
  });

  it('should show refresh button as enabled when not loading', () => {
    useStandardDashboardData.mockReturnValue({
      ...mockHookReturn,
      isAnyLoading: false,
    });

    render(
      <AutomaticDataSourceProvider>
        <ParallelDashboard />
      </AutomaticDataSourceProvider>
    );

    const refreshButton = screen.getByText('Refresh All Data');
    expect(refreshButton).not.toBeDisabled();
  });
});
