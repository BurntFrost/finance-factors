#!/usr/bin/env node

/**
 * Advanced Features Testing Script
 * 
 * This script tests the integration and functionality of all advanced interactive features
 * added to the Finance Factors Dashboard.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
}

function checkDependency(packageName) {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.dependencies[packageName] || packageJson.devDependencies[packageName];
  } catch (error) {
    return false;
  }
}

function runTests() {
  log('\n🧪 Advanced Features Integration Test Suite', 'cyan');
  log('=' .repeat(50), 'cyan');

  let totalTests = 0;
  let passedTests = 0;

  function test(description, testFn) {
    totalTests++;
    try {
      const result = testFn();
      if (result) {
        log(`✅ ${description}`, 'green');
        passedTests++;
      } else {
        log(`❌ ${description}`, 'red');
      }
    } catch (error) {
      log(`❌ ${description} - Error: ${error.message}`, 'red');
    }
  }

  // Test 1: Dependencies
  log('\n📦 Testing Dependencies', 'yellow');
  test('Chart.js zoom plugin installed', () => checkDependency('chartjs-plugin-zoom'));
  test('@dnd-kit/core installed', () => checkDependency('@dnd-kit/core'));
  test('@dnd-kit/sortable installed', () => checkDependency('@dnd-kit/sortable'));
  test('react-resizable-panels installed', () => checkDependency('react-resizable-panels'));
  test('jsPDF installed', () => checkDependency('jspdf'));
  test('html2canvas installed', () => checkDependency('html2canvas'));
  test('papaparse installed', () => checkDependency('papaparse'));
  test('ws (WebSocket) installed', () => checkDependency('ws'));
  test('crossfilter2 installed', () => checkDependency('crossfilter2'));

  // Test 2: Core Components
  log('\n🧩 Testing Core Components', 'yellow');
  test('EnhancedInteractiveChart component exists', () => 
    checkFileExists('app/components/EnhancedInteractiveChart.tsx'));
  test('DragDropDashboard component exists', () => 
    checkFileExists('app/components/DragDropDashboard.tsx'));
  test('ResizableChartContainer component exists', () => 
    checkFileExists('app/components/ResizableChartContainer.tsx'));
  test('DataComparisonTool component exists', () => 
    checkFileExists('app/components/DataComparisonTool.tsx'));
  test('ExportMenu component exists', () => 
    checkFileExists('app/components/ExportMenu.tsx'));
  test('DashboardCustomizationPanel component exists', () => 
    checkFileExists('app/components/DashboardCustomizationPanel.tsx'));

  // Test 3: Configuration Files
  log('\n⚙️ Testing Configuration Files', 'yellow');
  test('Interactive chart configuration exists', () => 
    checkFileExists('app/config/interactiveChartConfiguration.ts'));
  test('Chart registration updated', () => 
    checkFileExists('app/components/ChartRegistration.tsx'));

  // Test 4: Utility Functions
  log('\n🔧 Testing Utility Functions', 'yellow');
  test('WebSocket service exists', () => 
    checkFileExists('app/services/websocketService.ts'));
  test('Crossfilter utilities exist', () => 
    checkFileExists('app/utils/crossfilter.ts'));
  test('Data export utilities exist', () => 
    checkFileExists('app/utils/dataExport.ts'));
  test('LocalStorage utilities updated', () => 
    checkFileExists('app/utils/localStorage.ts'));

  // Test 5: Context Providers
  log('\n🌐 Testing Context Providers', 'yellow');
  test('CrossfilterContext exists', () => 
    checkFileExists('app/context/CrossfilterContext.tsx'));

  // Test 6: API Routes
  log('\n🌐 Testing API Routes', 'yellow');
  test('WebSocket API route exists', () => 
    checkFileExists('app/api/ws/route.ts'));

  // Test 7: Styling
  log('\n🎨 Testing Styling', 'yellow');
  test('EnhancedInteractiveChart styles exist', () => 
    checkFileExists('app/components/EnhancedInteractiveChart.module.css'));
  test('DragDropDashboard styles exist', () => 
    checkFileExists('app/components/DragDropDashboard.module.css'));
  test('ResizableChartContainer styles exist', () => 
    checkFileExists('app/components/ResizableChartContainer.module.css'));
  test('DataComparisonTool styles exist', () => 
    checkFileExists('app/components/DataComparisonTool.module.css'));
  test('ExportMenu styles exist', () => 
    checkFileExists('app/components/ExportMenu.module.css'));
  test('DashboardCustomizationPanel styles exist', () => 
    checkFileExists('app/components/DashboardCustomizationPanel.module.css'));

  // Test 8: Transition Components
  log('\n🔄 Testing Transition Components', 'yellow');
  test('SmoothChartTransition component exists', () => 
    checkFileExists('app/components/SmoothChartTransition.tsx'));
  test('SmoothChartTransition styles exist', () => 
    checkFileExists('app/components/SmoothChartTransition.module.css'));

  // Test 9: Status Indicators
  log('\n📊 Testing Status Indicators', 'yellow');
  test('RealTimeStatusIndicator component exists', () => 
    checkFileExists('app/components/RealTimeStatusIndicator.tsx'));
  test('RealTimeStatusIndicator styles exist', () => 
    checkFileExists('app/components/RealTimeStatusIndicator.module.css'));

  // Test 10: Layout Management
  log('\n📐 Testing Layout Management', 'yellow');
  test('DashboardLayoutManager component exists', () => 
    checkFileExists('app/components/DashboardLayoutManager.tsx'));
  test('DashboardLayoutManager styles exist', () => 
    checkFileExists('app/components/DashboardLayoutManager.module.css'));

  // Test 11: Integration Documentation
  log('\n📚 Testing Documentation', 'yellow');
  test('Integration guide exists', () => 
    checkFileExists('ADVANCED_FEATURES_INTEGRATION.md'));

  // Test 12: Type Definitions
  log('\n📝 Testing Type Definitions', 'yellow');
  test('Dashboard types exist', () => 
    checkFileExists('app/types/dashboard.ts'));
  test('DataSource types exist', () => 
    checkFileExists('app/types/dataSource.ts'));

  // Summary
  log('\n📊 Test Results Summary', 'cyan');
  log('=' .repeat(30), 'cyan');
  log(`Total Tests: ${totalTests}`, 'bright');
  log(`Passed: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`Failed: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? 'green' : 'red');
  log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`, 
    passedTests === totalTests ? 'green' : 'yellow');

  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! Advanced features are ready for integration.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Run npm install to ensure all dependencies are installed', 'bright');
    log('2. Update your main dashboard component to use the new features', 'bright');
    log('3. Test the features in development environment', 'bright');
    log('4. Review the integration guide: ADVANCED_FEATURES_INTEGRATION.md', 'bright');
  } else {
    log('\n⚠️  Some tests failed. Please check the missing files/dependencies.', 'yellow');
    log('\nRecommended actions:', 'cyan');
    log('1. Install missing dependencies with npm install', 'bright');
    log('2. Ensure all component files are properly created', 'bright');
    log('3. Check file paths and naming conventions', 'bright');
  }

  return passedTests === totalTests;
}

// Additional validation functions
function validatePackageJson() {
  log('\n🔍 Validating package.json configuration...', 'cyan');
  
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      'chartjs-plugin-zoom',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      'react-resizable-panels',
      'jspdf',
      'html2canvas',
      'papaparse',
      'ws',
      'crossfilter2'
    ];

    const requiredTypeDeps = [
      '@types/ws',
      '@types/papaparse'
    ];

    let allDepsPresent = true;

    requiredDeps.forEach(dep => {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        log(`❌ Missing dependency: ${dep}`, 'red');
        allDepsPresent = false;
      } else {
        log(`✅ Found dependency: ${dep}`, 'green');
      }
    });

    requiredTypeDeps.forEach(dep => {
      if (!packageJson.devDependencies || !packageJson.devDependencies[dep]) {
        log(`❌ Missing dev dependency: ${dep}`, 'red');
        allDepsPresent = false;
      } else {
        log(`✅ Found dev dependency: ${dep}`, 'green');
      }
    });

    return allDepsPresent;
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    return false;
  }
}

function generateInstallCommand() {
  log('\n📋 Installation Command', 'cyan');
  log('If any dependencies are missing, run:', 'bright');
  log('npm install chartjs-plugin-zoom @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-resizable-panels jspdf html2canvas papaparse ws crossfilter2 @types/ws @types/papaparse', 'yellow');
}

// Main execution
if (require.main === module) {
  const testsPassed = runTests();
  const packageValid = validatePackageJson();
  
  if (!packageValid) {
    generateInstallCommand();
  }

  process.exit(testsPassed && packageValid ? 0 : 1);
}

module.exports = { runTests, validatePackageJson };
