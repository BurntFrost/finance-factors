import { DataType, VisualizationType } from '../types/dashboard';

// Financial data types available in the dashboard
export const DATA_TYPES: DataType[] = [
  {
    id: 'house-prices',
    name: 'House Prices',
    description: 'Real estate market data and housing price trends',
    icon: '🏠',
    category: 'financial'
  },
  {
    id: 'salary-income',
    name: 'Salary/Income',
    description: 'Wage trends, salary data, and income statistics',
    icon: '💰',
    category: 'personal'
  },
  {
    id: 'cost-of-living',
    name: 'Cost of Living',
    description: 'Living expenses, inflation, and cost indices',
    icon: '🛒',
    category: 'economic'
  },
  {
    id: 'tuition-education',
    name: 'Tuition/Education Costs',
    description: 'Educational expenses and tuition fee trends',
    icon: '🎓',
    category: 'personal'
  },
  {
    id: 'medical-costs',
    name: 'Medical Costs',
    description: 'Healthcare expenses and medical cost trends',
    icon: '🏥',
    category: 'personal'
  },
  {
    id: 'childcare-costs',
    name: 'Childcare Costs',
    description: 'Childcare expenses and daycare cost trends',
    icon: '👶',
    category: 'personal'
  },
  {
    id: 'transportation-costs',
    name: 'Transportation Costs',
    description: 'Vehicle costs, fuel prices, and transport expenses',
    icon: '🚗',
    category: 'personal'
  },
  {
    id: 'food-prices',
    name: 'Food Prices',
    description: 'Grocery costs and food price inflation',
    icon: '🍎',
    category: 'economic'
  },
  {
    id: 'utilities-costs',
    name: 'Utilities Costs',
    description: 'Energy bills, water, and utility expenses',
    icon: '⚡',
    category: 'personal'
  },
  {
    id: 'investment-returns',
    name: 'Investment Returns',
    description: 'Stock market performance and investment data',
    icon: '📈',
    category: 'financial'
  }
];

// Visualization types available for dashboard elements
export const VISUALIZATION_TYPES: VisualizationType[] = [
  {
    id: 'line-chart',
    name: 'Line Chart',
    description: 'Perfect for showing trends over time',
    icon: '📈',
    category: 'chart',
    suitableFor: ['house-prices', 'salary-income', 'cost-of-living', 'tuition-education', 'medical-costs', 'childcare-costs', 'transportation-costs', 'food-prices', 'utilities-costs', 'investment-returns']
  },
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'Great for comparing values across categories',
    icon: '📊',
    category: 'chart',
    suitableFor: ['house-prices', 'salary-income', 'cost-of-living', 'tuition-education', 'medical-costs', 'childcare-costs', 'transportation-costs', 'food-prices', 'utilities-costs']
  },
  {
    id: 'pie-chart',
    name: 'Pie Chart',
    description: 'Ideal for showing proportional data',
    icon: '🥧',
    category: 'chart',
    suitableFor: ['cost-of-living', 'transportation-costs', 'food-prices', 'utilities-costs']
  },
  {
    id: 'doughnut-chart',
    name: 'Doughnut Chart',
    description: 'Display proportional data with center space',
    icon: '🍩',
    category: 'chart',
    suitableFor: ['cost-of-living', 'transportation-costs', 'food-prices', 'utilities-costs']
  },
  {
    id: 'data-table',
    name: 'Data Table',
    description: 'Display detailed data in tabular format',
    icon: '📋',
    category: 'data',
    suitableFor: ['house-prices', 'salary-income', 'cost-of-living', 'tuition-education', 'medical-costs', 'childcare-costs', 'transportation-costs', 'food-prices', 'utilities-costs', 'investment-returns']
  },
  {
    id: 'summary-card',
    name: 'Card/Metric',
    description: 'Show key metrics and single values',
    icon: '📄',
    category: 'widget',
    suitableFor: ['house-prices', 'salary-income', 'cost-of-living', 'tuition-education', 'medical-costs', 'childcare-costs', 'transportation-costs', 'food-prices', 'utilities-costs', 'investment-returns']
  }
];

// Helper function to get suitable visualizations for a data type
export function getSuitableVisualizations(dataTypeId: string): VisualizationType[] {
  return VISUALIZATION_TYPES.filter(viz => viz.suitableFor.includes(dataTypeId));
}

// Helper function to get data type by id
export function getDataTypeById(id: string): DataType | undefined {
  return DATA_TYPES.find(dataType => dataType.id === id);
}

// Helper function to get visualization type by id
export function getVisualizationTypeById(id: string): VisualizationType | undefined {
  return VISUALIZATION_TYPES.find(viz => viz.id === id);
}
