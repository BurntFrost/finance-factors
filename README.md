# Finance Factors Dashboard

A comprehensive Next.js 15 dashboard application for visualizing real-time financial and economic data with advanced interactive features, modern UI components, and enterprise-grade architecture including database integration, GraphQL API, and WebSocket support.

## 🌟 Key Features

### **Core Capabilities**

- **🔴 Live Government APIs**: Real-time data from FRED, BLS, Census Bureau, Alpha Vantage
- **📊 Advanced Interactive Charts**: Chart.js 4.5.0 with zoom, pan, crossfilter, and real-time updates
- **🎨 Modern UI Framework**: shadcn/ui components with Tailwind CSS and comprehensive design system
- **🔄 Smart Data Management**: Automatic fallback with Redis caching, PostgreSQL persistence, and intelligent retry logic
- **🚀 Enterprise Architecture**: GraphQL API, WebSocket real-time updates, and Prisma ORM integration

### **Advanced Features**

- **🎛️ Interactive Dashboard**: Drag & drop layout, resizable panels, and customizable visualizations
- **📈 Real-time Data Streaming**: WebSocket connections with live chart updates and status indicators
- **🗄️ Database Integration**: PostgreSQL with Prisma ORM for user management, dashboards, and audit logging
- **🔍 GraphQL API**: Apollo Server with comprehensive schema and performance monitoring
- **📊 Data Analysis Tools**: Crossfilter integration, comparison mode, and correlation analysis
- **📤 Export Capabilities**: Multi-format export (CSV, PDF, images) with bulk operations

### **Performance & Quality**

- **⚡ Performance Optimized**: Advanced bundle splitting, lazy loading, and compression with monitoring
- **♿ Accessibility First**: WCAG 2.1 AA compliance with full keyboard navigation and screen reader support
- **🛡️ Security & Reliability**: API proxy architecture, rate limiting, comprehensive error handling
- **🔧 TypeScript Strict**: Full type safety with layered architecture and comprehensive interfaces
- **🚀 Automatic Deployment**: GitHub Actions → Vercel with preview deployments and health monitoring

## 🌐 Live Demo & Status

**🌐 [View Live Dashboard](https://finance-factors.vercel.app/)**

### Current Deployment Status
- ✅ **Production**: https://finance-factors.vercel.app
- ✅ **API Health**: https://finance-factors.vercel.app/api/proxy/health
- ✅ **Auto-Deploy**: GitHub Actions → Vercel (active)
- ✅ **Preview Deployments**: Automatic for pull requests
- ✅ **API Services**: FRED ✅ | BLS ✅ | Census ✅ | Alpha Vantage ⚠️

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Prerequisites

- **Node.js 18+** (Node.js 20+ recommended for optimal performance)
- **Package Manager**: npm, yarn, or pnpm
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start development server with Turbopack | Local development |
| `npm run build` | Build for production | Standard production build |
| `npm run build:analyze` | Build with bundle analysis | Performance optimization |
| `npm run start` | Start production server | Production server deployment |
| `npm run lint` | Run ESLint | Code quality checks |
| `npm run test:apis` | Test API connectivity | API troubleshooting |
| `npm run deploy` | Show deployment status | Check GitHub Actions deployment |
| `npm run deploy:manual` | Manual Vercel deployment | Emergency deployment |

## 📊 Available Data Sources

| Data Type | Source | Description | Frequency | Status |
|-----------|--------|-------------|-----------|---------|
| House Prices | FRED API | Case-Shiller Home Price Index | Monthly | ✅ Active |
| Employment | BLS API | Wages, unemployment rates | Monthly | ✅ Active |
| Economic Indicators | FRED API | GDP, interest rates, inflation | Monthly/Quarterly | ✅ Active |
| Demographics | Census Bureau | Population, income statistics | Annual | ✅ Active |
| Additional Indicators | Alpha Vantage | Stock data, forex | Daily | ⚠️ Optional |

## 🛠 Technology Stack

### **Core Framework & Runtime**

- **Framework**: Next.js 15.4.2 with App Router and Turbopack support
- **Runtime**: React 19.1.0 with enhanced concurrent features
- **Language**: TypeScript 5.x with strict mode and comprehensive type definitions
- **Node.js**: Optimized for 18+ (20+ recommended for optimal performance)

### **Frontend Architecture**

- **UI Framework**: shadcn/ui with Radix UI primitives and Tailwind CSS 4.1.11
- **Visualization**: Chart.js 4.5.0 with react-chartjs-2 5.3.0 and advanced interactive features
- **Styling**: Dual approach - Tailwind CSS + CSS Modules with comprehensive design system
- **State Management**: React Context API with five specialized providers:
  - `DashboardProvider` - Dashboard element management and layout
  - `AutomaticDataSourceProvider` - Intelligent data source switching
  - `ViewModeProvider` - Edit/Live/Preview mode management
  - `ThemeProvider` - Dark/light mode with system preference detection
  - `CrossfilterProvider` - Cross-chart data filtering and analysis
- **Interactive Features**: @dnd-kit for drag & drop, react-resizable-panels, chartjs-plugin-zoom
- **Performance**: Lazy loading, code splitting, Suspense boundaries, and advanced bundle optimization

### **Backend & Database Architecture**

- **Database**: PostgreSQL with Prisma ORM 6.12.0
- **GraphQL**: Apollo Server 5.0.0 with comprehensive schema and performance monitoring
- **WebSocket**: ws 8.18.3 for real-time data streaming and live updates
- **Caching**: Multi-layer strategy with Redis 5.6.1 and intelligent TTL management
- **API Proxy**: Next.js API routes with CORS resolution, rate limiting, and security
- **Data Sources**: Government APIs (FRED, BLS, Census Bureau, Alpha Vantage)
- **Error Handling**: Comprehensive error boundaries, retry logic, and fallback mechanisms

### **Advanced Features & Integrations**

- **Data Analysis**: crossfilter2 1.5.4 for cross-chart filtering and correlation analysis
- **Export Capabilities**: jspdf 3.0.1, html2canvas 1.4.1, papaparse 5.5.3 for multi-format export
- **Date Handling**: date-fns 4.1.0 with chartjs-adapter-date-fns for time-series data
- **Real-time Features**: WebSocket connections with subscription management and auto-reconnection
- **Performance Monitoring**: Built-in metrics collection, health checks, and bundle analysis

### **Development & Quality Tools**

- **Build System**: Next.js with Turbopack for development, advanced webpack optimization for production
- **Code Quality**: ESLint 9.x with Next.js 15 configuration and TypeScript strict mode
- **Bundle Analysis**: @next/bundle-analyzer with performance monitoring and optimization
- **Testing**: Comprehensive API connectivity tests, health checks, and deployment verification
- **Database Tools**: Prisma Studio, migrations, and seeding with full-text search support
- **Deployment**: GitHub Actions CI/CD → Vercel with automated preview deployments and monitoring

## 🏗 System Architecture

### **Architecture Overview**

The Finance Factors Dashboard follows a modern layered architecture with enterprise-grade features and clear separation of concerns.

```text
┌─────────────────────────────────────────────────────────────┐
│                Next.js 15 App Router + React 19            │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (shadcn/ui + Tailwind CSS)                       │
│  ├── Interactive Charts (Chart.js + zoom/pan/crossfilter)  │
│  ├── Modern Components (Radix UI primitives)               │
│  ├── Drag & Drop Dashboard (@dnd-kit)                      │
│  └── Real-time Status Indicators                           │
├─────────────────────────────────────────────────────────────┤
│  Context Providers (Global State Management)               │
│  ├── DashboardProvider (Element & layout management)       │
│  ├── AutomaticDataSourceProvider (Smart data switching)    │
│  ├── ViewModeProvider (Edit/Live mode toggle)              │
│  ├── ThemeProvider (Dark/light mode)                       │
│  └── CrossfilterProvider (Cross-chart filtering)           │
├─────────────────────────────────────────────────────────────┤
│  Component Layer                                            │
│  ├── AutomaticChart (Smart chart with advanced features)   │
│  ├── DynamicElementRenderer (Dynamic dashboard elements)   │
│  ├── DataStatusPill (Real-time status indicators)         │
│  └── Export/Analysis Tools (PDF, CSV, image export)       │
├─────────────────────────────────────────────────────────────┤
│  Hooks Layer (Custom React Hooks)                          │
│  ├── useAutomaticDataSource (Smart data fetching)         │
│  ├── useDashboard (Dashboard state management)            │
│  ├── useChartDataSource (Chart-specific data)             │
│  └── useIsolatedDataSource (Component-isolated data)      │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Next.js App Router)                            │
│  ├── GraphQL API (Apollo Server + comprehensive schema)    │
│  ├── REST Proxy (/api/proxy/data - unified data endpoint)  │
│  ├── WebSocket (/api/ws - real-time data streaming)        │
│  └── Health Checks (/api/health - monitoring endpoints)    │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Data & API Management)                    │
│  ├── Proxy Services (FRED, BLS, Census, Alpha Vantage)     │
│  ├── Data Transformers (Standardization pipeline)         │
│  ├── Cache Management (Redis + compression)               │
│  └── Rate Limiting & Error Handling                       │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (PostgreSQL + Prisma)                      │
│  ├── User Management & Authentication                      │
│  ├── Dashboard Persistence & Sharing                       │
│  ├── Performance Metrics & Audit Logging                  │
│  └── Cache Storage & Rate Limit Tracking                  │
├─────────────────────────────────────────────────────────────┤
│  External APIs (Government Data Sources)                   │
│  ├── FRED API (Federal Reserve Economic Data)              │
│  ├── BLS API (Bureau of Labor Statistics)                  │
│  ├── Census Bureau API (Demographics & Housing)            │
│  └── Alpha Vantage API (Additional economic indicators)    │
└─────────────────────────────────────────────────────────────┘
```

### **Data Flow Architecture**

```text
User Interaction (UI Events, WebSocket connections)
       ↓
Context Providers (Global state management)
       ↓
Custom Hooks (useAutomaticDataSource, useDashboard)
       ↓
API Layer (GraphQL/REST proxy with caching)
       ↓
Services Layer (Rate limiting, error handling, transformations)
       ↓
External APIs / Database / Cache Layer
       ↓
Data Transformers (Standardize to Chart.js format)
       ↓
Chart.js Components (Interactive visualizations)
       ↓
Real-time Updates (WebSocket streaming)
       ↓
User Interface (Live charts, status indicators, export tools)
```

## 📊 Modernized Chart System Architecture

The Finance Factors Dashboard features a **completely modernized chart system** with advanced interactive capabilities and unified architecture:

### 🚀 Key Improvements

- **Unified Chart Architecture**: All charts now use the enhanced `AutomaticChart` component with consistent behavior
- **Advanced Interactions**: Built-in zoom, pan, and crossfilter capabilities with intuitive controls
- **Performance Optimized**: Lazy loading, dynamic imports, and optimized Chart.js registration
- **Error Resilience**: Comprehensive error boundaries and recovery mechanisms
- **Accessibility First**: Full keyboard navigation and ARIA labels for all interactive elements

### 🎯 Interactive Features

- **🔍 Zoom & Pan**: Mouse wheel zoom and drag-to-pan with reset controls
- **🎛️ Interactive Controls**: Toggle zoom/pan modes with visual feedback
- **📊 Crossfilter Support**: Linked chart interactions for data exploration
- **💾 Export Capabilities**: CSV, PDF, and image export with customizable options
- **⚡ Real-time Updates**: Live data streaming with WebSocket support (configurable)

### 🏗️ Consolidated Components

| Component | Status | Purpose |
|-----------|--------|---------|
| `AutomaticChart` | ✅ **Primary** | Modern chart with all interactive features |
| `DynamicChart` | ✅ **Core Engine** | Chart.js rendering with interactive options |
| `OptimizedChartLoader` | ✅ **Performance** | Lazy loading and bundle optimization |
| `ChartRegistration` | ✅ **Setup** | Chart.js + zoom plugin registration |
| ~~`LazyChart`~~ | ❌ **Removed** | Superseded by AutomaticChart |
| ~~`RefreshableChart`~~ | ❌ **Removed** | Functionality merged into AutomaticChart |
| ~~`InteractiveChart`~~ | ❌ **Removed** | Features integrated into AutomaticChart |

### Core Components

#### 1. **AutomaticChart Component** (`app/components/AutomaticChart.tsx`) - **MODERNIZED** ✨
- **Purpose**: Intelligent chart component with automatic data source management and advanced interactive features
- **Key Features**:
  - **Data Source Intelligence**: Automatic fallback to historical data with smart retry mechanisms
  - **Interactive Controls**: Built-in zoom, pan, and crossfilter capabilities with intuitive UI controls
  - **Real-time Updates**: Configurable auto-refresh with intervals (default: 15 minutes)
  - **Advanced Chart.js Integration**: Optimized Chart.js setup with zoom plugin and smooth animations
  - **Visual Status Indicators**: Real-time status indicators with `DataStatusPill` integration
  - **Dynamic Visualization**: Seamless switching between line, bar, pie, and doughnut charts
  - **Performance Optimized**: Lazy loading with React Suspense and error boundaries
  - **Accessibility**: Full keyboard navigation and ARIA labels for interactive controls
- **Interactive Props**: `enableZoom`, `enablePan`, `enableCrossfilter`, `showInteractiveControls`, `onDataPointClick`, `onDataPointHover`
- **Core Props**: `dataType`, `chartType`, `title`, `refreshInterval`, `showIndicator`, `onVisualizationChange`
- **Hooks Used**: `useAutomaticDataSource`, `useIsEditMode`

#### 2. **DataStatusPill Component** (`app/components/DataStatusPill.tsx`)
- **Purpose**: Visual indicators for data freshness, authenticity, and source status
- **Status Types**:
  - 🟢 **Live Data** (`recent`) - Recently updated real data from APIs
  - 📊 **Historical Data** (`historical`) - Real historical financial data for analysis
  - 🔴 **Outdated** (`stale`) - Real data that may be outdated (>24 hours)
  - ⏳ **Loading** (`loading`) - Data is being fetched or processed
- **Features**: Color-coded indicators, timestamp display, responsive design, accessibility support
- **Utility**: `getDataStatus()` function for automatic status determination

#### 3. **DynamicElementRenderer Component** (`app/components/DynamicElementRenderer.tsx`)
- **Purpose**: Renders dashboard elements dynamically based on type and configuration
- **Supported Types**: Line charts, bar charts, pie charts, doughnut charts, data tables, summary cards
- **Features**:
  - Type-safe rendering with TypeScript guards
  - Visualization switching with data conversion
  - Error boundaries and fallback UI
  - Integration with dashboard state management
  - Lazy loading and performance optimization

#### 4. **Context Providers** (`app/context/`)
- **DashboardProvider**: Global dashboard state, element management, layout configuration
- **AutomaticDataSourceProvider**: Intelligent data source switching with live-first, fallback strategy
- **ViewModeProvider**: Edit/Live/Preview mode management with localStorage persistence
- **Features**: Reducer-based state management, localStorage persistence, error handling

### Custom Hooks & Utilities

#### Data Management Hooks (`app/hooks/`)
- **`useAutomaticDataSource`**: Primary hook for automatic data fetching with fallback logic
  - Handles live API → cached data → historical data fallback chain
  - Configurable auto-refresh intervals and retry mechanisms
  - Returns data, loading state, error state, and control functions
- **`useDataSource`**: Lower-level hook for manual data source management
- **`useChartDataSource`**: Specialized hook for chart-specific data management
- **`useIsolatedDataSource`**: Component-isolated data fetching without global state impact

#### Utility Functions (`app/utils/`)
- **`historicalDataGenerators.ts`**: Seeded random data generation for fallback scenarios
- **`dataConverter.ts`**: Conversion between chart types (line → bar → pie → table → cards)
- **`localStorage.ts`**: Safe localStorage operations with fallbacks and TTL management
- **`chartConfiguration.ts`**: Chart.js configuration presets and axis configurations

#### Type System (`app/types/`)
- **`dashboard.ts`**: Dashboard element types, chart data interfaces, state management types
- **`dataSource.ts`**: API configuration, data source types, response interfaces
- **`proxy.ts`**: API proxy types, standardized data points, error handling types
- **`health.ts`**: Health check interfaces for monitoring and deployment verification

### Context Providers

#### 1. **DashboardProvider**
- **Responsibility**: Global dashboard state management
- **State**: Dashboard elements, layout configuration, user preferences
- **Actions**: Add/remove elements, update configurations, persist state

#### 2. **AutomaticDataSourceProvider**
- **Responsibility**: Data source switching and management
- **State**: Current data source, available sources, loading states
- **Actions**: Switch data sources, refresh data, handle fallbacks

#### 3. **ViewModeProvider**
- **Responsibility**: Edit/Live mode state management
- **State**: Current view mode, edit permissions
- **Actions**: Toggle modes, manage edit state

## 💻 Development Guide

### **Quick Start**

```bash
# Clone and install
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard
npm install

# Setup environment (optional - works without API keys)
cp .env.example .env.local

# Start development server with Turbopack
npm run dev

# Open http://localhost:3000
```

### **Database Setup (Optional)**

For full functionality including user management and dashboard persistence:

```bash
# Setup PostgreSQL database (local or cloud)
# Add DATABASE_URL to .env.local

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Optional: Seed database with sample data
npm run db:seed

# Open Prisma Studio for database management
npm run db:studio
```

### **API Integration**

#### **Supported APIs (All Free Government Data)**

##### **1. FRED API (Federal Reserve Economic Data) - Recommended First**

- **Provider**: Federal Reserve Bank of St. Louis
- **Cost**: Free with API key
- **Rate Limit**: 120 requests/minute
- **Setup**: [Get API key](https://fred.stlouisfed.org/docs/api/api_key.html)
- **Data**: Housing prices, interest rates, GDP, unemployment

##### **2. BLS API (Bureau of Labor Statistics)**

- **Provider**: U.S. Bureau of Labor Statistics
- **Cost**: Free (500 requests/day with key vs 25 without)
- **Setup**: [Get API key](https://www.bls.gov/developers/api_signature_v2.htm)
- **Data**: Employment, wages, inflation, labor statistics

##### **3. Census Bureau API**

- **Provider**: U.S. Census Bureau
- **Cost**: Free (optional API key for higher limits)
- **Setup**: [Get API key](https://api.census.gov/data/key_signup.html)
- **Data**: Demographics, housing, income statistics

##### **4. Alpha Vantage API (Optional)**

- **Provider**: Alpha Vantage Inc.
- **Cost**: Free tier (25 requests/day)
- **Setup**: [Get API key](https://www.alphavantage.co/support/#api-key)
- **Data**: Additional economic indicators

### **Local Development Setup**

#### **1. Environment Configuration**

```bash
# Create environment file
cp .env.example .env.local

# Add API keys (optional - dashboard works with historical data)
NEXT_PUBLIC_FRED_API_KEY=your_fred_api_key
NEXT_PUBLIC_BLS_API_KEY=your_bls_api_key
NEXT_PUBLIC_CENSUS_API_KEY=your_census_api_key
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Database (optional - for user management features)
DATABASE_URL="postgresql://user:password@localhost:5432/finance_factors"
DIRECT_URL="postgresql://user:password@localhost:5432/finance_factors"

# Redis (optional - for advanced caching)
REDIS_URL="redis://localhost:6379"
```

#### **2. Development Commands**

```bash
# Start development server with Turbopack (fast)
npm run dev

# Test API connectivity
npm run test:apis

# Test health checks
npm run test:health

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:studio      # Open Prisma Studio

# Build and analyze
npm run build          # Production build
npm run build:analyze  # Build with bundle analysis
```

### Environment Variables

#### Required for Live Data
```bash
# FRED API (Recommended first)
NEXT_PUBLIC_FRED_API_KEY=your_fred_api_key
NEXT_PUBLIC_FRED_BASE_URL=https://api.stlouisfed.org/fred

# BLS API (Optional but recommended)
NEXT_PUBLIC_BLS_API_KEY=your_bls_api_key
NEXT_PUBLIC_BLS_BASE_URL=https://api.bls.gov/publicAPI/v2

# Census Bureau API (Optional)
NEXT_PUBLIC_CENSUS_API_KEY=your_census_api_key
NEXT_PUBLIC_CENSUS_BASE_URL=https://api.census.gov/data

# Alpha Vantage API (Optional)
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co/query
```

#### Application Configuration
```bash
# Default data source: 'historical' or 'live-api'
NEXT_PUBLIC_DEFAULT_DATA_SOURCE=live-api

# Enable API proxy to solve CORS issues
NEXT_PUBLIC_USE_API_PROXY=true

# Enable debug logging for API calls
NEXT_PUBLIC_DEBUG_API=false

# Cache duration in minutes
NEXT_PUBLIC_CACHE_DURATION=30
```

## 🚀 Deployment

### ✅ Fully Automated Vercel Deployment

The project is configured with **automatic deployment** via GitHub Actions:

- 🚀 **Push to `main`** → Automatic production deployment to Vercel
- 🔍 **Pull Requests** → Automatic preview deployments with PR comments
- ⚡ **Full API functionality** with serverless functions
- 🌐 **Global CDN** with edge functions for optimal performance
- 📊 **Real-time government data** from FRED, BLS, and Census APIs

### How It Works

```bash
# Make changes and push - that's it!
git add .
git commit -m "Add new feature"
git push origin main
# → GitHub Actions automatically deploys to Vercel
# → Live at: https://finance-factors.vercel.app
```

### Current Deployment Status

- ✅ **GitHub Secrets**: Configured
- ✅ **Vercel Project**: Connected
- ✅ **GitHub Actions**: Active
- ✅ **API Endpoints**: Live
- ✅ **Auto-Deploy**: Enabled

### Monitor Deployments

- **GitHub Actions**: [View workflow runs](https://github.com/BurntFrost/finance-factors/actions)
- **Vercel Dashboard**: [View deployments](https://vercel.com/dashboard)
- **Live Site**: [https://finance-factors.vercel.app](https://finance-factors.vercel.app)
- **API Health**: [https://finance-factors.vercel.app/api/proxy/health](https://finance-factors.vercel.app/api/proxy/health)

### GitHub Secrets Configuration

The required GitHub secrets are configured:

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `VERCEL_TOKEN` | ✅ Set | Your Vercel API token |
| `VERCEL_ORG_ID` | ✅ Set | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | ✅ Set | Your Vercel project ID |

### Optional Environment Variables

These can be added as GitHub secrets for API keys:

| Secret Name | Status | Description |
|-------------|--------|-------------|
| `FRED_API_KEY` | Optional | Federal Reserve Economic Data API key |
| `BLS_API_KEY` | Optional | Bureau of Labor Statistics API key |
| `CENSUS_API_KEY` | Optional | US Census Bureau API key |
| `ALPHA_VANTAGE_API_KEY` | Optional | Alpha Vantage financial data API key |

### Daily Workflow

Your typical development workflow:

1. **Develop**: Make changes locally with `npm run dev`
2. **Commit**: `git add . && git commit -m "Your changes"`
3. **Deploy**: `git push origin main` (automatic deployment starts)
4. **Monitor**: Check GitHub Actions for deployment status
5. **Verify**: Visit https://finance-factors.vercel.app to see changes live

## 📈 API Integration Details

### API Proxy Architecture

The application uses a sophisticated Next.js API proxy system to eliminate CORS issues and provide security:

```mermaid
graph LR
    A[Browser] --> B[Next.js API Route]
    B --> C[Rate Limiter]
    C --> D[Cache Layer]
    D --> E[External API]
    E --> F[Data Transformer]
    F --> G[Response]
```

**Key Components:**
- **Proxy Services**: `fredProxyService`, `blsProxyService`, `censusProxyService`, `alphaVantageProxyService`
- **Main Endpoint**: `/api/proxy/data` - Unified data fetching endpoint
- **Health Checks**: `/api/proxy/health` - API status monitoring
- **Error Handling**: Comprehensive error boundaries with retry logic

### Multi-Layer Caching Strategy

- **Redis Cache**: Primary caching layer with TTL and persistence
- **In-Memory Cache**: Secondary cache for frequently accessed data
- **Request Deduplication**: Prevents duplicate API calls for same data
- **Cache Keys**: Structured with prefixes (`api:response:`, `rate:limit:`, `chart:data:`)
- **TTL Configuration**:
  - API responses: 30 minutes (configurable)
  - Rate limit data: 1 hour
  - Chart data: 15 minutes

### Intelligent Data Source Management

The system implements a sophisticated fallback strategy:

1. **Live API Data** (Primary): Real-time government API data with freshness validation
2. **Cached API Data** (Secondary): Previously fetched data within TTL window
3. **Historical Data** (Tertiary): Generated sample data for demonstration and fallback
4. **Error Recovery**: Automatic retry with exponential backoff

### Rate Limiting & API Management

Built-in rate limiting respects each API provider's limits:

- **FRED API**: 120 requests/minute (Federal Reserve Economic Data)
- **BLS API**: 10 requests/minute without key, 500/day with API key
- **Census API**: 100 requests/minute (US Census Bureau)
- **Alpha Vantage**: 5 requests/minute, 25/day on free tier

### Data Transformation Pipeline

- **Standardization**: All API responses transformed to `StandardDataPoint[]` format
- **Chart.js Compatibility**: Automatic conversion to Chart.js dataset format
- **Type Safety**: Full TypeScript coverage with interface validation
- **Error Handling**: Graceful handling of malformed or missing data

## 📚 Project Structure

The project follows a clean, modular architecture with clear separation between frontend, backend, and shared code:

```
finance-factors/
├── next-dashboard/                 # Main Next.js application
│   ├── app/                       # Next.js 15 App Router (routing only)
│   │   ├── api/                   # API routes and proxy endpoints
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout component
│   │   ├── loading.tsx            # Global loading component
│   │   ├── not-found.tsx          # 404 page
│   │   └── page.tsx               # Home page
│   ├── src/                       # Source code (organized by layer)
│   │   ├── frontend/              # Client-side code
│   │   │   ├── components/        # React components
│   │   │   │   ├── AutomaticChart.tsx # Smart chart component
│   │   │   │   ├── DataStatusPill.tsx # Status indicators
│   │   │   │   └── ...            # Other UI components
│   │   │   ├── context/           # React Context providers
│   │   │   │   ├── DashboardContext.tsx
│   │   │   │   ├── DataSourceContext.tsx
│   │   │   │   └── ViewModeContext.tsx
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   └── lib/               # Frontend utilities
│   │   ├── backend/               # Server-side code
│   │   │   ├── lib/               # Backend utilities and infrastructure
│   │   │   │   ├── cache/         # Caching utilities
│   │   │   │   ├── database/      # Database connections
│   │   │   │   ├── monitoring/    # Health monitoring
│   │   │   │   └── redis/         # Redis integration
│   │   │   ├── services/          # API service implementations
│   │   │   │   ├── realApiService.ts # Live API orchestrator
│   │   │   │   ├── dataTransformers.ts
│   │   │   │   └── ...            # API service implementations
│   │   │   ├── types/             # Backend-specific types
│   │   │   └── utils/             # Backend utilities
│   │   └── shared/                # Code shared between frontend/backend
│   │       ├── config/            # Configuration constants
│   │       ├── constants/         # Application constants
│   │       ├── types/             # Shared TypeScript definitions
│   │       └── utils/             # Shared utility functions
│   ├── package.json               # Dependencies and scripts
│   ├── next.config.ts             # Next.js configuration
│   ├── tsconfig.json              # TypeScript configuration with path mapping
│   └── vercel.json                # Vercel deployment config
├── README.md                      # This comprehensive guide
└── LICENSE                        # MIT License
```

### Directory Structure Benefits

- **🎯 Clear Separation**: Frontend, backend, and shared code are clearly separated
- **📦 Modular Design**: Each layer has its own responsibilities and dependencies
- **🔄 Reusability**: Shared code can be used by both frontend and backend
- **🛠️ Maintainability**: Easy to locate and modify specific functionality
- **📈 Scalability**: Structure supports growth and team collaboration
- **🔍 TypeScript Integration**: Path mapping enables clean imports (`@/frontend/*`, `@/backend/*`, `@/shared/*`)

## 🧪 Testing & Quality

### Comprehensive Testing Suite

```bash
# API Connectivity Tests
npm run test:apis              # Test all government API connections
npm run test:proxy             # Test API proxy endpoints specifically
npm run test:house-prices      # Test FRED house prices endpoint
npm run test:new-services      # Test newly added API services

# Health & Monitoring Tests
npm run test:health            # Test health check endpoints
npm run test:health:verbose    # Detailed health check with verbose output
npm run test:health:production # Test production deployment health

# Deployment & Infrastructure Tests
npm run test:deployment        # Test deployment readiness
npm run test:redis-queue       # Test Redis caching functionality
npm run deploy:manual          # Manual deployment verification

# Code Quality
npm run lint                   # ESLint with TypeScript rules
npm run build                  # Production build verification
npm run build:analyze          # Bundle analysis for performance
```

### Testing Infrastructure

- **API Connectivity**: Automated tests for all external API endpoints
- **Health Checks**: Multi-layer health monitoring (API, Vercel, Dashboard, Deployment)
- **Redis Testing**: Cache functionality and queue management verification
- **Deployment Verification**: Automated checks for deployment readiness
- **Environment Validation**: API key verification and configuration checks

### Code Quality & Standards

- **TypeScript**: Strict mode with comprehensive type coverage
- **ESLint**: Next.js + TypeScript configuration with custom rules
- **Error Boundaries**: React error boundaries with fallback UI
- **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation
- **Performance**: Lazy loading, code splitting, bundle optimization
- **Security**: API key protection, rate limiting, CORS handling
- **Monitoring**: Real-time health checks and performance metrics

## 📋 Recent Updates & Changes

### **Latest Major Improvements (2025)**

#### **✅ Enterprise Architecture Upgrade**

- **Added**: PostgreSQL database with Prisma ORM for user management and dashboard persistence
- **Implemented**: GraphQL API with Apollo Server for advanced data querying
- **Integrated**: WebSocket support for real-time data streaming and live updates
- **Enhanced**: Multi-layer caching with Redis and intelligent TTL management

#### **✅ Modern UI Framework Integration**

- **Integrated**: shadcn/ui component library with Radix UI primitives
- **Upgraded**: Tailwind CSS 4.1.11 with comprehensive design system
- **Added**: Dark/light mode support with system preference detection
- **Implemented**: Responsive design with mobile-first approach

#### **✅ Advanced Interactive Features**

- **Added**: Drag & drop dashboard layout with @dnd-kit integration
- **Implemented**: Chart zoom, pan, and crossfilter capabilities
- **Enhanced**: Real-time chart updates with WebSocket connections
- **Added**: Multi-format export (PDF, CSV, images) with bulk operations

#### **✅ Performance & Developer Experience**

- **Upgraded**: Next.js 15.4.2 with React 19.1.0 and Turbopack support
- **Optimized**: Advanced bundle splitting and compression management
- **Enhanced**: Comprehensive health monitoring and performance metrics
- **Improved**: TypeScript strict mode with layered architecture

#### **✅ Data Analysis & Visualization**

- **Added**: Crossfilter integration for cross-chart data filtering
- **Implemented**: Correlation analysis and comparison tools
- **Enhanced**: Chart.js 4.5.0 with advanced interactive plugins
- **Added**: Real-time status indicators and data freshness monitoring

### **Previous Improvements (2024)**

#### **✅ CORS Resolution & API Proxy**

- **Fixed**: All CORS issues with government APIs
- **Added**: Next.js API proxy for seamless data fetching
- **Improved**: Error handling and fallback mechanisms

#### **✅ Deployment Optimization**

- **Enhanced**: Vercel deployment with full serverless function support
- **Added**: Automatic preview deployments for pull requests
- **Implemented**: GitHub Actions CI/CD pipeline

### **Current Status**

- **Build Status**: ✅ Passing with advanced optimizations
- **Deployment**: ✅ Automatic via GitHub Actions with health checks
- **API Health**: ✅ All major APIs operational with monitoring
- **Performance**: ✅ Optimized for Core Web Vitals with bundle analysis
- **Accessibility**: ✅ WCAG 2.1 AA compliant with full keyboard navigation
- **Type Safety**: ✅ Full TypeScript coverage with strict mode
- **Database**: ✅ PostgreSQL with Prisma ORM and migrations
- **Real-time**: ✅ WebSocket support with subscription management

## 🛠️ Development Workflow & Best Practices

### Local Development Setup

```bash
# 1. Clone and setup
git clone https://github.com/BurntFrost/finance-factors.git
cd finance-factors/next-dashboard

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Add your API keys to .env.local

# 4. Start development server
npm run dev

# 5. Run tests to verify setup
npm run test:apis
npm run test:health
```

### Development Best Practices

#### Code Organization
- **Components**: Place in `app/components/` with co-located CSS modules
- **Hooks**: Custom hooks in `app/hooks/` with clear naming conventions
- **Services**: API services in `app/services/` with proper error handling
- **Types**: TypeScript definitions in `app/types/` with comprehensive interfaces
- **Utils**: Helper functions in `app/utils/` with unit test coverage

#### State Management Patterns
- **Context Providers**: Use for global state (dashboard, data sources, view mode)
- **Local State**: Use `useState` for component-specific state
- **Data Fetching**: Use custom hooks (`useAutomaticDataSource`, `useDataSource`)
- **Caching**: Leverage built-in caching with TTL and Redis integration

#### Performance Guidelines
- **Lazy Loading**: Use `React.lazy()` for heavy components
- **Code Splitting**: Dynamic imports for large dependencies
- **Memoization**: Use `React.memo`, `useMemo`, `useCallback` appropriately
- **Bundle Analysis**: Run `npm run build:analyze` to monitor bundle size

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper TypeScript types
4. **Test your changes**: `npm run test:apis && npm run lint`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request** (automatic preview deployment will be created)

### Code Standards

- **TypeScript**: All new code must include proper type definitions
- **ESLint**: Follow the existing linting rules
- **Components**: Use functional components with hooks
- **Styling**: Use CSS Modules for component-specific styles
- **API Integration**: Use the existing service layer patterns
- **Testing**: Add tests for new API integrations

### Adding New Data Sources

1. **Create API service**: Add new service in `app/services/`
2. **Update types**: Add data types in `app/types/dataSource.ts`
3. **Add transformer**: Create data transformer in `app/services/dataTransformers.ts`
4. **Update real API service**: Register new service in `realApiService.ts`
5. **Add tests**: Create connectivity tests
6. **Update documentation**: Add API details to this README

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://finance-factors.vercel.app](https://finance-factors.vercel.app)
- **GitHub Repository**: [https://github.com/BurntFrost/finance-factors](https://github.com/BurntFrost/finance-factors)
- **API Health Check**: [https://finance-factors.vercel.app/api/proxy/health](https://finance-factors.vercel.app/api/proxy/health)
- **GitHub Actions**: [https://github.com/BurntFrost/finance-factors/actions](https://github.com/BurntFrost/finance-factors/actions)
- **Vercel Dashboard**: [https://vercel.com/dashboard](https://vercel.com/dashboard)

---

**Built with ❤️ using Next.js 15, React 19, TypeScript, shadcn/ui, Chart.js, PostgreSQL, GraphQL, and government open data APIs**

*Last updated: January 2025 - Comprehensive codebase analysis with enterprise architecture documentation*