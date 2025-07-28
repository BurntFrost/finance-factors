/**
 * User Experience Service
 * 
 * Service for generating user experience indicators and managing
 * visual feedback when Redis fallback mode is active.
 */

import {
  UserExperienceIndicator,
  FallbackModeInfo,
  PerformanceImpact,
  ProxyApiResponse
} from '../../shared/types/proxy';
import { redisFallbackService } from './redis-fallback-service';
import { redisHealthMonitor } from './redis-health-monitor';
import { userContextService } from './user-context-service';

/**
 * User Experience Service Class
 */
export class UserExperienceService {
  private static instance: UserExperienceService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): UserExperienceService {
    if (!UserExperienceService.instance) {
      UserExperienceService.instance = new UserExperienceService();
    }
    return UserExperienceService.instance;
  }

  /**
   * Generate user experience indicators for API response
   */
  public generateUserIndicators(
    responseTime: number,
    cacheHit: boolean,
    dataSource: 'redis' | 'fallback' | 'direct'
  ): UserExperienceIndicator[] {
    const indicators: UserExperienceIndicator[] = [];
    const fallbackStatus = redisFallbackService.getFallbackStatus();

    // Fallback mode indicator
    if (fallbackStatus.isActive) {
      indicators.push(this.createFallbackIndicator(fallbackStatus, responseTime));
    }

    // Performance indicators
    if (responseTime > 5000) { // 5 seconds
      indicators.push({
        type: 'warning',
        message: 'Response time is slower than usual due to system maintenance',
        icon: '⏱️',
        dismissible: true,
        autoHide: false,
      });
    } else if (responseTime > 2000) { // 2 seconds
      indicators.push({
        type: 'info',
        message: 'Data is loading from backup systems for optimal reliability',
        icon: '🔄',
        dismissible: true,
        autoHide: true,
        duration: 5000,
      });
    }

    // Cache status indicators
    if (!cacheHit && dataSource === 'direct') {
      indicators.push({
        type: 'info',
        message: 'Fetching fresh data from live sources',
        icon: '🔄',
        dismissible: true,
        autoHide: true,
        duration: 3000,
      });
    }

    // Data freshness indicators
    if (dataSource === 'fallback') {
      indicators.push({
        type: 'info',
        message: 'Using reliable backup data sources to ensure service continuity',
        icon: '🛡️',
        dismissible: true,
        autoHide: false,
      });
    }

    return indicators;
  }

  /**
   * Create fallback mode indicator
   */
  private createFallbackIndicator(
    fallbackStatus: ReturnType<typeof redisFallbackService.getFallbackStatus>,
    responseTime: number
  ): UserExperienceIndicator {
    const performanceImpact = this.assessPerformanceImpact(responseTime);
    
    let message: string;
    let type: UserExperienceIndicator['type'];
    let icon: string;

    switch (performanceImpact) {
      case PerformanceImpact.HIGH:
        message = 'System is operating in backup mode. Some features may be slower than usual.';
        type = 'warning';
        icon = '⚠️';
        break;
      case PerformanceImpact.MEDIUM:
        message = 'Using backup systems for enhanced reliability. Minor delays may occur.';
        type = 'info';
        icon = '🔄';
        break;
      case PerformanceImpact.LOW:
        message = 'Seamlessly switched to backup systems for optimal performance.';
        type = 'info';
        icon = '🛡️';
        break;
      default:
        message = 'System is operating normally with backup support.';
        type = 'success';
        icon = '✅';
        break;
    }

    return {
      type,
      message,
      icon,
      dismissible: true,
      autoHide: performanceImpact === PerformanceImpact.NONE || performanceImpact === PerformanceImpact.LOW,
      duration: 8000,
    };
  }

  /**
   * Assess performance impact based on response time and system status
   */
  private assessPerformanceImpact(responseTime: number): PerformanceImpact {
    const healthCheck = redisHealthMonitor.getLastHealthCheck();
    
    // High impact if response time is very slow
    if (responseTime > 10000) { // 10 seconds
      return PerformanceImpact.HIGH;
    }
    
    // Medium impact if response time is moderately slow or health is poor
    if (responseTime > 3000 || 
        (healthCheck && (healthCheck.status === 'unhealthy' || healthCheck.status === 'critical'))) {
      return PerformanceImpact.MEDIUM;
    }
    
    // Low impact if response time is slightly elevated
    if (responseTime > 1000) {
      return PerformanceImpact.LOW;
    }
    
    return PerformanceImpact.NONE;
  }

  /**
   * Generate fallback mode information
   */
  public generateFallbackModeInfo(responseTime: number): FallbackModeInfo {
    const fallbackStatus = redisFallbackService.getFallbackStatus();
    const performanceImpact = this.assessPerformanceImpact(responseTime);
    
    if (!fallbackStatus.isActive) {
      return {
        isActive: false,
        performanceImpact: PerformanceImpact.NONE,
      };
    }

    const expectedDelay = this.calculateExpectedDelay(performanceImpact);
    const userIndicator = this.createFallbackIndicator(fallbackStatus, responseTime);

    return {
      isActive: true,
      reason: fallbackStatus.reason,
      activatedAt: fallbackStatus.activatedAt,
      performanceImpact,
      expectedDelay,
      userIndicator,
    };
  }

  /**
   * Calculate expected delay based on performance impact
   */
  private calculateExpectedDelay(impact: PerformanceImpact): number {
    switch (impact) {
      case PerformanceImpact.HIGH:
        return 5000; // 5 seconds
      case PerformanceImpact.MEDIUM:
        return 2000; // 2 seconds
      case PerformanceImpact.LOW:
        return 500; // 500ms
      default:
        return 0;
    }
  }

  /**
   * Enhance API response with user experience data
   */
  public enhanceApiResponse<T>(
    response: ProxyApiResponse<T>,
    responseTime: number,
    cacheHit: boolean = false,
    dataSource: 'redis' | 'fallback' | 'direct' = 'direct'
  ): ProxyApiResponse<T> {
    const userIndicators = this.generateUserIndicators(responseTime, cacheHit, dataSource);
    const fallbackMode = this.generateFallbackModeInfo(responseTime);

    // Enhance metadata
    response.metadata = {
      ...response.metadata,
      fallbackMode,
      userIndicators,
      performanceMetrics: {
        responseTime,
        cacheHit,
        dataFreshness: this.determineDataFreshness(cacheHit, dataSource, fallbackMode.isActive),
      },
    };

    return response;
  }

  /**
   * Determine data freshness level
   */
  private determineDataFreshness(
    cacheHit: boolean,
    dataSource: 'redis' | 'fallback' | 'direct',
    isFallback: boolean
  ): 'real-time' | 'cached' | 'fallback' {
    if (isFallback || dataSource === 'fallback') {
      return 'fallback';
    }
    
    if (cacheHit || dataSource === 'redis') {
      return 'cached';
    }
    
    return 'real-time';
  }

  /**
   * Create system status indicator for dashboard
   */
  public createSystemStatusIndicator(): UserExperienceIndicator {
    const fallbackStatus = redisFallbackService.getFallbackStatus();
    const healthCheck = redisHealthMonitor.getLastHealthCheck();

    if (fallbackStatus.isActive) {
      return {
        type: 'warning',
        message: 'System is operating in backup mode to ensure reliability',
        icon: '🛡️',
        dismissible: false,
        autoHide: false,
      };
    }

    if (healthCheck && healthCheck.status === 'degraded') {
      return {
        type: 'info',
        message: 'System performance is being optimized',
        icon: '⚡',
        dismissible: true,
        autoHide: true,
        duration: 10000,
      };
    }

    return {
      type: 'success',
      message: 'All systems operating normally',
      icon: '✅',
      dismissible: true,
      autoHide: true,
      duration: 5000,
    };
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyErrorMessage(error: string): UserExperienceIndicator {
    // Map technical errors to user-friendly messages
    if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
      return {
        type: 'warning',
        message: 'Request is taking longer than usual. Please wait a moment.',
        icon: '⏱️',
        dismissible: true,
        autoHide: false,
      };
    }

    if (error.includes('connection') || error.includes('ECONNREFUSED')) {
      return {
        type: 'info',
        message: 'Switching to backup systems to maintain service quality.',
        icon: '🔄',
        dismissible: true,
        autoHide: true,
        duration: 5000,
      };
    }

    if (error.includes('rate limit') || error.includes('429')) {
      return {
        type: 'warning',
        message: 'High demand detected. Please wait a moment before trying again.',
        icon: '🚦',
        dismissible: true,
        autoHide: false,
      };
    }

    // Generic error message
    return {
      type: 'error',
      message: 'We encountered a temporary issue. Our team has been notified.',
      icon: '⚠️',
      dismissible: true,
      autoHide: false,
    };
  }

  /**
   * Generate enhanced contextual indicators
   */
  public generateContextualUserIndicators(
    sessionId: string,
    responseTime: number,
    cacheHit: boolean,
    dataSource: 'redis' | 'fallback' | 'direct'
  ): UserExperienceIndicator[] {
    // Get contextual indicators
    const contextualIndicators = userContextService.generateContextualIndicators(
      sessionId,
      responseTime,
      cacheHit,
      dataSource
    );

    // Convert to standard indicators with enhanced context
    return contextualIndicators.map(indicator => ({
      ...indicator,
      message: `${indicator.message} - ${indicator.context.userImpact}`,
    }));
  }
}

// Export singleton instance
export const userExperienceService = UserExperienceService.getInstance();
