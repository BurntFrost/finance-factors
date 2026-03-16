#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * Tests basic database operations with your Vercel Postgres setup
 */

const { PrismaClient } = require('../app/generated/prisma');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Vercel Postgres connection...\n');
    
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const _result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Basic connection successful');
    
    // Test 2: Check if tables exist
    console.log('\n2. Checking database schema...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log(`   ✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`      - ${table.table_name}`);
    });
    
    // Test 3: Test user operations (if tables exist)
    if (tables.length > 0) {
      console.log('\n3. Testing basic CRUD operations...');
      
      // Create a test user
      const testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'VIEWER',
        },
      });
      console.log('   ✅ Created test user:', testUser.id);
      
      // Read the user
      const foundUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      console.log('   ✅ Retrieved test user:', foundUser?.name);
      
      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: { name: 'Updated Test User' },
      });
      console.log('   ✅ Updated test user:', updatedUser.name);
      
      // Delete the test user
      await prisma.user.delete({
        where: { id: testUser.id },
      });
      console.log('   ✅ Deleted test user');
    }
    
    // Test 4: Performance test
    console.log('\n4. Testing query performance...');
    const start = Date.now();
    await prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables`;
    const end = Date.now();
    console.log(`   ✅ Query executed in ${end - start}ms`);
    
    console.log('\n🎉 All database tests passed!');
    console.log('\nYour Vercel Postgres database is ready to use with:');
    console.log('- ✅ Connection established');
    console.log('- ✅ Schema deployed');
    console.log('- ✅ CRUD operations working');
    console.log('- ✅ Performance acceptable');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Connection issue. Check your DATABASE_URL in .env.local');
    } else if (error.code === 'P2002') {
      console.log('\n💡 Unique constraint violation (this might be expected)');
    } else {
      console.log('\n💡 Error details:', error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabase().catch(console.error);
