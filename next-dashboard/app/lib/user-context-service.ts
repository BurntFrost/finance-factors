/**
 * User Context Service
 * 
 * Provides contextual user experience based on user behavior,
 * preferences, and current system state.
 */

import { UserExperienceIndicator, PerformanceImpact as _PerformanceImpact } from '../api/types/proxy';
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
}

export const userContextService = new UserContextService();