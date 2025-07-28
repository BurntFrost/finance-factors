/**
 * GraphQL Schema Definition
 * 
 * Provides a flexible, type-safe API for querying financial data
 * with advanced features like batching, caching, and real-time subscriptions.
 */

import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # Scalar types
  scalar DateTime
  scalar JSON

  # Enums
  enum DataSourceType {
    LIVE_API
    HISTORICAL
    CACHED
  }

  enum ChartType {
    LINE
    BAR
    PIE
    DOUGHNUT
    SCATTER
    BUBBLE
    RADAR
    POLAR_AREA
  }

  enum UserRole {
    ADMIN
    ANALYST
    VIEWER
  }

  enum CacheLevel {
    BROWSER
    REDIS
    DATABASE
    CDN
  }

  # Core data types
  type DataPoint {
    date: DateTime!
    value: Float!
    label: String
    metadata: JSON
  }

  type ChartData {
    labels: [String!]!
    datasets: [Dataset!]!
    lastUpdated: DateTime
    isRealData: Boolean!
    source: DataSourceType!
    totalRecords: Int
  }

  type Dataset {
    label: String!
    data: [Float!]!
    backgroundColor: String
    borderColor: String
    borderWidth: Int
    fill: Boolean
  }

  # API Response types
  type ApiResponse {
    success: Boolean!
    data: JSON
    error: String
    metadata: ResponseMetadata
  }

  type ResponseMetadata {
    totalRecords: Int
    source: DataSourceType!
    cached: Boolean!
    responseTime: Int
    rateLimit: RateLimitInfo
  }

  type RateLimitInfo {
    remaining: Int!
    resetTime: DateTime!
    limit: Int!
  }

  # User and Dashboard types
  type User {
    id: ID!
    email: String!
    name: String
    role: UserRole!
    preferences: UserPreferences
    dashboards: [Dashboard!]!
    createdAt: DateTime!
  }

  type UserPreferences {
    defaultTheme: String!
    defaultLayout: String!
    autoRefresh: Boolean!
    refreshInterval: Int!
    enableNotifications: Boolean!
    defaultChartType: String!
    animationsEnabled: Boolean!
    preferredDataSource: String!
    cacheEnabled: Boolean!
  }

  type Dashboard {
    id: ID!
    name: String!
    description: String
    isPublic: Boolean!
    isTemplate: Boolean!
    layout: String!
    elements: [DashboardElement!]!
    user: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DashboardElement {
    id: ID!
    type: String!
    dataType: String!
    title: String!
    config: JSON!
    position: JSON!
    size: JSON!
    dashboard: Dashboard!
    createdAt: DateTime!
  }

  # Performance and monitoring types
  type CacheStats {
    level: CacheLevel!
    hits: Int!
    misses: Int!
    hitRate: Float!
    totalSize: Int!
    entryCount: Int!
    avgResponseTime: Float!
  }

  type PerformanceMetrics {
    apiResponseTime: Float!
    chartRenderTime: Float!
    cacheHitRate: Float!
    totalRequests: Int!
    errorRate: Float!
    uptime: Float!
  }

  # Input types
  input TimeRangeInput {
    start: DateTime
    end: DateTime
  }

  input DataQueryInput {
    dataType: String!
    timeRange: TimeRangeInput
    useCache: Boolean
    priority: String
  }

  input DashboardInput {
    name: String!
    description: String
    isPublic: Boolean
    layout: String
  }

  input DashboardElementInput {
    type: String!
    dataType: String!
    title: String!
    config: JSON
    position: JSON
    size: JSON
  }

  input UserPreferencesInput {
    defaultTheme: String
    defaultLayout: String
    autoRefresh: Boolean
    refreshInterval: Int
    enableNotifications: Boolean
    defaultChartType: String
    animationsEnabled: Boolean
    preferredDataSource: String
    cacheEnabled: Boolean
  }

  # Queries
  type Query {
    # Data queries
    getChartData(input: DataQueryInput!): ChartData
    getMultipleChartData(inputs: [DataQueryInput!]!): [ChartData!]!
    getDataPoint(dataType: String!, date: DateTime!): DataPoint
    
    # User queries
    me: User
    getUser(id: ID!): User
    
    # Dashboard queries
    getDashboard(id: ID!): Dashboard
    getDashboards(userId: ID, isPublic: Boolean): [Dashboard!]!
    getDashboardTemplates: [Dashboard!]!
    
    # Performance queries
    getCacheStats: [CacheStats!]!
    getPerformanceMetrics: PerformanceMetrics!
    getApiHealth: JSON!
    
    # Search and discovery
    searchDashboards(query: String!): [Dashboard!]!
    getPopularDataTypes: [String!]!
    getRecommendedDashboards(userId: ID!): [Dashboard!]!
  }

  # Mutations
  type Mutation {
    # Dashboard mutations
    createDashboard(input: DashboardInput!): Dashboard!
    updateDashboard(id: ID!, input: DashboardInput!): Dashboard!
    deleteDashboard(id: ID!): Boolean!
    
    # Dashboard element mutations
    addDashboardElement(dashboardId: ID!, input: DashboardElementInput!): DashboardElement!
    updateDashboardElement(id: ID!, input: DashboardElementInput!): DashboardElement!
    removeDashboardElement(id: ID!): Boolean!
    
    # User mutations
    updateUserPreferences(input: UserPreferencesInput!): UserPreferences!
    
    # Cache mutations
    invalidateCache(keys: [String!]!): Boolean!
    clearCache(level: CacheLevel): Boolean!
    
    # Data mutations
    refreshData(dataType: String!): ChartData!
    preloadData(dataTypes: [String!]!): Boolean!
  }

  # Subscriptions for real-time updates
  type Subscription {
    # Real-time data updates
    dataUpdated(dataType: String!): ChartData!
    
    # Dashboard updates
    dashboardUpdated(dashboardId: ID!): Dashboard!
    
    # Performance monitoring
    performanceMetricsUpdated: PerformanceMetrics!
    
    # System notifications
    systemNotification: JSON!
  }
`;
