# Finance Factors Dashboard - Architecture Documentation

## System Architecture Overview

The Finance Factors Dashboard follows a modern React architecture with clear separation of concerns and intelligent data management.

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                    │
├─────────────────────────────────────────────────────────────┤
│  Context Providers (Global State Management)               │
│  ├── DashboardProvider (Element management)                │
│  ├── AutomaticDataSourceProvider (Data source switching)   │
│  └── ViewModeProvider (Edit/Live mode toggle)              │
├─────────────────────────────────────────────────────────────┤
│  Component Layer                                            │
│  ├── AutomaticChart (Smart chart with data source aware)   │
│  ├── DynamicElementRenderer (Dynamic dashboard elements)   │
│  ├── DataStatusPill (Real-time status indicators)         │
│  └── UI Components (Dropdowns, toggles, controls)         │
├─────────────────────────────────────────────────────────────┤
│  Hooks Layer (Custom React Hooks)                          │
│  ├── useDataSource (Data fetching & caching)              │
│  ├── useDashboard (Dashboard state management)            │
│  └── useViewMode (Edit/Live mode state)                   │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Data & API Management)                    │
│  ├── realApiService (Live government APIs orchestrator)    │
│  ├── dataTransformers (Data format standardization)       │
│  ├── historicalDataGenerators (Sample data generation)    │
│  └── apiCache (Intelligent caching with TTL)              │
├─────────────────────────────────────────────────────────────┤
│  External APIs (Government Data Sources)                   │
│  ├── FRED API (Federal Reserve Economic Data)              │
│  ├── BLS API (Bureau of Labor Statistics)                  │
│  ├── Census Bureau API (Demographics & Housing)            │
│  └── Alpha Vantage API (Additional economic indicators)    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
User Interaction
       ↓
Context Providers (State Management)
       ↓
Custom Hooks (useDataSource, useDashboard)
       ↓
Services Layer (API calls, caching, transformations)
       ↓
External APIs / Historical Data Generators
       ↓
Data Transformers (Standardize format)
       ↓
Chart.js Components (Visualization)
       ↓
User Interface (Interactive charts & controls)
```

## Component Architecture

### Core Components

#### 1. **AutomaticChart Component**
- **Purpose**: Intelligent chart component that adapts to data source changes
- **Features**: 
  - Data source awareness
  - Automatic refresh functionality
  - Loading states and error boundaries
  - Chart.js integration with smooth animations
- **Props**: `dataType`, `chartType`, `title`, `options`

#### 2. **DataStatusPill Component**
- **Purpose**: Visual indicators for data freshness and authenticity
- **Status Types**:
  - 🟢 Live Data (`recent`) - Recently updated real data
  - 📊 Historical Data (`historical`) - Real historical financial data
  - 🔴 Outdated (`stale`) - Real data that may be outdated
  - ⏳ Loading (`loading`) - Data is being loaded
- **Features**: Color-coded indicators, responsive design, accessibility support

#### 3. **DynamicElementRenderer Component**
- **Purpose**: Renders dashboard elements dynamically based on configuration
- **Features**: Supports multiple chart types, lazy loading, error boundaries

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
- **State**: Current view mode, edit permissions, UI state
- **Actions**: Toggle modes, save changes, validate permissions

## API Integration Architecture

### API Proxy Pattern (Vercel Deployment)

```
Browser → Vercel Serverless Function → External APIs
```

**Benefits:**
- ✅ Bypasses browser CORS restrictions
- 🔒 Keeps API keys secure on server-side
- ⚡ Enables true live data functionality
- 🚀 Zero-configuration deployment

### Direct API Pattern (Development)

```
Browser → External APIs (with CORS handling)
```

**Limitations:**
- ❌ CORS restrictions in production
- ⚠️ API keys exposed in client code
- 🔧 Requires development proxy setup

### Fallback Architecture

```
Live API Request → Success ✅ → Display Live Data
                → Failure ❌ → Historical Data Fallback
```

## Data Management Patterns

### 1. **Intelligent Caching System**

```typescript
interface CacheConfig {
  defaultTTL: number;        // 30 minutes
  maxSize: number;           // 100 items
  enableDeduplication: boolean;
  enablePersistence: boolean; // localStorage
}
```

**Features:**
- Time-based expiration (TTL)
- Request deduplication
- Memory management
- Persistent storage

### 2. **Data Transformation Pipeline**

```typescript
Raw API Data → Validation → Normalization → Chart Format → UI Display
```

**Transformers:**
- `fredDataTransformer` - FRED API responses
- `blsDataTransformer` - BLS API responses
- `censusDataTransformer` - Census API responses
- `historicalDataGenerator` - Sample data generation

### 3. **Error Handling Strategy**

```typescript
API Request → Success → Cache → Display
           → Network Error → Retry Logic → Fallback Data
           → API Error → Error Logging → User Notification
           → Timeout → Retry → Historical Data
```

## Performance Optimizations

### 1. **Code Splitting & Lazy Loading**

```typescript
// Chart components loaded on-demand
const LazyChart = lazy(() => import('./components/LazyChart'));

// Route-based code splitting
const DashboardPage = lazy(() => import('./pages/Dashboard'));
```

### 2. **Bundle Optimization**

```javascript
// Webpack configuration for optimal chunking
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    react: { name: 'react', chunks: 'all' },
    chartjs: { name: 'chartjs', chunks: 'all' },
    vendor: { name: 'vendor', chunks: 'all' }
  }
}
```

### 3. **Caching Strategy**

- **API Responses**: 30-minute cache with TTL
- **Static Assets**: CDN caching with versioning
- **Component State**: Memoization with React.memo
- **Data Transformations**: Cached results for identical inputs

## Security Architecture

### 1. **API Key Management**

**Development:**
```bash
# Local environment variables
NEXT_PUBLIC_FRED_API_KEY=dev_key
NEXT_PUBLIC_BLS_API_KEY=dev_key
```

**Production (Vercel):**
```bash
# Server-side environment variables
FRED_API_KEY=prod_key
BLS_API_KEY=prod_key
```

### 2. **CORS Handling**

**Vercel Deployment:**
- Server-side API proxy eliminates CORS issues
- Secure API key storage
- Request validation and rate limiting

**GitHub Pages:**
- Client-side API calls (CORS limited)
- Fallback to historical data
- Public API key exposure (acceptable for free government APIs)

## Scalability Patterns

### 1. **Horizontal Scaling**
- Serverless functions auto-scale with demand
- CDN distribution for global performance
- Database-free architecture for simplicity

### 2. **Vertical Scaling**
- Intelligent caching reduces API load
- Request deduplication prevents redundant calls
- Lazy loading minimizes initial bundle size

### 3. **Performance Monitoring**
- Web Vitals tracking
- API response time monitoring
- Error rate tracking
- User interaction analytics

## Technology Stack

### Frontend
- **Framework**: Next.js 15.4.2 with App Router
- **Language**: TypeScript with strict mode
- **Visualization**: Chart.js 4.5.0 with react-chartjs-2
- **Styling**: CSS Modules with responsive design
- **State Management**: React Context API

### Backend/API
- **Serverless**: Vercel Functions
- **API Proxy**: Next.js API routes
- **Caching**: In-memory with TTL
- **Data Sources**: Government APIs (FRED, BLS, Census)

### Development Tools
- **Build Tool**: Next.js with Turbopack
- **Linting**: ESLint with Next.js config
- **Type Checking**: TypeScript compiler
- **Testing**: Built-in API connectivity tests

## Design Patterns

### 1. **Context-Driven Architecture**
- Global state management through React Context
- Provider pattern for different concerns
- Separation of concerns across contexts

### 2. **Smart Component Pattern**
- Components automatically adapt to data source changes
- Built-in loading states and error handling
- Lazy loading for performance

### 3. **Service Layer Pattern**
- API orchestration through dedicated services
- Data transformation and standardization
- Caching and request optimization

### 4. **Error Boundary Pattern**
- Graceful degradation on component failures
- Fallback UI for error states
- Comprehensive error logging

This architecture provides a robust, scalable, and maintainable foundation for the Finance Factors Dashboard while ensuring optimal performance and user experience.
