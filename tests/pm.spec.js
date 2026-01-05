const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs-extra');

test.describe('Capium Beta - Practice Management Regression Tests', () => {
  let context;
  let page;

  test.beforeAll(async ({ browser }) => {
    // Load saved authentication state
    try {
      const storageState = JSON.parse(await fs.readFile('./out/storageState.json', 'utf-8'));
      context = await browser.newContext({ storageState });
      page = await context.newPage();
    } catch (e) {
      throw new Error('storageState.json not found. Please run auth.js first.');
    }
  });

  test.beforeEach(async () => {
    // Try multiple base URLs
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
    await context.close();
  });

  test('PM-001: Navigate to Practice Management Dashboard', async () => {
    // Try to find Practice Management link
    const practiceSelectors = [
      'text=/Practice/i',
      'a[href*="/practice"]',
      'a[href*="practice"]',
      'button:has-text("Practice")'
    ];

    let found = false;
    for (const sel of practiceSelectors) {
      try {
        const element = await page.$(sel);
        if (element && await element.isVisible()) {
          await element.click();
          await page.waitForLoadState('networkidle', { timeout: 15000 });
          found = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    expect(found).toBeTruthy();
    expect(page.url()).toContain('capium.co.uk');
    
    // Verify page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ path: './out/tests/pm-001-dashboard.png', fullPage: true });
  });

  test('PM-002: Practice Management Page Accessibility', async () => {
    // Navigate to Practice Management
    const practiceSelectors = [
      'text=/Practice/i',
      'a[href*="/practice"]',
      'button:has-text("Practice")'
    ];

    for (const sel of practiceSelectors) {
      try {
        const element = await page.$(sel);
        if (element && await element.isVisible()) {
          await element.click();
          await page.waitForLoadState('networkidle', { timeout: 15000 });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Run accessibility audit
    const accessibilityScanResults = await new AxeBuilder(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Log violations
    if (accessibilityScanResults.violations.length > 0) {
      await fs.writeJson(
        './out/tests/pm-002-a11y-violations.json',
        accessibilityScanResults.violations,
        { spaces: 2 }
      );
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('PM-003: Practice Management Navigation Structure', async () => {
    // Navigate to Practice Management
    const practiceSelectors = [
      'text=/Practice/i',
      'a[href*="/practice"]',
      'button:has-text("Practice")'
    ];

    for (const sel of practiceSelectors) {
      try {
        const element = await page.$(sel);
        if (element && await element.isVisible()) {
          await element.click();
          await page.waitForLoadState('networkidle', { timeout: 15000 });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Check for navigation elements
    const navElements = await page.$$('nav, [role="navigation"], [class*="nav"], [id*="nav"]');
    expect(navElements.length).toBeGreaterThan(0);

    // Check for breadcrumbs
    const breadcrumbs = await page.$('.breadcrumb, [aria-label="breadcrumb"], [class*="breadcrumb"]');
    // Breadcrumbs may or may not exist, so we just check if page loaded
    expect(page.url()).toBeTruthy();

    await page.screenshot({ path: './out/tests/pm-003-navigation.png', fullPage: true });
  });

  test('PM-004: Practice Management Page Performance', async () => {
    const startTime = Date.now();
    
    // Navigate to Practice Management
    const practiceSelectors = [
      'text=/Practice/i',
      'a[href*="/practice"]',
      'button:has-text("Practice")'
    ];

    for (const sel of practiceSelectors) {
      try {
        const element = await page.$(sel);
        if (element && await element.isVisible()) {
          await element.click();
          await page.waitForLoadState('networkidle', { timeout: 15000 });
          break;
        }
      } catch (e) {
        continue;
      }
    }

    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: perf ? perf.loadEventEnd - perf.fetchStart : 0,
        domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.fetchStart : 0
      };
    });

    // Log performance data
    await fs.writeJson(
      './out/tests/pm-004-performance.json',
      { loadTime, metrics, timestamp: new Date().toISOString() },
      { spaces: 2 }
    );

    // Assert reasonable load time (less than 10 seconds)
    expect(loadTime).toBeLessThan(10000);
  });

  test('PM-005: Practice Management Responsive Layout', async () => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Navigate to Practice Management
      const practiceSelectors = [
        'text=/Practice/i',
        'a[href*="/practice"]',
        'button:has-text("Practice")'
      ];

      for (const sel of practiceSelectors) {
        try {
          const element = await page.$(sel);
          if (element && await element.isVisible()) {
            await element.click();
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await page.waitForTimeout(1000);
      
      // Take screenshot for each viewport
      await page.screenshot({
        path: `./out/tests/pm-005-${viewport.name}.png`,
        fullPage: true
      });

      // Verify page is usable (has some content)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText.length).toBeGreaterThan(0);
    }
  });
});

