import { ChartData, SummaryCardData, TableData } from '../types/dashboard';

// Color palettes for charts
const CHART_COLORS = {
  primary: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)', 'rgba(54,162,235,1)', 'rgba(255,206,86,1)', 'rgba(153,102,255,1)'],
  background: ['rgba(75,192,192,0.2)', 'rgba(255,99,132,0.2)', 'rgba(54,162,235,0.2)', 'rgba(255,206,86,0.2)', 'rgba(153,102,255,0.2)'],
};

// Generate random number within range
const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate random float within range
const randomFloatInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Generate years array
const generateYears = (startYear: number = 2020, count: number = 5): number[] => {
  return Array.from({ length: count }, (_, i) => startYear + i);
};



// Generate quarters array
const generateQuarters = (): string[] => {
  return ['Q1', 'Q2', 'Q3', 'Q4'];
};

export function generateLineChartData(): ChartData {
  const years = generateYears(2019, 6);
  const datasets = [
    {
      label: 'Revenue (USD)',
      data: years.map(() => randomInRange(50000, 200000)),
      borderColor: CHART_COLORS.primary[0],
      backgroundColor: CHART_COLORS.background[0],
    },
    {
      label: 'Expenses (USD)',
      data: years.map(() => randomInRange(30000, 120000)),
      borderColor: CHART_COLORS.primary[1],
      backgroundColor: CHART_COLORS.background[1],
    }
  ];

  return { labels: years, datasets };
}

export function generateBarChartData(): ChartData {
  const quarters = generateQuarters();
  const datasets = [
    {
      label: 'Sales (USD)',
      data: quarters.map(() => randomInRange(80000, 250000)),
      borderColor: CHART_COLORS.primary[2],
      backgroundColor: CHART_COLORS.background[2],
    },
    {
      label: 'Target (USD)',
      data: quarters.map(() => randomInRange(100000, 300000)),
      borderColor: CHART_COLORS.primary[3],
      backgroundColor: CHART_COLORS.background[3],
    }
  ];

  return { labels: quarters, datasets };
}

export function generatePieChartData(): ChartData {
  const categories = ['Stocks', 'Bonds', 'Real Estate', 'Cash', 'Commodities'];
  const data = categories.map(() => randomFloatInRange(10, 40));
  
  return {
    labels: categories,
    datasets: [
      {
        label: 'Portfolio Allocation (%)',
        data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.background,
      }
    ]
  };
}

export function generateDoughnutChartData(): ChartData {
  const expenses = ['Housing', 'Transportation', 'Food', 'Healthcare', 'Entertainment', 'Other'];
  const data = expenses.map(() => randomFloatInRange(500, 3000));
  
  return {
    labels: expenses,
    datasets: [
      {
        label: 'Monthly Expenses (USD)',
        data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.background,
      }
    ]
  };
}

export function generateTableData(): TableData {
  const companies = ['Apple Inc.', 'Microsoft Corp.', 'Amazon.com Inc.', 'Alphabet Inc.', 'Tesla Inc.', 'Meta Platforms', 'NVIDIA Corp.', 'Berkshire Hathaway'];
  
  const columns = [
    { key: 'company', label: 'Company', type: 'text' as const, sortable: true },
    { key: 'symbol', label: 'Symbol', type: 'text' as const, sortable: true },
    { key: 'price', label: 'Price', type: 'currency' as const, sortable: true },
    { key: 'change', label: 'Change (%)', type: 'percentage' as const, sortable: true },
    { key: 'volume', label: 'Volume', type: 'number' as const, sortable: true },
    { key: 'marketCap', label: 'Market Cap', type: 'currency' as const, sortable: true },
  ];

  const symbols = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'TSLA', 'META', 'NVDA', 'BRK.A'];
  
  const rows = companies.map((company, index) => ({
    company,
    symbol: symbols[index],
    price: randomFloatInRange(50, 500),
    change: randomFloatInRange(-5, 5),
    volume: randomInRange(1000000, 50000000),
    marketCap: randomInRange(100000000000, 3000000000000),
  }));

  return { columns, rows };
}

export function generateSummaryCards(): SummaryCardData[] {
  return [
    {
      title: 'Total Portfolio Value',
      value: randomInRange(500000, 2000000),
      change: {
        value: randomFloatInRange(-10, 15),
        type: Math.random() > 0.5 ? 'increase' : 'decrease',
        period: 'vs last month'
      },
      icon: '💰',
      color: '#28a745'
    },
    {
      title: 'Monthly Income',
      value: randomInRange(8000, 25000),
      change: {
        value: randomFloatInRange(0, 8),
        type: 'increase',
        period: 'vs last month'
      },
      icon: '📈',
      color: '#007bff'
    },
    {
      title: 'Monthly Expenses',
      value: randomInRange(4000, 12000),
      change: {
        value: randomFloatInRange(-5, 3),
        type: Math.random() > 0.3 ? 'decrease' : 'increase',
        period: 'vs last month'
      },
      icon: '💸',
      color: '#dc3545'
    },
    {
      title: 'Savings Rate',
      value: `${randomInRange(15, 45)}%`,
      change: {
        value: randomFloatInRange(-2, 5),
        type: Math.random() > 0.4 ? 'increase' : 'neutral',
        period: 'vs last quarter'
      },
      icon: '🏦',
      color: '#ffc107'
    }
  ];
}

// Generate data based on element type
export function generateSampleData(elementType: string): ChartData | TableData | SummaryCardData[] | null {
  switch (elementType) {
    case 'line-chart':
      return generateLineChartData();
    case 'bar-chart':
      return generateBarChartData();
    case 'pie-chart':
      return generatePieChartData();
    case 'doughnut-chart':
      return generateDoughnutChartData();
    case 'data-table':
      return generateTableData();
    case 'summary-card':
      return generateSummaryCards();
    default:
      return null;
  }
}

// Generate appropriate titles for different element types
export function generateElementTitle(elementType: string): string {
  const titles = {
    'line-chart': ['Revenue Trends', 'Growth Over Time', 'Performance Metrics', 'Financial Timeline'],
    'bar-chart': ['Quarterly Comparison', 'Category Analysis', 'Performance by Period', 'Comparative Metrics'],
    'pie-chart': ['Portfolio Distribution', 'Asset Allocation', 'Category Breakdown', 'Composition Analysis'],
    'doughnut-chart': ['Expense Categories', 'Budget Allocation', 'Spending Distribution', 'Cost Breakdown'],
    'data-table': ['Financial Data', 'Stock Performance', 'Market Overview', 'Investment Summary'],
    'summary-card': ['Key Metrics', 'Financial Overview', 'Performance Summary', 'Dashboard Highlights']
  };

  const typeTitle = titles[elementType as keyof typeof titles] || ['New Element'];
  return typeTitle[Math.floor(Math.random() * typeTitle.length)];
}
