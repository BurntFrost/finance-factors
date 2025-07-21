# Finance Factors Dashboard

A Next.js 15 dashboard application for visualizing financial and economic data with Chart.js, featuring real-time data from government APIs and interactive data source management.

## 🌟 Features

- **Real Financial Data**: Integration with FRED, BLS, Census Bureau, and Alpha Vantage APIs
- **Interactive Charts**: Dynamic Chart.js visualizations with hover effects and animations
- **Data Source Management**: Switch between sample data and live APIs with card flip animations
- **Responsive Design**: Optimized for desktop and mobile viewing
- **GitHub Pages Ready**: Optimized for static deployment
- **Performance Monitoring**: Web Vitals tracking and lazy loading

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd next-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure APIs (Optional)**
   ```bash
   # Copy environment template
   cp .env.example .env.local

   # Add your API keys for live data
   # See API_INTEGRATION.md for detailed setup
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Data Sources

### Live APIs (Free)
- **FRED API**: Housing prices, interest rates, GDP, unemployment
- **BLS API**: Employment data, wages, inflation statistics
- **Census Bureau**: Demographics, housing, income data
- **Alpha Vantage**: Additional economic indicators

### Sample Data
- Generated realistic financial data for demonstration
- Includes trends, volatility, and seasonal patterns
- Perfect for development and testing

## 🔧 Configuration

### API Setup
See [API_INTEGRATION.md](./API_INTEGRATION.md) for detailed setup instructions.

Quick setup for FRED API (recommended):
```bash
# Get free API key at: https://fred.stlouisfed.org/docs/api/api_key.html
NEXT_PUBLIC_FRED_API_KEY=your_key_here
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api
```

### Environment Variables
```bash
# Data source: 'sample' or 'live-api'
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=sample

# API Keys (optional)
NEXT_PUBLIC_FRED_API_KEY=your_fred_key
NEXT_PUBLIC_BLS_API_KEY=your_bls_key
NEXT_PUBLIC_CENSUS_API_KEY=your_census_key
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

## 🏗️ Architecture

Built with modern web technologies:
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Chart.js**: Interactive data visualizations
- **Tailwind CSS**: Utility-first styling
- **Context API**: Global state management

## 📈 Available Data Types

| Data Type | Description | Primary Source |
|-----------|-------------|----------------|
| House Prices | Case-Shiller Home Price Index | FRED |
| Salary Income | Average Hourly Earnings | BLS |
| Cost of Living | Consumer Price Index | BLS |
| Interest Rates | Federal Funds Rate | FRED |
| Unemployment | Unemployment Rate | FRED |
| GDP Growth | Gross Domestic Product | FRED |

## 🚀 Deployment

### GitHub Pages
```bash
npm run build
npm run export
```

### Vercel
```bash
npm run build
```

The app is optimized for static deployment and works with GitHub Pages out of the box.

## 📚 Documentation

- [API Integration Guide](./API_INTEGRATION.md) - Complete API setup and configuration
- [Data Source Feature](./DATA_SOURCE_FEATURE.md) - Interactive data source management
- [Environment Variables](./.env.example) - Configuration options

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- [Live Demo](https://your-username.github.io/finance-factors)
- [API Documentation](./API_INTEGRATION.md)
- [Next.js Documentation](https://nextjs.org/docs)
