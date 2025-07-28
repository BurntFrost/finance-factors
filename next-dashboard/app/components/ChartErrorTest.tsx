'use client';

import React, { useState } from 'react';
import DynamicChart from './DynamicChart';
import { ChartData } from '../types/dashboard';

/**
 * Test component to verify Chart.js error handling
 * This component can be used to test the "_fn is not a function" fix
 */
export default function ChartErrorTest() {
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState<'line-chart' | 'bar-chart' | 'pie-chart'>('line-chart');

  // Sample data that might trigger animation errors
  const testData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Test Data',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Test Data 2',
        data: [7, 11, 5, 8, 3, 7],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  const handleToggleChart = () => {
    setShowChart(!showChart);
  };

  const handleChangeType = () => {
    const types: ('line-chart' | 'bar-chart' | 'pie-chart')[] = ['line-chart', 'bar-chart', 'pie-chart'];
    const currentIndex = types.indexOf(chartType);
    const nextIndex = (currentIndex + 1) % types.length;
    setChartType(types[nextIndex]);
  };

  const handleTriggerError = () => {
    // Force re-render to potentially trigger animation errors
    setShowChart(false);
    setTimeout(() => setShowChart(true), 100);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={handleToggleChart}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showChart ? 'Hide Chart' : 'Show Chart'}
        </button>
        
        <button
          onClick={handleChangeType}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Change Type ({chartType})
        </button>
        
        <button
          onClick={handleTriggerError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Test Error Handling
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p>This component tests Chart.js error handling, particularly the "_fn is not a function" error.</p>
        <p>Check the browser console for any Chart.js errors that should now be handled gracefully.</p>
      </div>

      {showChart && (
        <div className="h-96">
          <DynamicChart
            type={chartType}
            data={testData}
            title="Chart Error Test"
            dataType="test-data"
            config={{
              animation: {
                duration: 750,
                easing: 'easeInOutQuart',
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
