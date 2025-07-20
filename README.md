# Finance Factors Dashboard

A high-performance Next.js dashboard application that visualizes financial data trends including house prices and household income over time. Built with modern web technologies and optimized for GitHub Pages deployment.

## 🚀 Features

- **Interactive Charts**: Dynamic line charts showing financial trends using Chart.js
- **Performance Optimized**: Lazy loading, code splitting, and Web Vitals monitoring
- **Responsive Design**: Mobile-first approach with optimized layouts
- **Static Export**: Configured for GitHub Pages deployment
- **Modern Stack**: Next.js 15, React 18, TypeScript, and Chart.js

## 📊 Data Visualization

The dashboard currently displays:
- **Average House Prices**: 30-year trend from 1994-2023
- **Household Income**: Corresponding income trends over the same period

## 🛠 Technology Stack

- **Framework**: Next.js 15.4.2 with App Router
- **Language**: TypeScript
- **Charts**: Chart.js 4.5.0 with react-chartjs-2
- **Styling**: CSS Modules with responsive design
- **Performance**: Web Vitals monitoring and analytics
- **Deployment**: GitHub Pages with automated CI/CD

## 🏗 Architecture

### Performance Optimizations
- **Lazy Loading**: Chart components are loaded on-demand
- **Code Splitting**: Separate chunks for React, Chart.js, and application code
- **Bundle Analysis**: Built-in webpack bundle analyzer
- **Web Vitals**: Real-time performance monitoring
- **Font Optimization**: Geist fonts with display swap

### Project Structure
```
next-dashboard/
├── app/
│   ├── components/
│   │   ├── LazyChart.tsx       # Lazy-loaded chart component
│   │   ├── ChartRegistration.tsx # Chart.js registration
│   │   └── WebVitals.tsx       # Performance monitoring
│   ├── lib/
│   │   └── analytics.ts        # Web Vitals and performance tracking
│   ├── layout.tsx              # Root layout with optimizations
│   ├── page.tsx                # Main dashboard page
│   └── globals.css             # Global styles
├── next.config.ts              # Next.js configuration
└── package.json                # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20 or higher
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run build:analyze` - Build with bundle analysis
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📈 Performance Features

### Web Vitals Monitoring
The application tracks Core Web Vitals:
- **CLS** (Cumulative Layout Shift)
- **INP** (Interaction to Next Paint)
- **FCP** (First Contentful Paint)
- **LCP** (Largest Contentful Paint)
- **TTFB** (Time to First Byte)

### Bundle Optimization
- Chart.js components are lazy-loaded to reduce initial bundle size
- Separate chunks for React and Chart.js libraries
- Optimized font loading with preconnect hints
- Static export for optimal GitHub Pages performance

## 🌐 Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions:

1. **Build Process**: Runs on every push to main branch
2. **Optimization**: Includes linting, building, and performance optimizations
3. **Static Export**: Generates optimized static files
4. **Deployment**: Automatically deploys to GitHub Pages

Live demo: [https://burntfrost.github.io/finance-factors/](https://burntfrost.github.io/finance-factors/)

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Set to 'production' for optimized builds
- `ANALYZE`: Set to 'true' to enable bundle analysis

### Next.js Configuration
- Static export enabled for GitHub Pages
- Asset prefix configured for proper routing
- Webpack optimizations for code splitting
- Image optimization disabled for static export

## 📝 Development Notes

### Adding New Charts
1. Create chart data in `app/page.tsx`
2. Use the `LazyChart` component for optimal performance
3. Ensure Chart.js components are registered in `ChartRegistration.tsx`

### Performance Monitoring
- Web Vitals are logged to console in development
- Production analytics can be configured in `lib/analytics.ts`
- Performance Observer tracks navigation timing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Web Vitals](https://web.dev/vitals/)
- [GitHub Pages](https://pages.github.com/)