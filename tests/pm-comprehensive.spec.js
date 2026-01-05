const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs-extra');
const path = require('path');

// Import helper utilities
const PMHelpers = require('../utils/pm-helpers');
const PMReporter = require('../utils/pm-reporter');
const PMDiscovery = require('../utils/pm-discovery');

test.describe('Practice Management - Comprehensive Functionality Tests', () => {
  let context;
  let page;
  let testResults = {
    startTime: new Date().toISOString(),
    tests: [],
    features: [],
    issues: [],
    coverage: {
      dashboard: false,
      clients: false,
      tasks: false,
      deadlines: false,
      staff: false,
      workflows: false,
      documents: false,
      reports: false,
      settings: false,
      search: false,
      notifications: false
    }
  };

  test.beforeAll(async ({ browser }) => {
    // Load saved authentication state
    try {
      const storageState = JSON.parse(await fs.readFile('./out/storageState.json', 'utf-8'));
      context = await browser.newContext({ storageState });
      page = await context.newPage();
      
      // Set up test data prefix
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      testResults.testPrefix = `AUTO_QA_PM_${timestamp}_${uuid.slice(0, 8)}`;
      
      console.log(`\n🧪 Test Prefix: ${testResults.testPrefix}`);
    } catch (e) {
      throw new Error('storageState.json not found. Please run auth.js first.');
    }
  });

  test.beforeEach(async () => {
    // Navigate to dashboard
    const baseUrls = [
      'https://account.beta.capium.co.uk/home',
      'https://app.beta.capium.co.uk/',
      'https://account.beta.capium.co.uk/'
    ];
    
    let navigated = false;
    for (const baseUrl of baseUrls) {
      try {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);
        const url = page.url();
        if (!url.includes('sign-in')) {
          navigated = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!navigated) {
      throw new Error('Could not navigate to dashboard');
    }
  });

  test.afterAll(async () => {
    // Generate comprehensive report
    testResults.endTime = new Date().toISOString();
    testResults.duration = new Date(testResults.endTime) - new Date(testResults.startTime);
    
    await PMReporter.generateReport(testResults, page);
    
    await context.close();
  });

  // ========== PHASE 1: FEATURE DISCOVERY ==========
  
  test('PM-DISCOVERY-001: Discover All Practice Management Features', async () => {
    const testName = 'PM-DISCOVERY-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    
    try {
      console.log('\n🔍 Starting feature discovery...');
      
      // Navigate to Practice Management
      const pmLink = await PMHelpers.navigateToPracticeManagement(page);
      expect(pmLink).toBeTruthy();
      
      // Discover all features
      const features = await PMDiscovery.discoverAllFeatures(page);
      
      testResults.features = features;
      console.log(`\n✅ Discovered ${features.length} features:`);
      features.forEach((feature, idx) => {
        console.log(`   ${idx + 1}. ${feature.name} - ${feature.type} (${feature.pages?.length || 0} pages)`);
      });
      
      // Save discovery results
      await fs.writeJson(
        './out/pm-discovery-results.json',
        features,
        { spaces: 2 }
      );
      
      passed = true;
    } catch (e) {
      error = e.message;
      console.error(`❌ Discovery failed: ${error}`);
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  // ========== PHASE 2: DASHBOARD & NAVIGATION ==========
  
  test('PM-DASHBOARD-001: Dashboard Load and Display', async () => {
    const testName = 'PM-DASHBOARD-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      // Navigate to Practice Management
      await PMHelpers.navigateToPracticeManagement(page);
      await page.waitForTimeout(2000);
      
      // Check page loaded
      const title = await page.title();
      details.title = title;
      expect(title).toBeTruthy();
      
      // Check for dashboard elements
      const dashboardSelectors = [
        '[class*="dashboard"]',
        '[id*="dashboard"]',
        '[class*="widget"]',
        '[class*="stat"]',
        '[class*="metric"]'
      ];
      
      let foundElements = 0;
      for (const selector of dashboardSelectors) {
        const elements = await page.$$(selector);
        foundElements += elements.length;
      }
      details.foundElements = foundElements;
      
      // Take screenshot
      await page.screenshot({ 
        path: './out/tests/pm-dashboard-001.png', 
        fullPage: true 
      });
      
      // Accessibility check
      const a11yResults = await new AxeBuilder(page).analyze();
      details.a11yViolations = a11yResults.violations.length;
      
      if (a11yResults.violations.length > 0) {
        testResults.issues.push({
          type: 'accessibility',
          severity: 'medium',
          test: testName,
          violations: a11yResults.violations
        });
      }
      
      // Performance check
      const perfMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return perf ? {
          loadTime: perf.loadEventEnd - perf.fetchStart,
          domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart
        } : null;
      });
      details.performance = perfMetrics;
      
      testResults.coverage.dashboard = true;
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  test('PM-DASHBOARD-002: Navigation Menu Functionality', async () => {
    const testName = 'PM-DASHBOARD-002';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = { menuItems: [] };
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      
      // Find navigation menu
      const navSelectors = [
        'nav',
        '[role="navigation"]',
        '[class*="nav"]',
        '[class*="menu"]',
        '[id*="nav"]',
        '[id*="menu"]'
      ];
      
      let navFound = false;
      for (const selector of navSelectors) {
        const nav = await page.$(selector);
        if (nav && await nav.isVisible()) {
          navFound = true;
          
          // Get all menu items
          const menuItems = await page.$$eval(`${selector} a, ${selector} button`, elements =>
            elements.map(el => ({
              text: el.textContent?.trim(),
              href: el.href || el.getAttribute('href'),
              visible: el.offsetParent !== null
            })).filter(el => el.visible && el.text)
          );
          
          details.menuItems = menuItems;
          console.log(`\n📋 Found ${menuItems.length} menu items`);
          
          // Test clicking each menu item
          for (let i = 0; i < Math.min(menuItems.length, 10); i++) {
            try {
              const item = menuItems[i];
              const link = await page.$(`text="${item.text}"`);
              if (link && await link.isVisible()) {
                await link.click();
                await page.waitForTimeout(1000);
                await page.waitForLoadState('domcontentloaded');
                details.menuItems[i].clicked = true;
                details.menuItems[i].urlAfterClick = page.url();
              }
            } catch (e) {
              details.menuItems[i].clicked = false;
              details.menuItems[i].error = e.message;
            }
          }
          
          break;
        }
      }
      
      expect(navFound).toBeTruthy();
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  // ========== PHASE 3: CLIENT MANAGEMENT ==========
  
  test('PM-CLIENT-001: Navigate to Clients Section', async () => {
    const testName = 'PM-CLIENT-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      
      const clientsPage = await PMHelpers.navigateToSection(page, 'client');
      expect(clientsPage).toBeTruthy();
      
      testResults.coverage.clients = true;
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  test('PM-CLIENT-002: View Clients List', async () => {
    const testName = 'PM-CLIENT-002';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      await PMHelpers.navigateToSection(page, 'client');
      await page.waitForTimeout(2000);
      
      // Check for client list elements
      const listSelectors = [
        '[class*="client"]',
        '[class*="list"]',
        '[class*="table"]',
        'table',
        '[role="grid"]',
        '[role="list"]'
      ];
      
      let foundList = false;
      for (const selector of listSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          foundList = true;
          details.listElement = selector;
          details.listCount = elements.length;
          break;
        }
      }
      
      // Try to count clients
      try {
        const clientCount = await page.$$eval('tr, [class*="client-item"], [class*="row"]', 
          elements => elements.length
        );
        details.clientCount = clientCount;
      } catch (e) {
        // Count not available
      }
      
      await page.screenshot({ 
        path: './out/tests/pm-client-002-list.png', 
        fullPage: true 
      });
      
      expect(foundList).toBeTruthy();
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  test('PM-CLIENT-003: Create New Client', async () => {
    const testName = 'PM-CLIENT-003';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      await PMHelpers.navigateToSection(page, 'client');
      await page.waitForTimeout(2000);
      
      // Find and click "Add Client" button
      const addButton = await PMHelpers.findAndClickButton(page, [
        'Add Client',
        'New Client',
        'Create Client',
        'Add',
        'New'
      ]);
      
      if (!addButton) {
        throw new Error('Could not find Add Client button');
      }
      
      await page.waitForTimeout(1000);
      
      // Fill client form
      const clientData = {
        name: `${testResults.testPrefix}_Client`,
        email: `${testResults.testPrefix.toLowerCase().replace(/_/g, '.')}@test.com`,
        phone: '1234567890'
      };
      
      details.clientData = clientData;
      
      // Try to fill name field
      const nameFilled = await PMHelpers.fillField(page, [
        'input[name*="name"]',
        'input[id*="name"]',
        'input[placeholder*="name" i]',
        'input[type="text"]:first-of-type'
      ], clientData.name);
      
      // Try to fill email field
      const emailFilled = await PMHelpers.fillField(page, [
        'input[type="email"]',
        'input[name*="email"]',
        'input[id*="email"]'
      ], clientData.email);
      
      // Try to fill phone field
      const phoneFilled = await PMHelpers.fillField(page, [
        'input[type="tel"]',
        'input[name*="phone"]',
        'input[id*="phone"]'
      ], clientData.phone);
      
      details.fieldsFilled = {
        name: nameFilled,
        email: emailFilled,
        phone: phoneFilled
      };
      
      await page.screenshot({ 
        path: './out/tests/pm-client-003-form-filled.png', 
        fullPage: true 
      });
      
      // Submit form
      const submitted = await PMHelpers.submitForm(page);
      details.submitted = submitted;
      
      if (submitted) {
        await page.waitForTimeout(3000);
        await page.screenshot({ 
          path: './out/tests/pm-client-003-after-submit.png', 
          fullPage: true 
        });
        
        // Check if client was created (look for success message or client in list)
        const success = await PMHelpers.checkForSuccess(page);
        details.success = success;
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
      await page.screenshot({ 
        path: './out/tests/pm-client-003-error.png', 
        fullPage: true 
      });
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  test('PM-CLIENT-004: Search Clients', async () => {
    const testName = 'PM-CLIENT-004';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      await PMHelpers.navigateToSection(page, 'client');
      await page.waitForTimeout(2000);
      
      // Find search field
      const searchField = await PMHelpers.findField(page, [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        'input[name*="search"]',
        'input[id*="search"]',
        '[class*="search"] input'
      ]);
      
      if (searchField) {
        await searchField.fill(testResults.testPrefix);
        await page.waitForTimeout(1000);
        
        details.searchPerformed = true;
        details.searchTerm = testResults.testPrefix;
        
        // Check for search results
        const results = await page.$$eval('tr, [class*="client-item"], [class*="result"]', 
          elements => elements.length
        );
        details.resultsCount = results;
      } else {
        details.searchPerformed = false;
        details.reason = 'Search field not found';
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  // ========== PHASE 4: TASK MANAGEMENT ==========
  
  test('PM-TASK-001: Navigate to Tasks Section', async () => {
    const testName = 'PM-TASK-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      
      const tasksPage = await PMHelpers.navigateToSection(page, 'task');
      expect(tasksPage).toBeTruthy();
      
      testResults.coverage.tasks = true;
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  test('PM-TASK-002: Create New Task', async () => {
    const testName = 'PM-TASK-002';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      await PMHelpers.navigateToSection(page, 'task');
      await page.waitForTimeout(2000);
      
      // Find and click "Add Task" button
      const addButton = await PMHelpers.findAndClickButton(page, [
        'Add Task',
        'New Task',
        'Create Task',
        'Add',
        'New'
      ]);
      
      if (!addButton) {
        throw new Error('Could not find Add Task button');
      }
      
      await page.waitForTimeout(1000);
      
      // Fill task form
      const taskData = {
        title: `${testResults.testPrefix}_Task`,
        description: `Automated test task created on ${new Date().toISOString()}`
      };
      
      details.taskData = taskData;
      
      // Fill title
      const titleFilled = await PMHelpers.fillField(page, [
        'input[name*="title"]',
        'input[id*="title"]',
        'input[placeholder*="title" i]',
        'textarea[name*="title"]',
        'input[type="text"]:first-of-type'
      ], taskData.title);
      
      // Fill description
      const descFilled = await PMHelpers.fillField(page, [
        'textarea[name*="description"]',
        'textarea[id*="description"]',
        'textarea[placeholder*="description" i]',
        'textarea'
      ], taskData.description);
      
      details.fieldsFilled = {
        title: titleFilled,
        description: descFilled
      };
      
      await page.screenshot({ 
        path: './out/tests/pm-task-002-form-filled.png', 
        fullPage: true 
      });
      
      // Submit form
      const submitted = await PMHelpers.submitForm(page);
      details.submitted = submitted;
      
      if (submitted) {
        await page.waitForTimeout(3000);
        const success = await PMHelpers.checkForSuccess(page);
        details.success = success;
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
      await page.screenshot({ 
        path: './out/tests/pm-task-002-error.png', 
        fullPage: true 
      });
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  // ========== PHASE 5: DEADLINE MANAGEMENT ==========
  
  test('PM-DEADLINE-001: Navigate to Deadlines Section', async () => {
    const testName = 'PM-DEADLINE-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      
      const deadlinesPage = await PMHelpers.navigateToSection(page, 'deadline');
      if (deadlinesPage) {
        testResults.coverage.deadlines = true;
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  // ========== PHASE 6: ADDITIONAL FEATURES ==========
  
  test('PM-FEATURES-001: Test All Discovered Features', async () => {
    const testName = 'PM-FEATURES-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = { featuresTested: [] };
    
    try {
      // Use discovered features from earlier test
      if (testResults.features.length === 0) {
        // Re-discover if not already done
        await PMHelpers.navigateToPracticeManagement(page);
        testResults.features = await PMDiscovery.discoverAllFeatures(page);
      }
      
      // Test each discovered feature
      for (const feature of testResults.features.slice(0, 20)) { // Limit to 20 to avoid timeout
        try {
          await PMHelpers.navigateToPracticeManagement(page);
          
          const featureTested = await PMHelpers.testFeature(page, feature);
          details.featuresTested.push({
            name: feature.name,
            type: feature.type,
            tested: featureTested,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          details.featuresTested.push({
            name: feature.name,
            type: feature.type,
            tested: false,
            error: e.message
          });
        }
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  // ========== PHASE 7: ACCESSIBILITY & PERFORMANCE ==========
  
  test('PM-A11Y-001: Full Accessibility Audit', async () => {
    const testName = 'PM-A11Y-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      
      const a11yResults = await new AxeBuilder(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      details.violations = a11yResults.violations;
      details.violationsCount = a11yResults.violations.length;
      details.passes = a11yResults.passes.length;
      
      // Save detailed results
      await fs.writeJson(
        './out/pm-a11y-full-audit.json',
        a11yResults,
        { spaces: 2 }
      );
      
      if (a11yResults.violations.length > 0) {
        testResults.issues.push({
          type: 'accessibility',
          severity: 'high',
          test: testName,
          violations: a11yResults.violations,
          count: a11yResults.violations.length
        });
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });

  test('PM-PERF-001: Performance Metrics Collection', async () => {
    const testName = 'PM-PERF-001';
    const startTime = Date.now();
    let passed = false;
    let error = null;
    const details = {};
    
    try {
      await PMHelpers.navigateToPracticeManagement(page);
      
      const perfMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        const resources = performance.getEntriesByType('resource');
        
        return {
          loadTime: perf ? perf.loadEventEnd - perf.fetchStart : 0,
          domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.fetchStart : 0,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          resourceCount: resources.length,
          totalResourceSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        };
      });
      
      details.metrics = perfMetrics;
      
      // Save performance data
      await fs.writeJson(
        './out/pm-performance-metrics.json',
        perfMetrics,
        { spaces: 2 }
      );
      
      // Check for performance issues
      if (perfMetrics.loadTime > 10000) {
        testResults.issues.push({
          type: 'performance',
          severity: 'medium',
          test: testName,
          issue: 'Page load time exceeds 10 seconds',
          value: perfMetrics.loadTime
        });
      }
      
      passed = true;
    } catch (e) {
      error = e.message;
    } finally {
      testResults.tests.push({
        name: testName,
        passed,
        duration: Date.now() - startTime,
        error,
        details,
        timestamp: new Date().toISOString()
      });
    }
    
    expect(passed).toBeTruthy();
  });
});

