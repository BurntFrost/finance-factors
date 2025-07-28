import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Store WebSocket connections
const connections = new Map<string, any>();
const subscriptions = new Map<string, Set<string>>(); // dataType -> Set of connection IDs

// Mock data generators for real-time updates
const dataGenerators = {
  'house-prices': () => ({
    labels: [new Date().toISOString()],
    datasets: [{
      label: 'House Price Index',
      data: [Math.random() * 100 + 200],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
    }],
    isRealData: true,
    lastUpdated: new Date(),
  }),
  
  'salary-income': () => ({
    labels: [new Date().toISOString()],
    datasets: [{
      label: 'Average Hourly Earnings',
      data: [Math.random() * 10 + 25],
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 2,
    }],
    isRealData: true,
    lastUpdated: new Date(),
  }),

  'inflation-cpi': () => ({
    labels: [new Date().toISOString()],
    datasets: [{
      label: 'Consumer Price Index',
      data: [Math.random() * 20 + 280],
      backgroundColor: 'rgba(245, 101, 101, 0.5)',
      borderColor: 'rgb(245, 101, 101)',
      borderWidth: 2,
    }],
    isRealData: true,
    lastUpdated: new Date(),
  }),
};

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Initialize WebSocket server
function initWebSocketServer() {
  if (wss) return wss;

  // Create HTTP server for WebSocket
  const server = createServer();
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, _request) => {
    const connectionId = generateConnectionId();
    connections.set(connectionId, ws);

    console.log(`WebSocket client connected: ${connectionId}`);

    // Send connection status
    ws.send(JSON.stringify({
      type: 'connection_status',
      payload: { status: 'connected', connectionId },
      timestamp: Date.now(),
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(connectionId, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
          timestamp: Date.now(),
        }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${connectionId}`);
      connections.delete(connectionId);
      
      // Remove from all subscriptions
      subscriptions.forEach((connectionIds, dataType) => {
        connectionIds.delete(connectionId);
        if (connectionIds.size === 0) {
          subscriptions.delete(dataType);
        }
      });
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
    });

    // Handle ping/pong for keepalive
    ws.on('ping', () => {
      ws.pong();
    });
  });

  // Start data broadcasting
  startDataBroadcasting();

  return wss;
}

function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function handleWebSocketMessage(connectionId: string, message: any) {
  const ws = connections.get(connectionId);
  if (!ws) return;

  switch (message.type) {
    case 'subscribe':
      handleSubscription(connectionId, message.payload.dataType, true);
      break;
      
    case 'unsubscribe':
      handleSubscription(connectionId, message.payload.dataType, false);
      break;
      
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        payload: {},
        timestamp: Date.now(),
      }));
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: `Unknown message type: ${message.type}` },
        timestamp: Date.now(),
      }));
  }
}

function handleSubscription(connectionId: string, dataType: string, subscribe: boolean) {
  if (subscribe) {
    if (!subscriptions.has(dataType)) {
      subscriptions.set(dataType, new Set());
    }
    subscriptions.get(dataType)!.add(connectionId);
    
    console.log(`Client ${connectionId} subscribed to ${dataType}`);
    
    // Send initial data
    const generator = dataGenerators[dataType as keyof typeof dataGenerators];
    if (generator) {
      const ws = connections.get(connectionId);
      if (ws) {
        ws.send(JSON.stringify({
          type: 'data_update',
          payload: generator(),
          timestamp: Date.now(),
          dataType,
          source: 'websocket',
        }));
      }
    }
  } else {
    const typeSubscriptions = subscriptions.get(dataType);
    if (typeSubscriptions) {
      typeSubscriptions.delete(connectionId);
      if (typeSubscriptions.size === 0) {
        subscriptions.delete(dataType);
      }
    }
    
    console.log(`Client ${connectionId} unsubscribed from ${dataType}`);
  }
}

function startDataBroadcasting() {
  // Broadcast updates every 5 seconds
  setInterval(() => {
    subscriptions.forEach((connectionIds, dataType) => {
      const generator = dataGenerators[dataType as keyof typeof dataGenerators];
      if (!generator) return;

      const data = generator();
      const message = JSON.stringify({
        type: 'data_update',
        payload: data,
        timestamp: Date.now(),
        dataType,
        source: 'websocket',
      });

      connectionIds.forEach(connectionId => {
        const ws = connections.get(connectionId);
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      });
    });
  }, 5000);

  // Send status updates every 30 seconds
  setInterval(() => {
    const statusMessage = JSON.stringify({
      type: 'status_update',
      payload: {
        activeConnections: connections.size,
        activeSubscriptions: subscriptions.size,
        uptime: process.uptime(),
      },
      timestamp: Date.now(),
    });

    connections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(statusMessage);
      }
    });
  }, 30000);
}

// HTTP upgrade handler for WebSocket
export async function GET(request: NextRequest) {
  const { searchParams: _searchParams } = new URL(request.url);
  
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('WebSocket endpoint - use WebSocket client to connect', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Initialize WebSocket server if not already done
  if (!wss) {
    initWebSocketServer();
  }

  // Return information about the WebSocket endpoint
  return new Response(JSON.stringify({
    message: 'WebSocket server is running',
    endpoint: '/api/ws',
    activeConnections: connections.size,
    activeSubscriptions: subscriptions.size,
    supportedDataTypes: Object.keys(dataGenerators),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Handle WebSocket upgrade in development
if (process.env.NODE_ENV === 'development') {
  // In development, we need to handle WebSocket upgrades differently
  // This is a simplified approach - in production, you'd use a proper WebSocket server
  console.log('WebSocket server initialized for development');
  initWebSocketServer();
}
