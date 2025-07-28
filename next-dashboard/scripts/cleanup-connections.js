#!/usr/bin/env node

/**
 * Database Connection Cleanup Script
 * 
 * This script helps clean up database connections and reset connection pools
 * when experiencing connection limit issues.
 */

const { PrismaClient } = require('../app/generated/prisma');

async function cleanupConnections() {
  console.log('🔧 Starting database connection cleanup...');
  
  let prisma;
  
  try {
    // Create a new Prisma client with minimal connections
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DIRECT_URL || process.env.DATABASE_URL,
        },
      },
      __internal: {
        engine: {
          connectionLimit: 1,
          connectTimeout: 5000,
          poolTimeout: 10,
        },
      },
    });

    console.log('📊 Checking database connection...');
    
    // Test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    // Get connection information
    try {
      const connectionInfo = await prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      
      console.log('📈 Connection Statistics:');
      console.log(`   Total connections: ${connectionInfo[0]?.total_connections || 'N/A'}`);
      console.log(`   Active connections: ${connectionInfo[0]?.active_connections || 'N/A'}`);
      console.log(`   Idle connections: ${connectionInfo[0]?.idle_connections || 'N/A'}`);
    } catch (error) {
      console.log('⚠️  Could not retrieve connection statistics:', error.message);
    }

    // Clean up expired cache entries to reduce database load
    console.log('🧹 Cleaning up expired cache entries...');
    try {
      const deletedCount = await prisma.cachedData.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      console.log(`✅ Cleaned up ${deletedCount.count} expired cache entries`);
    } catch (error) {
      console.log('⚠️  Could not clean cache entries:', error.message);
    }

    // Vacuum analyze to optimize database performance
    console.log('🔧 Optimizing database performance...');
    try {
      await prisma.$executeRaw`VACUUM ANALYZE`;
      console.log('✅ Database optimization completed');
    } catch (error) {
      console.log('⚠️  Could not optimize database:', error.message);
    }

    console.log('✅ Connection cleanup completed successfully');

  } catch (error) {
    console.error('❌ Connection cleanup failed:', error.message);
    
    if (error.message.includes('too many connections')) {
      console.log('\n🚨 Connection limit exceeded. Recommendations:');
      console.log('   1. Wait a few minutes for connections to timeout');
      console.log('   2. Check for long-running queries');
      console.log('   3. Restart the application if necessary');
      console.log('   4. Consider upgrading database plan for more connections');
    }
    
    process.exit(1);
  } finally {
    if (prisma) {
      console.log('🔌 Disconnecting Prisma client...');
      await prisma.$disconnect();
    }
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Script interrupted, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Script terminated, cleaning up...');
  process.exit(0);
});

// Run the cleanup
if (require.main === module) {
  cleanupConnections().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { cleanupConnections };
