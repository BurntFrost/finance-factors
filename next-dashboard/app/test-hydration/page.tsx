'use client';

import React from 'react';
import { generateHistoricalData } from '../utils/historicalDataGenerators';

export default function TestHydrationPage() {
  // Test if historical data generation is deterministic
  const data1 = generateHistoricalData('line-chart');
  const data2 = generateHistoricalData('line-chart');
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hydration Test Page</h1>
      <p>This page tests if data generation is deterministic.</p>
      
      <h2>First Generation:</h2>
      <pre>{JSON.stringify(data1, null, 2)}</pre>
      
      <h2>Second Generation:</h2>
      <pre>{JSON.stringify(data2, null, 2)}</pre>
      
      <h2>Are they identical?</h2>
      <p>{JSON.stringify(data1) === JSON.stringify(data2) ? 'YES - Deterministic!' : 'NO - Still random!'}</p>
    </div>
  );
}
