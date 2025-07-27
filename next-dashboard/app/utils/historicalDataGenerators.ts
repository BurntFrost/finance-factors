import { ChartData, SummaryCardData, TableData } from '../types/dashboard';

// Color palettes for charts
const CHART_COLORS = {
  primary: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)', 'rgba(54,162,235,1)', 'rgba(255,206,86,1)', 'rgba(153,102,255,1)'],
  background: ['rgba(75,192,192,0.2)', 'rgba(255,99,132,0.2)', 'rgba(54,162,235,0.2)', 'rgba(255,206,86,0.2)', 'rgba(153,102,255,0.2)'],
};

// Deterministic pseudo-random number generator using a seed
// This ensures consistent data generation across server and client
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  inRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  floatInRange(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

// Create a global seeded random instance for consistent data generation
const seededRandom = new SeededRandom(12345); // Fixed seed for consistency

// Generate random number within range (deterministic)
const randomInRange = (min: number, max: number): number => {
  return seededRandom.inRange(min, max);
};

// Generate random float within range (deterministic)
const randomFloatInRange = (min: number, max: number): number => {
  return seededRandom.floatInRange(min, max);
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

  return {
    labels: years,
    datasets,
    // Mark as historical data
    isRealData: false,
    dataSource: 'Historical Data Generator'
  };
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

  return {
    labels: quarters,
    datasets,
    // Mark as historical data
    isRealData: false,
    dataSource: 'Historical Data Generator'
  };
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
    ],
    // Mark as historical data
    isRealData: false,
    dataSource: 'Historical Data Generator'
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
    ],
    // Mark as historical data
    isRealData: false,
    dataSource: 'Historical Data Generator'
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

  return {
    columns,
    rows,
    // Mark as historical data
    isRealData: false,
    dataSource: 'Historical Data Generator'
  };
}

export function generateSummaryCards(): SummaryCardData[] {
  return [
    {
      title: 'Total Portfolio Value',
      value: randomInRange(500000, 2000000),
      change: {
        value: randomFloatInRange(-10, 15),
        type: seededRandom.next() > 0.5 ? 'increase' : 'decrease',
        period: 'vs last month'
      },
      icon: '💰',
      color: '#28a745',
      // Mark as historical data
      isRealData: false,
      dataSource: 'Historical Data Generator'
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
      color: '#007bff',
      // Mark as historical data
      isRealData: false,
      dataSource: 'Historical Data Generator'
    },
    {
      title: 'Monthly Expenses',
      value: randomInRange(4000, 12000),
      change: {
        value: randomFloatInRange(-5, 3),
        type: seededRandom.next() > 0.3 ? 'decrease' : 'increase',
        period: 'vs last month'
      },
      icon: '💸',
      color: '#dc3545',
      // Mark as historical data
      isRealData: false,
      dataSource: 'Historical Data Generator'
    },
    {
      title: 'Savings Rate',
      value: `${randomInRange(15, 45)}%`,
      change: {
        value: randomFloatInRange(-2, 5),
        type: seededRandom.next() > 0.4 ? 'increase' : 'neutral',
        period: 'vs last quarter'
      },
      icon: '🏦',
      color: '#ffc107',
      // Mark as historical data
      isRealData: false,
      dataSource: 'Historical Data Generator'
    }
  ];
}

// Generate data based on data type and visualization type
export function generateHistoricalDataByType(
  dataTypeId: string,
  visualizationType: string
): ChartData | TableData | SummaryCardData[] | null {
  switch (visualizationType) {
    case 'line-chart':
      return generateLineChartDataForType(dataTypeId);
    case 'bar-chart':
      return generateBarChartDataForType(dataTypeId);
    case 'pie-chart':
      return generatePieChartDataForType(dataTypeId);
    case 'doughnut-chart':
      return generateDoughnutChartDataForType(dataTypeId);
    case 'data-table':
      return generateTableDataForType(dataTypeId);
    case 'summary-card':
      return generateSummaryCardsForType(dataTypeId);
    default:
      return null;
  }
}

// Generate data based on element type (legacy support)
export function generateHistoricalData(elementType: string): ChartData | TableData | SummaryCardData[] | null {
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

// Generate appropriate titles based on data type and visualization
export function generateElementTitleByType(dataTypeId: string, visualizationType: string): string {
  const titleTemplates: Record<string, Record<string, string[]>> = {
    'house-prices': {
      'line-chart': ['House Price Trends Over Time', 'Real Estate Market Timeline', 'Housing Price Evolution'],
      'bar-chart': ['House Prices by Region', 'Property Values Comparison', 'Regional Housing Costs'],
      'pie-chart': ['Housing Market Segments', 'Property Type Distribution', 'Market Share by Price Range'],
      'doughnut-chart': ['Housing Cost Breakdown', 'Property Investment Allocation', 'Real Estate Portfolio'],
      'data-table': ['Housing Market Data', 'Property Price Analysis', 'Real Estate Statistics'],
      'summary-card': ['Housing Market Overview', 'Property Value Metrics', 'Real Estate Summary']
    },
    'salary-income': {
      'line-chart': ['Income Trends Over Time', 'Salary Growth Timeline', 'Wage Evolution'],
      'bar-chart': ['Income by Industry', 'Salary Comparison', 'Wage Distribution'],
      'pie-chart': ['Income Sources', 'Revenue Streams', 'Earnings Breakdown'],
      'doughnut-chart': ['Income Allocation', 'Salary Components', 'Compensation Structure'],
      'data-table': ['Salary Data Analysis', 'Income Statistics', 'Wage Information'],
      'summary-card': ['Income Overview', 'Salary Metrics', 'Earnings Summary']
    },
    'cost-of-living': {
      'line-chart': ['Cost of Living Trends', 'Living Expenses Over Time', 'Inflation Timeline'],
      'bar-chart': ['Living Costs by City', 'Regional Cost Comparison', 'Expense Categories'],
      'pie-chart': ['Living Expense Breakdown', 'Cost Distribution', 'Budget Allocation'],
      'doughnut-chart': ['Monthly Expenses', 'Living Cost Categories', 'Budget Components'],
      'data-table': ['Cost of Living Data', 'Expense Analysis', 'Living Cost Statistics'],
      'summary-card': ['Living Cost Overview', 'Expense Metrics', 'Budget Summary']
    }
  };

  const dataTypeTemplates = titleTemplates[dataTypeId];
  if (!dataTypeTemplates) {
    return generateElementTitle(visualizationType);
  }

  const visualizationTemplates = dataTypeTemplates[visualizationType];
  if (!visualizationTemplates) {
    return generateElementTitle(visualizationType);
  }

  return visualizationTemplates[Math.floor(seededRandom.next() * visualizationTemplates.length)];
}

// Generate appropriate titles for different element types (legacy support)
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
  return typeTitle[Math.floor(seededRandom.next() * typeTitle.length)];
}

// Data type-specific generators for line charts
function generateLineChartDataForType(dataTypeId: string): ChartData {
  const years = generateYears(2019, 6);

  switch (dataTypeId) {
    case 'house-prices':
      return {
        labels: years,
        datasets: [
          {
            label: 'Average House Price (USD)',
            data: years.map((_, i) => 250000 + i * 25000 + randomInRange(-10000, 15000)),
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: CHART_COLORS.background[0],
          },
          {
            label: 'Median House Price (USD)',
            data: years.map((_, i) => 220000 + i * 22000 + randomInRange(-8000, 12000)),
            borderColor: CHART_COLORS.primary[1],
            backgroundColor: CHART_COLORS.background[1],
          }
        ]
      };

    case 'salary-income':
      return {
        labels: years,
        datasets: [
          {
            label: 'Average Salary (USD)',
            data: years.map((_, i) => 50000 + i * 3000 + randomInRange(-2000, 4000)),
            borderColor: CHART_COLORS.primary[2],
            backgroundColor: CHART_COLORS.background[2],
          },
          {
            label: 'Median Salary (USD)',
            data: years.map((_, i) => 45000 + i * 2800 + randomInRange(-1500, 3500)),
            borderColor: CHART_COLORS.primary[3],
            backgroundColor: CHART_COLORS.background[3],
          }
        ]
      };

    case 'cost-of-living':
      return {
        labels: years,
        datasets: [
          {
            label: 'Cost of Living Index',
            data: years.map((_, i) => 100 + i * 2.5 + randomFloatInRange(-2, 4)),
            borderColor: CHART_COLORS.primary[4],
            backgroundColor: CHART_COLORS.background[4],
          }
        ]
      };

    // New Economic Indicators
    case 'inflation-cpi':
      return {
        labels: years,
        datasets: [
          {
            label: 'Consumer Price Index',
            data: years.map((_, i) => 250 + i * 6 + randomFloatInRange(-3, 8)), // Base 250, ~2.5% annual growth
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: CHART_COLORS.background[0],
          }
        ]
      };

    case 'core-inflation':
      return {
        labels: years,
        datasets: [
          {
            label: 'Core Inflation Rate (%)',
            data: years.map((_, i) => 2.0 + randomFloatInRange(-0.5, 1.5)), // Around 2% target
            borderColor: CHART_COLORS.primary[1],
            backgroundColor: CHART_COLORS.background[1],
          }
        ]
      };

    case 'fed-balance-sheet':
      return {
        labels: years,
        datasets: [
          {
            label: 'Fed Balance Sheet (Trillions USD)',
            data: years.map((_, i) => 4.0 + i * 0.8 + randomFloatInRange(-0.3, 0.5)), // Growing trend
            borderColor: CHART_COLORS.primary[2],
            backgroundColor: CHART_COLORS.background[2],
          }
        ]
      };

    case 'federal-funds-rate':
      return {
        labels: years,
        datasets: [
          {
            label: 'Federal Funds Rate (%)',
            data: years.map((_, i) => Math.max(0, 0.5 + i * 0.4 + randomFloatInRange(-0.3, 0.8))), // Gradual increase
            borderColor: CHART_COLORS.primary[3],
            backgroundColor: CHART_COLORS.background[3],
          }
        ]
      };

    case 'unemployment-rate':
      return {
        labels: years,
        datasets: [
          {
            label: 'Unemployment Rate (%)',
            data: years.map(() => 3.5 + randomFloatInRange(-1.0, 2.5)), // Around 3.5-6%
            borderColor: CHART_COLORS.primary[4],
            backgroundColor: CHART_COLORS.background[4],
          }
        ]
      };

    case 'gdp-growth':
      return {
        labels: years,
        datasets: [
          {
            label: 'GDP Growth Rate (%)',
            data: years.map(() => 2.5 + randomFloatInRange(-1.5, 2.0)), // Around 2-3% growth
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: CHART_COLORS.background[0],
          }
        ]
      };

    case 'money-supply-m1':
      return {
        labels: years,
        datasets: [
          {
            label: 'M1 Money Supply (Trillions USD)',
            data: years.map((_, i) => 3.5 + i * 0.6 + randomFloatInRange(-0.2, 0.4)), // Growing trend
            borderColor: CHART_COLORS.primary[1],
            backgroundColor: CHART_COLORS.background[1],
          }
        ]
      };

    case 'money-supply-m2':
      return {
        labels: years,
        datasets: [
          {
            label: 'M2 Money Supply (Trillions USD)',
            data: years.map((_, i) => 15.0 + i * 1.2 + randomFloatInRange(-0.5, 0.8)), // Growing trend
            borderColor: CHART_COLORS.primary[2],
            backgroundColor: CHART_COLORS.background[2],
          }
        ]
      };

    case 'treasury-10y':
      return {
        labels: years,
        datasets: [
          {
            label: '10-Year Treasury Yield (%)',
            data: years.map((_, i) => 2.0 + i * 0.3 + randomFloatInRange(-0.4, 0.6)), // Gradual increase
            borderColor: CHART_COLORS.primary[3],
            backgroundColor: CHART_COLORS.background[3],
          }
        ]
      };

    case 'treasury-2y':
      return {
        labels: years,
        datasets: [
          {
            label: '2-Year Treasury Yield (%)',
            data: years.map((_, i) => 1.5 + i * 0.4 + randomFloatInRange(-0.3, 0.5)), // Gradual increase
            borderColor: CHART_COLORS.primary[4],
            backgroundColor: CHART_COLORS.background[4],
          }
        ]
      };

    default:
      return generateLineChartData();
  }
}

// Data type-specific generators for bar charts
function generateBarChartDataForType(dataTypeId: string): ChartData {
  switch (dataTypeId) {
    case 'house-prices':
      const regions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West'];
      return {
        labels: regions,
        datasets: [
          {
            label: 'Average House Price (USD)',
            data: regions.map(() => randomInRange(200000, 500000)),
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: CHART_COLORS.background[0],
          }
        ]
      };

    case 'salary-income':
      const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing'];
      return {
        labels: industries,
        datasets: [
          {
            label: 'Average Salary (USD)',
            data: industries.map(() => randomInRange(40000, 120000)),
            borderColor: CHART_COLORS.primary[2],
            backgroundColor: CHART_COLORS.background[2],
          }
        ]
      };

    // New Economic Indicators for Bar Charts
    case 'inflation-cpi':
      const inflationPeriods = ['2019', '2020', '2021', '2022', '2023', '2024'];
      return {
        labels: inflationPeriods,
        datasets: [
          {
            label: 'Annual Inflation Rate (%)',
            data: inflationPeriods.map(() => randomFloatInRange(1.0, 6.0)),
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: CHART_COLORS.background[0],
          }
        ]
      };

    case 'unemployment-rate':
      const unemploymentRegions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West'];
      return {
        labels: unemploymentRegions,
        datasets: [
          {
            label: 'Regional Unemployment Rate (%)',
            data: unemploymentRegions.map(() => randomFloatInRange(2.5, 7.0)),
            borderColor: CHART_COLORS.primary[4],
            backgroundColor: CHART_COLORS.background[4],
          }
        ]
      };

    case 'gdp-growth':
      const gdpQuarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024'];
      return {
        labels: gdpQuarters,
        datasets: [
          {
            label: 'Quarterly GDP Growth (%)',
            data: gdpQuarters.map(() => randomFloatInRange(1.0, 4.5)),
            borderColor: CHART_COLORS.primary[0],
            backgroundColor: CHART_COLORS.background[0],
          }
        ]
      };

    default:
      return generateBarChartData();
  }
}

// Data type-specific generators for pie charts
function generatePieChartDataForType(dataTypeId: string): ChartData {
  switch (dataTypeId) {
    case 'cost-of-living':
      const expenses = ['Housing', 'Food', 'Transportation', 'Healthcare', 'Entertainment', 'Other'];
      return {
        labels: expenses,
        datasets: [
          {
            label: 'Monthly Expenses (USD)',
            data: expenses.map(() => randomFloatInRange(200, 1500)),
            borderColor: CHART_COLORS.primary,
            backgroundColor: CHART_COLORS.background,
          }
        ]
      };

    default:
      return generatePieChartData();
  }
}

// Data type-specific generators for doughnut charts
function generateDoughnutChartDataForType(dataTypeId: string): ChartData {
  return generatePieChartDataForType(dataTypeId); // Same logic as pie charts
}

// Data type-specific generators for tables
function generateTableDataForType(dataTypeId: string): TableData {
  switch (dataTypeId) {
    case 'house-prices':
      const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
      return {
        columns: [
          { key: 'city', label: 'City', type: 'text', sortable: true },
          { key: 'avgPrice', label: 'Avg Price', type: 'currency', sortable: true },
          { key: 'medianPrice', label: 'Median Price', type: 'currency', sortable: true },
          { key: 'change', label: 'YoY Change (%)', type: 'percentage', sortable: true },
          { key: 'inventory', label: 'Inventory', type: 'number', sortable: true },
        ],
        rows: cities.map(city => ({
          city,
          avgPrice: randomInRange(200000, 800000),
          medianPrice: randomInRange(180000, 750000),
          change: randomFloatInRange(-5, 15),
          inventory: randomInRange(500, 5000),
        }))
      };

    case 'salary-income':
      const jobs = ['Software Engineer', 'Data Scientist', 'Product Manager', 'Designer', 'Marketing Manager', 'Sales Rep', 'Accountant', 'Teacher'];
      return {
        columns: [
          { key: 'position', label: 'Position', type: 'text', sortable: true },
          { key: 'avgSalary', label: 'Avg Salary', type: 'currency', sortable: true },
          { key: 'medianSalary', label: 'Median Salary', type: 'currency', sortable: true },
          { key: 'growth', label: 'Growth (%)', type: 'percentage', sortable: true },
          { key: 'openings', label: 'Job Openings', type: 'number', sortable: true },
        ],
        rows: jobs.map(position => ({
          position,
          avgSalary: randomInRange(40000, 150000),
          medianSalary: randomInRange(35000, 140000),
          growth: randomFloatInRange(-2, 12),
          openings: randomInRange(100, 10000),
        }))
      };

    default:
      return generateTableData();
  }
}

// Data type-specific generators for summary cards
function generateSummaryCardsForType(dataTypeId: string): SummaryCardData[] {
  switch (dataTypeId) {
    case 'house-prices':
      return [
        {
          title: 'Average House Price',
          value: randomInRange(300000, 600000),
          change: {
            value: randomFloatInRange(-5, 15),
            type: seededRandom.next() > 0.3 ? 'increase' : 'decrease',
            period: 'vs last year'
          },
          icon: '🏠',
          color: '#28a745'
        },
        {
          title: 'Price per Sq Ft',
          value: randomInRange(150, 400),
          change: {
            value: randomFloatInRange(-3, 10),
            type: seededRandom.next() > 0.4 ? 'increase' : 'neutral',
            period: 'vs last year'
          },
          icon: '📐',
          color: '#007bff'
        },
        {
          title: 'Days on Market',
          value: randomInRange(20, 90),
          change: {
            value: randomFloatInRange(-20, 10),
            type: seededRandom.next() > 0.6 ? 'decrease' : 'increase',
            period: 'vs last year'
          },
          icon: '📅',
          color: '#ffc107'
        },
        {
          title: 'Inventory Level',
          value: `${randomFloatInRange(1.5, 6.0).toFixed(1)} months`,
          change: {
            value: randomFloatInRange(-15, 25),
            type: seededRandom.next() > 0.5 ? 'increase' : 'decrease',
            period: 'vs last year'
          },
          icon: '📊',
          color: '#dc3545'
        }
      ];

    case 'salary-income':
      return [
        {
          title: 'Average Salary',
          value: randomInRange(50000, 100000),
          change: {
            value: randomFloatInRange(0, 8),
            type: 'increase',
            period: 'vs last year'
          },
          icon: '💰',
          color: '#28a745'
        },
        {
          title: 'Median Income',
          value: randomInRange(45000, 85000),
          change: {
            value: randomFloatInRange(-1, 6),
            type: seededRandom.next() > 0.2 ? 'increase' : 'neutral',
            period: 'vs last year'
          },
          icon: '📈',
          color: '#007bff'
        }
      ];

    default:
      return generateSummaryCards();
  }
}
