#!/usr/bin/env node

/**
 * Test script to verify Redis logging behavior
 * 
 * This script tests that Redis disabled messages are only logged in development mode
 * and not in production mode.
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function testRedisLogging() {
  log(`${colors.bold}Testing Redis Logging Behavior${colors.reset}`);
  log('=====================================\n');

  // Test 1: Development mode (should show debug messages)
  logInfo('Test 1: Development mode logging');
  
  const devEnv = {
    ...process.env,
    NODE_ENV: 'development',
    ENABLE_REDIS: 'false'
  };

  try {
    const devTest = spawn('node', ['-e', `
      process.env.NODE_ENV = 'development';
      process.env.ENABLE_REDIS = 'false';
      const { isRedisEnabled } = require('./lib/backend/lib/feature-toggles');
      const { getRedisClient } = require('./lib/backend/lib/redis');
      
      console.log('Development mode test:');
      console.log('Redis enabled:', isRedisEnabled());
      
      getRedisClient().then(client => {
        console.log('Client result:', client === null ? 'null' : 'not null');
        process.exit(0);
      }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
    `], { 
      cwd: process.cwd(),
      env: devEnv,
      stdio: 'pipe'
    });

    let devOutput = '';
    devTest.stdout.on('data', (data) => {
      devOutput += data.toString();
    });

    devTest.stderr.on('data', (data) => {
      devOutput += data.toString();
    });

    await new Promise((resolve) => {
      devTest.on('close', (code) => {
        if (devOutput.includes('Redis is disabled')) {
          logSuccess('Development mode correctly shows Redis debug messages');
        } else {
          logError('Development mode should show Redis debug messages');
        }
        resolve();
      });
    });

  } catch (error) {
    logError(`Development mode test failed: ${error.message}`);
  }

  // Test 2: Production mode (should NOT show debug messages)
  logInfo('\nTest 2: Production mode logging');
  
  const prodEnv = {
    ...process.env,
    NODE_ENV: 'production',
    ENABLE_REDIS: 'false'
  };

  try {
    const prodTest = spawn('node', ['-e', `
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_REDIS = 'false';
      const { isRedisEnabled } = require('./lib/backend/lib/feature-toggles');
      const { getRedisClient } = require('./lib/backend/lib/redis');
      
      console.log('Production mode test:');
      console.log('Redis enabled:', isRedisEnabled());
      
      getRedisClient().then(client => {
        console.log('Client result:', client === null ? 'null' : 'not null');
        process.exit(0);
      }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
      });
    `], { 
      cwd: process.cwd(),
      env: prodEnv,
      stdio: 'pipe'
    });

    let prodOutput = '';
    prodTest.stdout.on('data', (data) => {
      prodOutput += data.toString();
    });

    prodTest.stderr.on('data', (data) => {
      prodOutput += data.toString();
    });

    await new Promise((resolve) => {
      prodTest.on('close', (code) => {
        if (!prodOutput.includes('Redis is disabled')) {
          logSuccess('Production mode correctly suppresses Redis debug messages');
        } else {
          logError('Production mode should NOT show Redis debug messages');
          console.log('Output:', prodOutput);
        }
        resolve();
      });
    });

  } catch (error) {
    logError(`Production mode test failed: ${error.message}`);
  }

  log('\n' + colors.bold + 'Test Summary:' + colors.reset);
  log('• Redis debug messages should only appear in development mode');
  log('• Production deployments will have cleaner logs');
  log('• Application functionality remains unchanged');
}

// Run the test
if (require.main === module) {
  testRedisLogging().catch(console.error);
}

module.exports = { testRedisLogging };
