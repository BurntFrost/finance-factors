/**
 * User Context Service
 * 
 * Provides contextual user experience based on user behavior,
 * preferences, and current system state.
 */

import { UserExperienceIndicator } from '../../shared/types/proxy';
import { redisFallbackService } from './redis-fallback-service';

interface UserContext {
  userId?: string;
  sessionId: string;
  currentPage: string;
  recentActions: UserAction[];
  preferences: UserPreferences;
  impactTolerance: 'low' | 'medium' | 'high';
}

interface UserAction {
  action: string;
  timestamp: Date;
  context: Record<string, unknown>;
}

interface UserPreferences {
  notificationStyle: 'minimal' | 'detailed' | 'technical';
  autoHidePreference: boolean;
  preferredFallbackBehavior: 'automatic' | 'prompt' | 'manual';
  showPerformanceMetrics: boolean;
}

interface ContextualIndicator extends UserExperienceIndicator {
  context: {
    userImpact: string;
    suggestedActions: string[];
    alternativeOptions: string[];
    estimatedResolution: string;
  };
}

class UserContextService {
  private userContexts = new Map<string, UserContext>();
  private readonly CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate contextual user experience indicators
   */
  public generateContextualIndicators(
    sessionId: string,
    responseTime: number,
    cacheHit: boolean,
    dataSource: 'redis' | 'fallback' | 'direct'
  ): ContextualIndicator[] {
    const context = this.getUserContext(sessionId);
    const fallbackStatus = redisFallbackService.getFallbackStatus();
    const indicators: ContextualIndicator[] = [];

    // Contextual fallback indicator
    if (fallbackStatus.isActive) {
      indicators.push(this.createContextualFallbackIndicator(context, responseTime));
    }

    // Performance-aware indicators
    if (responseTime > 3000) {
      indicators.push(this.createPerformanceContextIndicator(context, responseTime));
    }

    // Data freshness with context
    if (!cacheHit && context.preferences.showPerformanceMetrics) {
      indicators.push(this.createDataFreshnessIndicator(context, dataSource));
    }

    return indicators;
  }

  /**
   * Create contextual fallback indicator based on user preferences
   */
  private createContextualFallbackIndicator(
    context: UserContext,
    responseTime: number
  ): ContextualIndicator {
    const baseMessage = this.getBaseMessageForStyle(context.preferences.notificationStyle);
    const userImpact = this.assessUserImpact(context, responseTime);
    const suggestedActions = this.getSuggestedActions(context, responseTime);

    return {
      type: responseTime > 5000 ? 'warning' : 'info',
      message: baseMessage,
      icon: '🛡️',
      dismissible: true,
      autoHide: context.preferences.autoHidePreference && responseTime < 3000,
      duration: this.calculateDuration(context.preferences.notificationStyle),
      context: {
        userImpact,
        suggestedActions,
        alternativeOptions: this.getAlternativeOptions(context),
        estimatedResolution: this.getEstimatedResolution(responseTime),
      },
    };
  }

  /**
   * Update user context based on actions
   */
  public updateUserContext(
    sessionId: string,
    action: string,
    context: Record<string, unknown>
  ): void {
    const userContext = this.getUserContext(sessionId);
    
    userContext.recentActions.push({
      action,
      timestamp: new Date(),
      context,
    });

    // Keep only recent actions (last 10)
    if (userContext.recentActions.length > 10) {
      userContext.recentActions.shift();
    }

    // Update impact tolerance based on user behavior
    this.updateImpactTolerance(userContext);
    
    this.userContexts.set(sessionId, userContext);
  }

  /**
   * Set user preferences
   */
  public setUserPreferences(sessionId: string, preferences: Partial<UserPreferences>): void {
    const context = this.getUserContext(sessionId);
    context.preferences = { ...context.preferences, ...preferences };
    this.userContexts.set(sessionId, context);
  }

  private getUserContext(sessionId: string): UserContext {
    if (!this.userContexts.has(sessionId)) {
      this.userContexts.set(sessionId, {
        sessionId,
        currentPage: '/',
        recentActions: [],
        preferences: {
          notificationStyle: 'detailed',
          autoHidePreference: true,
          preferredFallbackBehavior: 'automatic',
          showPerformanceMetrics: false,
        },
        impactTolerance: 'medium',
      });
    }
    return this.userContexts.get(sessionId)!;
  }

  private assessUserImpact(context: UserContext, responseTime: number): string {
    if (responseTime > 10000) {
      return `Significant delay expected for ${context.currentPage} operations`;
    } else if (responseTime > 5000) {
      return `Moderate delay for current dashboard features`;
    } else {
      return `Minimal impact on your current workflow`;
    }
  }

  private getSuggestedActions(context: UserContext, responseTime: number): string[] {
    const actions: string[] = [];

    if (responseTime > 5000) {
      actions.push('Consider refreshing the page in a few moments');
      actions.push('Try switching to a different dashboard section');
    }

    if (context.preferences.preferredFallbackBehavior === 'manual') {
      actions.push('Click here to manually refresh data');
    }

    return actions;
  }

  /**
   * Create performance context indicator
   */
  private createPerformanceContextIndicator(
    context: UserContext,
    responseTime: number
  ): ContextualIndicator {
    const severity = responseTime > 10000 ? 'warning' : 'info';
    const message = this.getPerformanceMessage(context.preferences.notificationStyle, responseTime);

    return {
      type: severity,
      message,
      icon: '⚡',
      dismissible: true,
      autoHide: context.preferences.autoHidePreference && responseTime < 5000,
      duration: this.calculateDuration(context.preferences.notificationStyle),
      context: {
        userImpact: `Response time: ${Math.round(responseTime)}ms - ${this.getPerformanceImpact(responseTime)}`,
        suggestedActions: this.getPerformanceSuggestedActions(responseTime),
        alternativeOptions: ['Refresh page', 'Try different time range', 'Switch to cached view'],
        estimatedResolution: this.getPerformanceResolution(responseTime),
      },
    };
  }

  /**
   * Create data freshness indicator
   */
  private createDataFreshnessIndicator(
    context: UserContext,
    dataSource: 'redis' | 'fallback' | 'direct'
  ): ContextualIndicator {
    const message = this.getDataFreshnessMessage(context.preferences.notificationStyle, dataSource);

    return {
      type: 'info',
      message,
      icon: '🔄',
      dismissible: true,
      autoHide: context.preferences.autoHidePreference,
      duration: this.calculateDuration(context.preferences.notificationStyle),
      context: {
        userImpact: `Data source: ${dataSource} - Fresh data loaded`,
        suggestedActions: ['Data is current', 'No action needed'],
        alternativeOptions: ['Enable auto-refresh', 'Set refresh interval'],
        estimatedResolution: 'Data is up-to-date',
      },
    };
  }

  /**
   * Get base message based on notification style
   */
  private getBaseMessageForStyle(style: UserPreferences['notificationStyle']): string {
    switch (style) {
      case 'minimal':
        return 'Using backup data';
      case 'detailed':
        return 'Primary data source unavailable, using backup systems to ensure continuity';
      case 'technical':
        return 'Redis connection fallback active - serving from secondary data layer with monitoring';
      default:
        return 'Using backup data';
    }
  }

  /**
   * Get alternative options for user
   */
  private getAlternativeOptions(context: UserContext): string[] {
    const options = ['Wait for automatic recovery', 'Refresh page manually'];

    if (context.preferences.preferredFallbackBehavior === 'manual') {
      options.push('Switch to manual mode');
    }

    return options;
  }

  /**
   * Get estimated resolution time
   */
  private getEstimatedResolution(responseTime: number): string {
    if (responseTime > 10000) {
      return 'Recovery expected within 2-5 minutes';
    } else if (responseTime > 5000) {
      return 'Recovery expected within 1-2 minutes';
    } else {
      return 'Recovery expected within 30 seconds';
    }
  }

  /**
   * Calculate notification duration based on style
   */
  private calculateDuration(style: UserPreferences['notificationStyle']): number {
    switch (style) {
      case 'minimal':
        return 3000; // 3 seconds
      case 'detailed':
        return 8000; // 8 seconds
      case 'technical':
        return 12000; // 12 seconds
      default:
        return 5000; // 5 seconds
    }
  }

  /**
   * Update impact tolerance based on user behavior
   */
  private updateImpactTolerance(context: UserContext): void {
    const recentDismissals = context.recentActions.filter(
      action => action.action === 'dismiss_notification'
    ).length;

    const recentRefreshes = context.recentActions.filter(
      action => action.action === 'manual_refresh'
    ).length;

    // Users who frequently dismiss notifications have higher tolerance
    if (recentDismissals > 3) {
      context.impactTolerance = 'high';
    } else if (recentRefreshes > 2) {
      // Users who frequently refresh have lower tolerance
      context.impactTolerance = 'low';
    } else {
      context.impactTolerance = 'medium';
    }
  }

  private getPerformanceMessage(style: UserPreferences['notificationStyle'], responseTime: number): string {
    const seconds = Math.round(responseTime / 1000);

    switch (style) {
      case 'minimal':
        return `Slow response (${seconds}s)`;
      case 'detailed':
        return `Dashboard is responding slowly (${seconds} seconds) - this may affect your experience`;
      case 'technical':
        return `Performance degradation detected: ${responseTime}ms response time - investigating bottlenecks`;
      default:
        return `Slow response (${seconds}s)`;
    }
  }

  private getPerformanceImpact(responseTime: number): string {
    if (responseTime > 10000) return 'Significant impact on user experience';
    if (responseTime > 5000) return 'Moderate impact on responsiveness';
    return 'Minor performance impact';
  }

  private getPerformanceSuggestedActions(responseTime: number): string[] {
    const actions = [];

    if (responseTime > 10000) {
      actions.push('Consider reducing data range');
      actions.push('Try refreshing in a few moments');
    } else if (responseTime > 5000) {
      actions.push('Wait for current operation to complete');
      actions.push('Consider using cached data');
    } else {
      actions.push('Performance should improve shortly');
    }

    return actions;
  }

  private getPerformanceResolution(responseTime: number): string {
    if (responseTime > 10000) return 'Performance optimization in progress';
    if (responseTime > 5000) return 'System load balancing active';
    return 'Normal performance expected to resume';
  }

  private getDataFreshnessMessage(style: UserPreferences['notificationStyle'], dataSource: string): string {
    switch (style) {
      case 'minimal':
        return 'Fresh data loaded';
      case 'detailed':
        return `Data refreshed from ${dataSource} source - showing latest information`;
      case 'technical':
        return `Data pipeline active: ${dataSource} source providing real-time updates`;
      default:
        return 'Fresh data loaded';
    }
  }
}

export const userContextService = new UserContextService();