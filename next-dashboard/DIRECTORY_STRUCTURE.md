# Directory Structure Documentation

This document explains the new modular directory structure implemented in the Finance Factors Dashboard project.

## Overview

The project has been reorganized to follow a clean, layered architecture with clear separation between frontend, backend, and shared code. This structure improves maintainability, scalability, and developer experience.

## Directory Structure

```
next-dashboard/
├── app/                           # Next.js 15 App Router (routing only)
│   ├── api/                       # API routes and proxy endpoints
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout component
│   ├── loading.tsx                # Global loading component
│   ├── not-found.tsx              # 404 page
│   └── page.tsx                   # Home page
├── src/                           # Source code (organized by layer)
│   ├── frontend/                  # Client-side code
│   │   ├── components/            # React components
│   │   ├── context/               # React Context providers
│   │   ├── hooks/                 # Custom React hooks
│   │   └── lib/                   # Frontend utilities
│   ├── backend/                   # Server-side code
│   │   ├── lib/                   # Backend utilities and infrastructure
│   │   ├── services/              # API service implementations
│   │   ├── types/                 # Backend-specific types
│   │   └── utils/                 # Backend utilities
│   └── shared/                    # Code shared between frontend/backend
│       ├── config/                # Configuration constants
│       ├── constants/             # Application constants
│       ├── types/                 # Shared TypeScript definitions
│       └── utils/                 # Shared utility functions
├── components/                    # shadcn/ui components
├── lib/                           # shadcn/ui utilities
├── types/                         # Legacy types (being phased out)
└── [config files]                # Next.js, TypeScript, etc.
```

## Layer Responsibilities

### Frontend Layer (`src/frontend/`)

**Purpose**: Client-side React code that runs in the browser

**Contents**:
- **Components**: React components, UI elements, charts
- **Context**: React Context providers for state management
- **Hooks**: Custom React hooks for data fetching and state
- **Lib**: Frontend-specific utilities and helpers

**Examples**:
- `AutomaticChart.tsx` - Smart chart component
- `DashboardContext.tsx` - Dashboard state management
- `useAutomaticDataSource.ts` - Data fetching hook
- `chartConfiguration.ts` - Chart.js configurations

### Backend Layer (`src/backend/`)

**Purpose**: Server-side code that runs on Node.js/Vercel Functions

**Contents**:
- **Lib**: Infrastructure utilities (Redis, database, monitoring)
- **Services**: API service implementations and data fetchers
- **Types**: Backend-specific TypeScript definitions
- **Utils**: Server-side utility functions

**Examples**:
- `realApiService.ts` - Live API orchestrator
- `redis-cache.ts` - Redis caching utilities
- `dataTransformers.ts` - Data transformation services
- `prisma.ts` - Database connection utilities

### Shared Layer (`src/shared/`)

**Purpose**: Code that can be used by both frontend and backend

**Contents**:
- **Config**: Configuration constants and settings
- **Constants**: Application-wide constants
- **Types**: Shared TypeScript interfaces and types
- **Utils**: Pure utility functions without side effects

**Examples**:
- `dashboard.ts` - Dashboard type definitions
- `dataSource.ts` - Data source interfaces
- `formatters.ts` - Data formatting utilities
- `validation.ts` - Input validation functions

## Import Path Mapping

The project uses TypeScript path mapping for clean imports:

```typescript
// Frontend imports
import { AutomaticChart } from '@/frontend/components/AutomaticChart';
import { useDashboard } from '@/frontend/hooks/useDashboard';

// Backend imports
import { realApiService } from '@/backend/services/realApiService';
import { redisCache } from '@/backend/lib/redis/redis-cache';

// Shared imports
import { DashboardElement } from '@/shared/types/dashboard';
import { formatCurrency } from '@/shared/utils/formatters';
```

## Benefits of This Structure

### 🎯 Clear Separation of Concerns
- Frontend code is clearly separated from backend code
- Shared code is explicitly identified and reusable
- No confusion about where code should be placed

### 📦 Improved Modularity
- Each layer has its own responsibilities
- Dependencies are clearly defined
- Easier to test individual layers

### 🔄 Better Reusability
- Shared utilities can be used by both frontend and backend
- Type definitions are centralized and consistent
- Configuration is managed in one place

### 🛠️ Enhanced Maintainability
- Easy to locate specific functionality
- Clear ownership of code sections
- Simplified debugging and troubleshooting

### 📈 Scalability
- Structure supports team collaboration
- Easy to add new features without conflicts
- Clear patterns for new code placement

### 🔍 TypeScript Integration
- Path mapping enables clean imports
- Better IDE support and autocomplete
- Consistent type checking across layers

## Migration Notes

### What Changed
1. **Old Structure**: Everything mixed in `app/` directory
2. **New Structure**: Layered architecture in `src/` directory
3. **Import Paths**: Updated to use path mapping (`@/frontend/*`, etc.)
4. **App Directory**: Simplified to contain only routing and layout

### Backward Compatibility
- All existing functionality preserved
- No breaking changes to public APIs
- Gradual migration of legacy code

### Next Steps
- Continue migrating legacy code to new structure
- Update documentation and examples
- Establish coding standards for new structure

## Development Guidelines

### Adding New Code

1. **Frontend Components**: Place in `src/frontend/components/`
2. **Backend Services**: Place in `src/backend/services/`
3. **Shared Types**: Place in `src/shared/types/`
4. **Utilities**: Place in appropriate layer (`frontend/lib/`, `backend/utils/`, `shared/utils/`)

### Import Guidelines

1. **Use Path Mapping**: Always use `@/frontend/*`, `@/backend/*`, `@/shared/*`
2. **Layer Dependencies**: Frontend can import from shared, backend can import from shared
3. **No Cross-Layer**: Frontend should not import from backend (and vice versa)
4. **Barrel Exports**: Use index files for clean exports

### Code Organization

1. **Single Responsibility**: Each file should have a clear, single purpose
2. **Consistent Naming**: Use descriptive names that indicate functionality
3. **Type Safety**: All new code should include proper TypeScript types
4. **Documentation**: Add JSDoc comments for public APIs

## Conclusion

This new directory structure provides a solid foundation for the Finance Factors Dashboard project. It improves code organization, maintainability, and developer experience while preserving all existing functionality.

The structure is designed to scale with the project and support team collaboration as the codebase grows.
