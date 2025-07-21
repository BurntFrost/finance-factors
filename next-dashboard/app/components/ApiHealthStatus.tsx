'use client';

import React, { useState, useEffect } from 'react';
import { realApiService } from '../services/realApiService';

interface ApiStatus {
  configured: boolean;
  available: boolean;
}

interface ApiHealthStatusProps {
  className?: string;
  showDetails?: boolean;
}

const ApiHealthStatus: React.FC<ApiHealthStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [healthStatus, setHealthStatus] = useState<Record<string, ApiStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(showDetails);

  useEffect(() => {
    checkApiHealth();
    
    // Check health every 5 minutes
    const interval = setInterval(checkApiHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkApiHealth = async () => {
    setIsLoading(true);
    try {
      const status = await realApiService.getHealthStatus();
      setHealthStatus(status);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check API health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ApiStatus) => {
    if (!status.configured) return '⚪'; // Not configured
    if (status.available) return '🟢'; // Available
    return '🔴'; // Configured but not available
  };

  const getStatusText = (status: ApiStatus) => {
    if (!status.configured) return 'Not configured';
    if (status.available) return 'Available';
    return 'Unavailable';
  };

  const getStatusColor = (status: ApiStatus) => {
    if (!status.configured) return 'text-gray-500';
    if (status.available) return 'text-green-600';
    return 'text-red-600';
  };

  const apiDescriptions = {
    FRED: 'Federal Reserve Economic Data - Housing prices, interest rates, GDP',
    BLS: 'Bureau of Labor Statistics - Employment, wages, inflation',
    CENSUS: 'U.S. Census Bureau - Demographics, housing, income',
    ALPHA_VANTAGE: 'Alpha Vantage - Additional economic indicators',
  };

  const configuredCount = Object.values(healthStatus).filter(s => s.configured).length;
  const availableCount = Object.values(healthStatus).filter(s => s.configured && s.available).length;

  if (isLoading && Object.keys(healthStatus).length === 0) {
    return (
      <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Checking API status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      <div 
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              API Status
            </span>
            <span className="text-xs text-gray-500">
              ({availableCount}/{configuredCount} available)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {configuredCount === 0 && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                No APIs configured
              </span>
            )}
            {configuredCount > 0 && availableCount === configuredCount && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                All systems operational
              </span>
            )}
            {configuredCount > 0 && availableCount < configuredCount && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                Some APIs unavailable
              </span>
            )}
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t bg-gray-50">
          <div className="p-3 space-y-2">
            {Object.entries(healthStatus).map(([provider, status]) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getStatusIcon(status)}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {provider}
                    </div>
                    <div className="text-xs text-gray-500">
                      {apiDescriptions[provider as keyof typeof apiDescriptions]}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-medium ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </span>
              </div>
            ))}
            
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkApiHealth();
                  }}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {isLoading ? 'Checking...' : 'Refresh'}
                </button>
              </div>
            </div>

            {configuredCount === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="text-sm text-amber-800">
                  <strong>No APIs configured</strong>
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  To use live data, configure API keys in your .env.local file. 
                  See .env.example for setup instructions.
                </div>
              </div>
            )}

            {configuredCount > 0 && availableCount === 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-sm text-red-800">
                  <strong>All configured APIs are unavailable</strong>
                </div>
                <div className="text-xs text-red-700 mt-1">
                  Check your internet connection and API key validity. 
                  The dashboard will use sample data as fallback.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiHealthStatus;
