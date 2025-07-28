/**
 * Adaptive Circuit Breaker Service
 * 
 * Advanced circuit breaker with machine learning-inspired adaptive thresholds
 * that adjust based on historical performance patterns.
 */

// Unused imports removed to fix linting warnings

interface CircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  adaptiveThreshold: number;
  baselinePerformance: PerformanceBaseline;
}

interface PerformanceBaseline {
  avgResponseTime: number;
  avgErrorRate: number;
  stdDeviation: number;
  sampleSize: number;
  lastUpdated: number;
}

interface AdaptiveConfig {
  initialThreshold: number;
  maxThreshold: number;
  minThreshold: number;
  adaptationRate: number; // How quickly thresholds adapt (0-1)
  halfOpenMaxRequests: number;
  openStateTimeoutMs: number;
  baselineWindowSize: number;
}

class AdaptiveCircuitBreaker {
  private circuits = new Map<string, CircuitState>();
  private performanceHistory = new Map<string, number[]>();
  
  private readonly config: AdaptiveConfig = {
    initialThreshold: 5,
    maxThreshold: 20,
    minThreshold: 2,
    adaptationRate: 0.1,
    halfOpenMaxRequests: 3,
    openStateTimeoutMs: 60000,
    baselineWindowSize: 100,
  };

  /**
   * Execute operation through adaptive circuit breaker
   */
  public async executeWithCircuitBreaker<T>(
    operationKey: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(operationKey);
    
    // Check if circuit should be opened
    if (this.shouldOpenCircuit(circuit)) {
      this.openCircuit(circuit);
    }
    
    // Handle different circuit states
    switch (circuit.state) {
      case 'OPEN':
        if (this.shouldAttemptReset(circuit)) {
          this.halfOpenCircuit(circuit);
          return this.executeWithMonitoring(operationKey, operation, fallback);
        }
        return fallback();
        
      case 'HALF_OPEN':
        return this.executeWithMonitoring(operationKey, operation, fallback);
        
      case 'CLOSED':
      default:
        return this.executeWithMonitoring(operationKey, operation, fallback);
    }
  }

  /**
   * Execute operation with performance monitoring and adaptive threshold adjustment
   */
  private async executeWithMonitoring<T>(
    operationKey: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    const circuit = this.circuits.get(operationKey)!;
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      // Record success
      this.recordSuccess(operationKey, responseTime);
      
      // Adapt thresholds based on performance
      this.adaptThresholds(circuit, responseTime, true);
      
      // Close circuit if in half-open state
      if (circuit.state === 'HALF_OPEN') {
        this.closeCircuit(circuit);
      }
      
      return result;
    } catch (_error) {
      const responseTime = Date.now() - startTime;
      
      // Record failure
      this.recordFailure(operationKey, responseTime);
      
      // Adapt thresholds based on failure
      this.adaptThresholds(circuit, responseTime, false);
      
      // Use fallback
      return fallback();
    }
  }

  /**
   * Adapt thresholds based on recent performance patterns
   */
  private adaptThresholds(circuit: CircuitState, responseTime: number, success: boolean): void {
    const history = this.performanceHistory.get(circuit.state) || [];
    history.push(responseTime);
    
    // Keep only recent history
    if (history.length > this.config.baselineWindowSize) {
      history.shift();
    }
    
    // Update baseline performance
    this.updateBaseline(circuit, history);
    
    // Adapt threshold based on performance variance
    const variance = this.calculateVariance(history);
    const adaptationFactor = success ? -this.config.adaptationRate : this.config.adaptationRate;
    
    // Adjust threshold based on variance and recent performance
    const varianceMultiplier = Math.min(variance / 1000, 2); // Cap at 2x
    const newThreshold = circuit.adaptiveThreshold + (adaptationFactor * varianceMultiplier);
    
    circuit.adaptiveThreshold = Math.max(
      this.config.minThreshold,
      Math.min(this.config.maxThreshold, newThreshold)
    );
  }

  /**
   * Determine if circuit should be opened based on adaptive threshold
   */
  private shouldOpenCircuit(circuit: CircuitState): boolean {
    if (circuit.state === 'OPEN') return false;
    
    // Use adaptive threshold instead of static threshold
    return circuit.failureCount >= circuit.adaptiveThreshold;
  }

  /**
   * Update performance baseline for better threshold adaptation
   */
  private updateBaseline(circuit: CircuitState, history: number[]): void {
    if (history.length < 10) return; // Need minimum samples
    
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = this.calculateVariance(history);
    
    circuit.baselinePerformance = {
      avgResponseTime: avg,
      avgErrorRate: circuit.failureCount / (circuit.failureCount + circuit.successCount),
      stdDeviation: Math.sqrt(variance),
      sampleSize: history.length,
      lastUpdated: Date.now(),
    };
  }

  private calculateVariance(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  }

  private getOrCreateCircuit(operationKey: string): CircuitState {
    if (!this.circuits.has(operationKey)) {
      this.circuits.set(operationKey, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        adaptiveThreshold: this.config.initialThreshold,
        baselinePerformance: {
          avgResponseTime: 0,
          avgErrorRate: 0,
          stdDeviation: 0,
          sampleSize: 0,
          lastUpdated: Date.now(),
        },
      });
    }
    return this.circuits.get(operationKey)!;
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(circuit: CircuitState): void {
    circuit.state = 'OPEN';
    circuit.lastFailureTime = Date.now();
  }

  /**
   * Close the circuit breaker
   */
  private closeCircuit(circuit: CircuitState): void {
    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
    circuit.successCount = 0;
  }

  /**
   * Set circuit to half-open state
   */
  private halfOpenCircuit(circuit: CircuitState): void {
    circuit.state = 'HALF_OPEN';
    circuit.successCount = 0;
  }

  /**
   * Check if circuit should attempt reset from open to half-open
   */
  private shouldAttemptReset(circuit: CircuitState): boolean {
    return Date.now() - circuit.lastFailureTime >= this.config.openStateTimeoutMs;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(operationKey: string, responseTime: number): void {
    const circuit = this.circuits.get(operationKey)!;
    circuit.successCount++;
    circuit.lastSuccessTime = Date.now();

    // Update performance history
    const history = this.performanceHistory.get(operationKey) || [];
    history.push(responseTime);
    this.performanceHistory.set(operationKey, history);
  }

  /**
   * Record failed operation
   */
  private recordFailure(operationKey: string, responseTime: number): void {
    const circuit = this.circuits.get(operationKey)!;
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    // Update performance history
    const history = this.performanceHistory.get(operationKey) || [];
    history.push(responseTime);
    this.performanceHistory.set(operationKey, history);
  }
}

export const adaptiveCircuitBreaker = new AdaptiveCircuitBreaker();