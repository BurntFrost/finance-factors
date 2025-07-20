import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

// Function to send analytics data
function sendToAnalytics(metric: Metric) {
  // In a real application, you would send this to your analytics service
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }
  
  // Example: Send to Google Analytics 4
  // gtag('event', metric.name, {
  //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  //   event_category: 'Web Vitals',
  //   event_label: metric.id,
  //   non_interaction: true,
  // });
}

// Initialize Web Vitals tracking
export function initWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics); // INP replaces FID in newer web-vitals
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// Performance observer for additional metrics
export function initPerformanceObserver() {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // Observe navigation timing
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          // Log key timing metrics
          console.log('Navigation Timing:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstByte: navEntry.responseStart - navEntry.requestStart,
            domInteractive: navEntry.domInteractive - navEntry.fetchStart,
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
}
