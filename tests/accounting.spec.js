const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs-extra');

test.describe('Capium Beta - Accounting Module Regression Tests', () => {
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

  test('ACC-001: Navigate to Accounting Dashboard', async () => {
    // Try to find Accounting link
    const accountingSelectors = [
      'text=/Accounting/i',
      'a[href*="/accounting"]',
      'a[href*="accounting"]',
      'button:has-text("Accounting")'
    ];

    let found = false;
    for (const sel of accountingSelectors) {
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
    await page.screenshot({ path: './out/tests/acc-001-dashboard.png', fullPage: true });
  });

  test('ACC-002: Accounting Page Accessibility', async () => {
    // Navigate to Accounting
    const accountingSelectors = [
      'text=/Accounting/i',
      'a[href*="/accounting"]',
      'button:has-text("Accounting")'
    ];

    for (const sel of accountingSelectors) {
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
        './out/tests/acc-002-a11y-violations.json',
        accessibilityScanResults.violations,
        { spaces: 2 }
      );
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ACC-003: Accounting Navigation and Breadcrumbs', async () => {
    // Navigate to Accounting
    const accountingSelectors = [
      'text=/Accounting/i',
      'a[href*="/accounting"]',
      'button:has-text("Accounting")'
    ];

    for (const sel of accountingSelectors) {
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
    const navElements = await page.$$('nav, [role="navigation"], [class*="nav"]');
    expect(navElements.length).toBeGreaterThan(0);

    // Verify page has content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    await page.screenshot({ path: './out/tests/acc-003-navigation.png', fullPage: true });
  });

  test('ACC-004: Accounting Page Performance', async () => {
    const startTime = Date.now();
    
    // Navigate to Accounting
    const accountingSelectors = [
      'text=/Accounting/i',
      'a[href*="/accounting"]',
      'button:has-text("Accounting")'
    ];

    for (const sel of accountingSelectors) {
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
      './out/tests/acc-004-performance.json',
      { loadTime, metrics, timestamp: new Date().toISOString() },
      { spaces: 2 }
    );

    // Assert reasonable load time
    expect(loadTime).toBeLessThan(10000);
  });
});

