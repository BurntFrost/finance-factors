/**
 * Data Source Monitoring API Endpoint
 * 
 * Provides comprehensive monitoring data for the dual data source system,
 * including events, performance metrics, and health status.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  dualDataSourceMonitor,
  MonitoringEventType,
  EventSeverity,
} from '@/shared/utils/dualDataSourceMonitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type') as MonitoringEventType | null;
    const severity = searchParams.get('severity') as EventSeverity | null;
    const provider = searchParams.get('provider');
    const dataType = searchParams.get('dataType');
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;
    const timeWindow = parseInt(searchParams.get('timeWindow') || '86400000'); // 24 hours default

    // Get monitoring data
    const events = dualDataSourceMonitor.getEvents({
      limit,
      type: type || undefined,
      severity: severity || undefined,
      provider: provider || undefined,
      dataType: dataType || undefined,
      since,
    });

    const performanceMetrics = dualDataSourceMonitor.getPerformanceMetrics(
      provider || undefined,
      dataType || undefined
    );

    const summary = dualDataSourceMonitor.getSummary(timeWindow);
    const alertConfigs = dualDataSourceMonitor.getAlertConfigs();

    // Build response
    const response = {
      timestamp: new Date().toISOString(),
      timeWindow,
      summary,
      events: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString(),
      })),
      performanceMetrics,
      alertConfigs,
      metadata: {
        totalEvents: events.length,
        queryParams: {
          limit,
          type,
          severity,
          provider,
          dataType,
          since: since?.toISOString(),
          timeWindow,
        },
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch monitoring data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'clear-events':
        dualDataSourceMonitor.clearEvents();
        return NextResponse.json({ 
          success: true, 
          message: 'Events cleared',
          timestamp: new Date().toISOString(),
        });

      case 'clear-metrics':
        dualDataSourceMonitor.clearMetrics();
        return NextResponse.json({ 
          success: true, 
          message: 'Metrics cleared',
          timestamp: new Date().toISOString(),
        });

      case 'update-alert-config':
        const { type, updates } = params;
        if (!type || !updates) {
          return NextResponse.json(
            { error: 'Missing type or updates parameters' },
            { status: 400 }
          );
        }
        
        dualDataSourceMonitor.updateAlertConfig(type, updates);
        return NextResponse.json({ 
          success: true, 
          message: 'Alert configuration updated',
          timestamp: new Date().toISOString(),
        });

      case 'export-data':
        const exportData = dualDataSourceMonitor.exportData();
        return NextResponse.json({
          success: true,
          data: {
            ...exportData,
            events: exportData.events.map(event => ({
              ...event,
              timestamp: event.timestamp.toISOString(),
            })),
          },
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing monitoring request:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process monitoring request',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
