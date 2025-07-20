'use client';

import { useEffect } from 'react';
import { initWebVitals, initPerformanceObserver } from '../lib/analytics';

export default function WebVitals() {
  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals();
    
    // Initialize performance observer
    initPerformanceObserver();
  }, []);

  // This component doesn't render anything
  return null;
}
