/**
 * Plain-language copy for users who don't understand financial jargon.
 * Use these labels and descriptions across the dashboard for a friendlier UX.
 */

export const DASHBOARD_COPY = {
  title: 'Finance Factors Dashboard',
  subtitle: 'See how the economy and costs that affect you change over time',
  loadingCharts: 'Loading your charts…',
  refreshAll: 'Refresh all',
  fasterLoading: 'Faster loading',
  fasterLoadingTooltip: 'Load all charts at once for a quicker experience',
  howToUseTitle: 'How to use',
  howToUseBlurb:
    'Scroll through the charts below to explore trends. Use the Data toggle (top right) to switch between sample data and up-to-date numbers from government sources. Each chart has a short “what it means” line under the title; use the zoom (±) and hand buttons, or Ctrl+scroll / pinch to zoom and drag to pan on a trackpad, and Add element to add more charts.',
} as const;

/** One-line "what this means" for each data type, for tooltips and Add Element modal */
export const CHART_PLAIN_DESCRIPTIONS: Record<string, string> = {
  'house-prices': 'How much typical home prices have changed over time.',
  'salary-income': 'Average pay over time — helps compare wages to cost of living.',
  'inflation-cpi': 'How much everyday prices (food, housing, etc.) have gone up over time.',
  'core-inflation': 'Inflation without food and energy — a smoother view of price trends.',
  'fed-balance-sheet': 'How much the central bank has lent or invested — affects interest rates.',
  'federal-funds-rate': 'The main interest rate the Fed sets — influences loans and savings rates.',
  'unemployment-rate': 'Share of people who want to work but don’t have a job.',
  'gdp-growth': 'How fast the economy is growing (or shrinking) each quarter.',
  'money-supply-m1': 'Cash and checking-type money in the economy.',
  'money-supply-m2': 'Broader measure of money, including savings and short-term deposits.',
  'treasury-10y': 'Interest rate on 10-year government bonds — a benchmark for mortgages and loans.',
  'treasury-2y': 'Interest rate on 2-year government bonds — often reflects expectations for the Fed.',
  'cost-of-living': 'How expensive it is to live in a place (housing, food, utilities).',
  'tuition-education': 'How college and education costs have changed over time.',
  'medical-costs': 'How healthcare and medical expenses have changed.',
  'childcare-costs': 'Cost of daycare and childcare over time.',
  'transportation-costs': 'Cost of cars, fuel, and getting around.',
  'food-prices': 'How much groceries and food cost over time.',
  'utilities-costs': 'Bills for electricity, gas, water, and other utilities.',
  'investment-returns': 'How investments like stocks have performed over time.',
};

/** Data source labels and tooltips for non-experts */
export const DATA_SOURCE_PLAIN_COPY = {
  historical: {
    name: 'Sample data',
    description: 'Example data so you can explore the dashboard. Good for trying things out.',
  },
  'live-api': {
    name: 'Up-to-date data',
    description: 'Recent numbers from government and public sources. Best for real-world trends.',
  },
} as const;

/** Chart control labels (zoom, pan, reset) for tooltips and aria-labels */
export const CHART_CONTROL_COPY = {
  zoom: 'Zoom in or out on the chart',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomHint: 'Pinch or Ctrl+scroll to zoom on trackpad',
  zoomOn: 'Zoom is on — scroll to zoom',
  zoomOff: 'Turn on zoom — scroll to zoom in or out',
  pan: 'Drag the chart to move around',
  panHint: 'Drag with pointer or trackpad to pan',
  panOn: 'Pan is on — drag to move',
  panOff: 'Turn on pan — drag to move the chart',
  resetView: 'Reset zoom and position',
  removeChart: 'Remove this chart',
  refreshData: 'Refresh this chart’s data',
  retryLiveData: 'Try loading up-to-date data again',
} as const;

/** Error and empty state messages */
export const ERROR_COPY = {
  unableToLoad: 'We couldn’t load this chart’s data.',
  noDataAvailable: 'No data is available for this chart right now.',
  noDataHint: 'Try again, or switch to sample data in the header to explore.',
  tryAgain: 'Try again',
  tryLoadingData: 'Try loading data',
  willUseSample: 'You can still use sample data to explore.',
  someSourcesFailed: 'Some charts couldn’t load. The rest are showing data.',
} as const;

/** Status pill / indicator descriptions (short, non-technical) */
export const STATUS_PLAIN_COPY: Record<string, { label: string; description: string }> = {
  'live-fred': { label: 'Live (Federal Reserve)', description: 'Up-to-date data from the Federal Reserve.' },
  'live-bls': { label: 'Live (Labor Stats)', description: 'Up-to-date data from the Bureau of Labor Statistics.' },
  'live-census': { label: 'Live (Census)', description: 'Up-to-date data from the U.S. Census Bureau.' },
  'live-alpha-vantage': { label: 'Live (Alpha Vantage)', description: 'Up-to-date financial data.' },
  'live-world-bank': { label: 'Live (World Bank)', description: 'Up-to-date data from the World Bank.' },
  'live-oecd': { label: 'Live (OECD)', description: 'Up-to-date data from OECD.' },
  'fallback-cached': { label: 'Cached', description: 'Showing recently saved data.' },
  'fallback-historical': { label: 'Sample data', description: 'Showing sample data so you can still explore.' },
  'fallback-synthetic': { label: 'Sample data', description: 'Showing sample data for demonstration.' },
  'degraded-partial': { label: 'Partial', description: 'Some sources are unavailable; showing what we have.' },
  'circuit-breaker-open': { label: 'Temporarily unavailable', description: 'Data source is briefly paused; try again soon.' },
  'rate-limited': { label: 'Slowed', description: 'Too many requests; we’ll retry shortly.' },
  recent: { label: 'Up to date', description: 'Data was updated recently.' },
  historical: { label: 'Sample data', description: 'Sample data for exploration.' },
  stale: { label: 'Outdated', description: 'This data may be old.' },
  loading: { label: 'Loading…', description: 'Fetching data…' },
};

/** AI insight section copy */
export const INSIGHT_COPY = {
  generateButton: '✦ What does this trend mean?',
  generateAriaLabel: 'Generate AI insight about this chart',
  sectionLabel: 'What does this mean?',
  loading: 'Analyzing the trend…',
  errorMessage: 'Could not generate an insight.',
  retry: 'Try again',
} as const;
