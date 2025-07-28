'use client';

/**
 * Test Isolation Page
 * 
 * This page demonstrates that individual component refreshes are isolated
 * from global state and don't affect other components.
 */

import React from 'react';
import IsolationTestComponent from '../components/IsolationTestComponent';
import { ExtendedDataSourceProvider } from '../context/ExtendedDataSourceContext';
import { ViewModeProvider } from '../context/ViewModeContext';

export default function TestIsolationPage() {
  return (
    <ViewModeProvider>
      <ExtendedDataSourceProvider>
        <div style={{ padding: '20px' }}>
          <h1>Component Isolation Test</h1>
          <p>
            This page tests that individual component refreshes are isolated from global state.
            When you refresh one component, it should only affect that specific component&apos;s loading state,
            not the global loading state or other components.
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '16px',
            marginTop: '20px' 
          }}>
            <IsolationTestComponent
              componentId="test-component-1"
              dataType="house-prices"
              title="House Prices Component"
            />
            
            <IsolationTestComponent
              componentId="test-component-2"
              dataType="salary-income"
              title="Salary Income Component"
            />
            
            <IsolationTestComponent
              componentId="test-component-3"
              dataType="cost-of-living"
              title="Cost of Living Component"
            />
            
            <IsolationTestComponent
              componentId="test-component-4"
              dataType="investment-returns"
              title="Investment Returns Component"
            />
          </div>

          <div style={{ 
            marginTop: '40px', 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px' 
          }}>
            <h2>Test Instructions</h2>
            <ol>
              <li>Click &quot;Refresh This Component&quot; on any component above</li>
              <li>Observe that only that component shows a loading state (blue background)</li>
              <li>Verify that the &quot;Global Loading&quot; status remains &quot;❌ NO&quot; for all components</li>
              <li>Confirm that other components are not affected by the refresh</li>
              <li>Check that each component maintains its own refresh count independently</li>
            </ol>
            
            <h3>Expected Behavior</h3>
            <ul>
              <li>✅ Individual component loading states should be isolated</li>
              <li>✅ Global loading state should remain false during component refreshes</li>
              <li>✅ Other components should not be affected by individual refreshes</li>
              <li>✅ Each component should maintain its own state independently</li>
            </ul>
          </div>
        </div>
      </ExtendedDataSourceProvider>
    </ViewModeProvider>
  );
}
