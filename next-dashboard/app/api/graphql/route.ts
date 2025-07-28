/**
 * GraphQL API Route
 * 
 * Next.js 15 App Router GraphQL endpoint with Apollo Server
 * Includes performance optimizations, caching, and monitoring.
 */

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

// GraphQL context interface
interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  req: any;
}

// Create Apollo Server with optimized configuration
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  
  // Performance and development settings
  introspection: process.env.NODE_ENV === 'development',
  
  // Custom formatting for better error handling
  formatError: (error) => {
    // Log errors in production
    if (process.env.NODE_ENV === 'production') {
      console.error('GraphQL Error:', {
        message: error.message,
        path: error.path,
        locations: error.locations,
        extensions: error.extensions,
      });
    }

    // Return sanitized error in production
    return process.env.NODE_ENV === 'production'
      ? {
          message: error.message.includes('Not authenticated') || error.message.includes('Access denied')
            ? error.message
            : 'An error occurred while processing your request',
          extensions: {
            code: error.extensions?.code || 'INTERNAL_ERROR',
          },
        }
      : error;
  },

  // Plugin for request/response logging and metrics
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation(requestContext: any) {
            // Log operation in development
            if (process.env.NODE_ENV === 'development') {
              console.log('GraphQL Operation:', {
                operationName: requestContext.request.operationName,
                query: requestContext.request.query?.substring(0, 200) + '...',
              });
            }
          },

          async didEncounterErrors(requestContext: any) {
            // Log errors with context
            console.error('GraphQL Errors:', {
              operationName: requestContext.request.operationName,
              errors: requestContext.errors?.map((error: any) => ({
                message: error.message,
                path: error.path,
              })),
            });
          },

          async willSendResponse(requestContext: any) {
            // Performance monitoring
            const executionTime = Date.now() - (requestContext.request.http?.startTime || Date.now());
            
            if (executionTime > 1000) {
              console.warn('Slow GraphQL Query:', {
                operationName: requestContext.request.operationName,
                executionTime,
              });
            }
          },
        };
      },
    },
  ],
});

// Create the Next.js handler
const handler = startServerAndCreateNextHandler(server, {
  context: async (req): Promise<GraphQLContext> => {
    // Extract user from request (implement your auth logic here)
    const user = await extractUserFromRequest(req);
    
    // Add start time for performance monitoring
    (req as any).startTime = Date.now();
    
    return {
      user,
      req,
    };
  },
});

// Helper function to extract user from request
async function extractUserFromRequest(req: any): Promise<GraphQLContext['user'] | undefined> {
  try {
    // Check for Authorization header
    const authHeader = req.headers?.get ? req.headers.get('authorization') : req.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authHeader.substring(7);
    
    // Validate token (implement your token validation logic here)
    // This is a placeholder - replace with your actual auth implementation
    if (token === 'development-token') {
      return {
        id: 'dev-user-1',
        email: 'dev@example.com',
        role: 'ADMIN',
      };
    }

    // In a real implementation, you would:
    // 1. Validate JWT token
    // 2. Query user from database
    // 3. Check token expiration
    // 4. Handle refresh tokens
    
    return undefined;
  } catch (error) {
    console.error('Auth error:', error);
    return undefined;
  }
}

// CORS headers for GraphQL endpoint
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Handle GET requests (for GraphQL Playground in development)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    // Return GraphQL Playground HTML
    const playgroundHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
        </head>
        <body>
          <div id="root">
            <style>
              body { margin: 0; font-family: 'Open Sans', sans-serif; }
              #root { height: 100vh; }
            </style>
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column;">
              <h1>GraphQL Playground</h1>
              <p>Use POST requests to /api/graphql for GraphQL operations</p>
              <p>Or use a GraphQL client like Apollo Studio or Insomnia</p>
              <div style="margin-top: 20px;">
                <h3>Example Query:</h3>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">
query {
  getChartData(input: {
    dataType: "house-prices"
    useCache: true
  }) {
    labels
    datasets {
      label
      data
    }
    lastUpdated
    isRealData
  }
}
                </pre>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return new Response(playgroundHtml, {
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders,
      },
    });
  }

  // In production, redirect to documentation or return 404
  return new Response('GraphQL endpoint - use POST requests', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      ...corsHeaders,
    },
  });
}

// Handle POST requests (GraphQL operations)
export async function POST(request: NextRequest) {
  try {
    const response = await handler(request);
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error('GraphQL handler error:', error);
    
    return new Response(
      JSON.stringify({
        errors: [
          {
            message: 'Internal server error',
            extensions: {
              code: 'INTERNAL_ERROR',
            },
          },
        ],
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}
