/**
 * Data Source Settings Component
 *
 * Displays current data source configuration and status
 * Shows which APIs are enabled/disabled and provides information about each
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react';
import { useDataSourceConfig } from '../hooks/useDataSourceConfig';

export interface DataSourceSettingsProps {
  className?: string;
  showRefreshButton?: boolean;
  showDetailedInfo?: boolean;
}

export default function DataSourceSettings({
  className = '',
  showRefreshButton = true,
  showDetailedInfo = false,
}: DataSourceSettingsProps) {
  const {
    config,
    isLoading,
    error,
    refresh,
    isWorldBankEnabled,
    isOECDEnabled,
    isTraditionalApisEnabled,
    getEnabledDataSources,
  } = useDataSourceConfig();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading Data Source Configuration...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            Configuration Error
          </CardTitle>
          <CardDescription>
            Failed to load data source configuration: {error.message}
          </CardDescription>
        </CardHeader>
        {showRefreshButton && (
          <CardContent>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  const enabledSources = getEnabledDataSources();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Data Source Configuration
            </CardTitle>
            <CardDescription>
              Current status of available data sources ({enabledSources.length} enabled)
            </CardDescription>
          </div>
          {showRefreshButton && (
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* World Bank API */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isWorldBankEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">🌍 {config.dataSources.worldBank.name}</span>
            </div>
            <Badge variant={isWorldBankEnabled ? "default" : "secondary"}>
              {isWorldBankEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          {showDetailedInfo && (
            <div className="text-sm text-muted-foreground">
              {config.dataSources.worldBank.description}
            </div>
          )}
        </div>

        {/* OECD API */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOECDEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">🏛️ {config.dataSources.oecd.name}</span>
            </div>
            <Badge variant={isOECDEnabled ? "default" : "secondary"}>
              {isOECDEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          {showDetailedInfo && (
            <div className="text-sm text-muted-foreground">
              {config.dataSources.oecd.description}
            </div>
          )}
        </div>

        {/* Traditional APIs */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isTraditionalApisEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">🏛️ {config.dataSources.traditionalApis.name}</span>
            </div>
            <Badge variant={isTraditionalApisEnabled ? "default" : "secondary"}>
              {isTraditionalApisEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          {showDetailedInfo && (
            <div className="text-sm text-muted-foreground">
              {config.dataSources.traditionalApis.description}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Last updated: {new Date(config.metadata.timestamp).toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              Environment: {config.metadata.environment}
            </span>
          </div>
        </div>

        {/* Enabled sources list */}
        {enabledSources.length > 0 && (
          <div className="pt-2">
            <div className="text-sm font-medium mb-2">Active Data Sources:</div>
            <div className="flex flex-wrap gap-1">
              {enabledSources.map((source) => (
                <Badge key={source} variant="outline" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
