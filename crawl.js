const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs-extra');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

(async () => {
  // Load saved authentication state
  let browser;
  let context;
  try {
    const storageState = require('./out/storageState.json');
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ storageState });
  } catch (e) {
    console.log('⚠️ storageState.json not found. Please run auth.js first.');
    console.error('Error:', e.message);
    process.exit(1);
  }
  
  const page = await context.newPage();

  // Global trackers
  const inventory = []; // {url, title, breadcrumb, module, timestamp}
  const issues = []; // {severity, desc, steps, screenshot}
  const perfData = []; // {url, loadTime, reqCount, totalBytes}
  const a11yViolations = [];
  const visitedUrls = new Set();

  // Helper: Record page
  const recordPage = async (module, breadcrumb = '') => {
    const url = page.url();
    
    // Skip if already visited
    if (visitedUrls.has(url)) {
      return;
    }
    visitedUrls.add(url);
    
    try {
      const title = await page.title();
      const timestamp = new Date().toISOString();
      
      inventory.push({url, title, breadcrumb, module, timestamp});
      
      // Screenshot
      const slug = url.replace(/[^a-z0-9]/gi, '_').slice(-100).substring(0, 100);
      const screenshotPath = `./out/screenshots/${slug}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // A11y audit
      try {
        // Wait a bit for page to be fully ready
        await page.waitForTimeout(500);
        const axeResults = await new AxeBuilder({ page }).analyze();
        if (axeResults && axeResults.violations) {
          a11yViolations.push(...axeResults.violations.map(v => ({
            ...v,
            url,
            title,
            module,
            timestamp
          })));
        }
      } catch (axeError) {
        console.log(`⚠️ A11y audit failed for ${url}: ${axeError.message}`);
      }
      
      // Performance metrics
      try {
        const metrics = await page.evaluate(() => {
          const perf = performance.getEntriesByType('navigation')[0];
          if (perf) {
            return {
              loadTime: perf.loadEventEnd - perf.fetchStart,
              domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
              firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
              firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
            };
          }
          return null;
        });
        
        if (metrics) {
          perfData.push({
            url,
            title,
            module,
            ...metrics,
            timestamp
          });
        }
      } catch (perfError) {
        console.log(`⚠️ Performance metrics failed for ${url}: ${perfError.message}`);
      }
      
      console.log(`📍 ${module}: ${title} (${url})`);
    } catch (error) {
      console.error(`❌ Error recording page ${url}:`, error.message);
    }
  };

  try {
    console.log('🚀 Starting crawl...');
    console.log('📡 Navigating to dashboard...');
    // Try both domains - the actual domain might be account.beta.capium.co.uk
    const baseUrls = [
      'https://account.beta.capium.co.uk/home',
      'https://app.beta.capium.co.uk/',
      'https://account.beta.capium.co.uk/'
    ];
    
    let navigated = false;
    for (const baseUrl of baseUrls) {
      try {
        await page.goto(baseUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        await page.waitForTimeout(2000);
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
    
    await page.waitForTimeout(1000); // Give page time to fully load
    
    // Check if we're still on login page (auth might have expired)
    const currentUrl = page.url();
    const pageTitle = await page.title();
    const pageText = await page.textContent('body');
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📍 Page Title: ${pageTitle}`);
    
    // Take screenshot to see what we're looking at
    await page.screenshot({ path: './out/screenshots/initial_page.png', fullPage: true });
    console.log('📸 Screenshot saved: ./out/screenshots/initial_page.png');
    
    // Check if we're on login page
    if (currentUrl.includes('sign-in') || pageText.includes('Sign in') || pageText.includes('Login')) {
      console.log('⚠️ Still on login page. Authentication may have expired.');
      console.log('💡 Please run auth.js again to refresh the session.');
      await recordPage('Login Page', 'Authentication Required');
    } else {
      await recordPage('Dashboard', 'Home');
      
      // Try to discover navigation structure
      console.log('\n🔍 Analyzing page structure...');
      const allLinks = await page.$$eval('a, button, [role="link"], [role="button"]', elements => 
        elements.map(el => ({
          text: el.textContent?.trim() || '',
          href: el.href || el.getAttribute('href') || '',
          tag: el.tagName,
          id: el.id || '',
          class: el.className || '',
          visible: el.offsetParent !== null
        })).filter(el => el.visible && (el.text.length > 0 || el.href.length > 0))
      );
      
      console.log(`   Found ${allLinks.length} interactive elements`);
      
      // Log first 20 links for debugging
      console.log('\n📋 Sample navigation elements:');
      allLinks.slice(0, 20).forEach((link, idx) => {
        console.log(`   ${idx + 1}. [${link.tag}] "${link.text.substring(0, 50)}" - ${link.href || 'no href'}`);
      });
    }
    
    // DISCOVER + CRAWL (menu-driven; adjust selectors post-observation)
    // Based on actual structure: RedirectionURL with moduleid parameters
    const modules = [
      {
        name: 'Practice Management',
        selectors: [
          'a[href*="RedirectionURL"]:has-text("Practice")',
          'a[href*="RedirectionURL"]:has-text("practice")',
          'text=/Practice/i',
          'a[href*="/practice"]',
          'a[href*="practice"]',
          '[id*="practice"]',
          '[class*="practice"]',
          'nav a:has-text("Practice")',
          'button:has-text("Practice")'
        ],
        // Also try to find by URL pattern - moduleid might indicate Practice Management
        urlPattern: /RedirectionURL.*moduleid/,
        priority: 1
      },
      {
        name: 'Accounting',
        selectors: [
          'a[href*="RedirectionURL"]:has-text("Account")',
          'a[href*="RedirectionURL"]:has-text("Bookkeeping")',
          'a[href*="RedirectionURL"]:has-text("accounting")',
          'text=/Accounting/i',
          'text=/Bookkeeping/i',
          'a[href*="/accounting"]',
          'a[href*="accounting"]',
          '[id*="accounting"]',
          '[class*="accounting"]',
          'nav a:has-text("Accounting")',
          'button:has-text("Accounting")'
        ],
        urlPattern: /RedirectionURL.*moduleid/,
        priority: 2
      },
      {
        name: 'Other',
        selectors: [
          'a[href*="RedirectionURL"]',
          'a[href*="RedirectToApp"]',
          'nav a',
          '.menu-item',
          '[role="menuitem"]',
          '[class*="menu"] a'
        ],
        priority: 3
      }
    ];

    // Sort by priority
    modules.sort((a, b) => a.priority - b.priority);

    // Only proceed if we're not on login page
    const isLoggedIn = !currentUrl.includes('sign-in') && !pageText?.includes('Sign in') && !pageText?.includes('Login');
    
    if (isLoggedIn) {
      // First, try to find modules by analyzing all links with RedirectionURL
      console.log('\n🔍 Analyzing RedirectionURL links for module mapping...');
      const redirectionLinks = await page.$$eval('a[href*="RedirectionURL"]', elements => 
        elements.map(el => ({
          text: el.textContent?.trim() || '',
          href: el.href || el.getAttribute('href') || '',
          id: el.id || '',
          class: el.className || '',
          visible: el.offsetParent !== null,
          moduleid: (el.href || el.getAttribute('href') || '').match(/moduleid=(\d+)/)?.[1]
        })).filter(el => el.visible)
      );
      
      console.log(`   Found ${redirectionLinks.length} RedirectionURL links`);
      
      // Map modules by analyzing link text and moduleid
      const moduleMap = {};
      redirectionLinks.forEach(link => {
        const text = link.text.toLowerCase();
        const moduleid = link.moduleid;
        
        if (text.includes('practice') || text.includes('management')) {
          if (!moduleMap['Practice Management']) moduleMap['Practice Management'] = [];
          moduleMap['Practice Management'].push(link);
        } else if (text.includes('account') || text.includes('bookkeeping') || text.includes('accounting')) {
          if (!moduleMap['Accounting']) moduleMap['Accounting'] = [];
          moduleMap['Accounting'].push(link);
        }
      });
      
      console.log(`   Mapped modules: ${Object.keys(moduleMap).join(', ')}`);
      
      for (const mod of modules) {
        console.log(`\n🔍 Exploring ${mod.name}...`);
        let foundModule = false;
        
        // First try mapped links
        if (moduleMap[mod.name] && moduleMap[mod.name].length > 0) {
          console.log(`  ✓ Found ${moduleMap[mod.name].length} mapped link(s) for ${mod.name}`);
          const linkToUse = moduleMap[mod.name][0]; // Use first mapped link
          
          try {
            console.log(`    🖱️  Navigating to: "${linkToUse.text.substring(0, 50)}" (${linkToUse.href})`);
            await page.goto(linkToUse.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            await page.waitForTimeout(2000);
            
            // Get breadcrumb
            let breadcrumb = '';
            try {
              const breadcrumbEl = await page.$('.breadcrumb, [aria-label="breadcrumb"], [class*="breadcrumb"]');
              if (breadcrumbEl) {
                breadcrumb = await breadcrumbEl.textContent();
              }
            } catch (e) {}
            
            await recordPage(mod.name, breadcrumb || linkToUse.text || '');
            foundModule = true;
            
            // Explore sub-pages within this module
            try {
              // Get all potential navigation links with better text extraction
              const subLinks = await page.$$eval('a[href], button:not([disabled]):not([type="submit"])', elements => 
                elements.map(el => {
                  const href = el.href || el.getAttribute('href') || '';
                  const text = el.getAttribute('aria-label') || 
                              el.getAttribute('title') || 
                              el.textContent?.trim() || 
                              el.querySelector('img')?.alt || 
                              '';
                  return {
                    element: el,
                    href: href,
                    text: text,
                    visible: el.offsetParent !== null,
                    isLink: el.tagName === 'A',
                    isButton: el.tagName === 'BUTTON'
                  };
                }).filter(el => el.visible && (el.href || el.isButton))
              );
              
              // Filter and prioritize links
              const validSubLinks = [];
              for (const linkInfo of subLinks) {
                try {
                  const href = linkInfo.href;
                  if (!href || href === 'javascript:;' || href === '#') continue;
                  
                  // Skip if already visited
                  const fullUrl = href.startsWith('http') ? href : 
                                 href.startsWith('/') ? new URL(href, page.url()).href : null;
                  if (fullUrl && visitedUrls.has(fullUrl)) continue;
                  
                  validSubLinks.push(linkInfo);
                } catch (e) {
                  continue;
                }
              }
              
              const subCount = Math.min(validSubLinks.length, 25); // Increased from 5 to 25
              
              console.log(`    🔍 Found ${validSubLinks.length} valid sub-links, exploring first ${subCount}...`);
              
              // Get actual page elements for clicking
              const subLinkElements = await page.$$('a[href], button:not([disabled]):not([type="submit"])');
              
              for (let j = 0; j < Math.min(subCount, subLinkElements.length); j++) {
                try {
                  const subLink = subLinkElements[j];
                  const subHref = await subLink.getAttribute('href').catch(() => null);
                  const subText = await subLink.evaluate(el => {
                    return el.getAttribute('aria-label') || 
                           el.getAttribute('title') || 
                           el.textContent?.trim() || 
                           el.querySelector('img')?.alt || 
                           '';
                  }).catch(() => '');
                  
                  if (!subHref || subHref === 'javascript:;' || subHref === '#') continue;
                  
                  // Normalize URL for visited tracking (handle SPA routes)
                  let fullSubUrl = subHref.startsWith('http') ? subHref : 
                                   subHref.startsWith('/') ? new URL(subHref, page.url()).href : 
                                   page.url();
                  
                  // Normalize SPA routes (remove hash fragments for comparison)
                  const normalizedUrl = fullSubUrl.split('#')[0]; // Base URL without hash
                  
                  // Check both full URL and normalized URL (for SPA routes)
                  if (visitedUrls.has(fullSubUrl) || visitedUrls.has(normalizedUrl)) {
                    console.log(`      ⏭️  Already visited: "${subText.substring(0, 30)}"`);
                    continue;
                  }
                  
                  // Mark as visited (track both for SPA routes)
                  visitedUrls.add(fullSubUrl);
                  if (fullSubUrl.includes('#')) {
                    visitedUrls.add(normalizedUrl);
                  }
                  
                  const isVisible = await subLink.isVisible().catch(() => false);
                  if (!isVisible) {
                    console.log(`      ⏭️  Skipping invisible link: "${subText.substring(0, 30)}"`);
                    continue;
                  }
                  
                  console.log(`      → Clicking sub-link ${j + 1}/${subCount}: "${subText.substring(0, 40)}"`);
                  
                  // Store current URL to return to
                  const currentModuleUrl = page.url();
                  
                  if (subHref && subHref.startsWith('http')) {
                    await page.goto(subHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
                  } else if (subHref && subHref.startsWith('/')) {
                    const baseUrl = new URL(page.url()).origin;
                    await page.goto(`${baseUrl}${subHref}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                  } else {
                    await subLink.click();
                    await page.waitForTimeout(2000);
                  }
                  
                  // Wait for navigation (handle SPA route changes)
                  await page.waitForTimeout(2000);
                  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                  
                  // Check if URL changed (for SPAs)
                  const newUrl = page.url();
                  if (newUrl !== currentModuleUrl && !visitedUrls.has(newUrl)) {
                    await recordPage(mod.name + '-sub', subText || '');
                    
                    // Try to explore one level deeper (limited to avoid infinite recursion)
                    try {
                      const deepLinks = await page.$$('a[href]:not([href^="#"]):not([href="javascript:;"])');
                      const deepCount = Math.min(deepLinks.length, 3);
                      for (let k = 0; k < deepCount; k++) {
                        try {
                          const deepLink = deepLinks[k];
                          const deepHref = await deepLink.getAttribute('href').catch(() => null);
                          const deepText = (await deepLink.textContent().catch(() => '')).trim();
                          const deepVisible = await deepLink.isVisible().catch(() => false);
                          
                          if (!deepVisible || !deepHref || deepHref === 'javascript:;') continue;
                          
                          const deepFullUrl = deepHref.startsWith('http') ? deepHref : 
                                            deepHref.startsWith('/') ? new URL(deepHref, page.url()).href : null;
                          
                          if (deepFullUrl && !visitedUrls.has(deepFullUrl) && deepVisible) {
                            console.log(`        ↳ Deep link: "${deepText.substring(0, 25)}"`);
                            await deepLink.click();
                            await page.waitForTimeout(1500);
                            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
                            await recordPage(mod.name + '-deep', deepText || '');
                            break; // Only explore one deep link per sub-page
                          }
                        } catch (e) {
                          // Skip deep link
                        }
                      }
                    } catch (e) {
                      // Skip deep exploration
                    }
                  }
                  
                  // Go back to module page
                  await page.goto(currentModuleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                  await page.waitForTimeout(1000);
                  
                } catch (e) {
                  console.log(`      ⚠️  Error with sub-link ${j + 1}: ${e.message}`);
                  // Try to return to module page
                  try {
                    await page.goto(linkToUse.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
                  } catch (e2) {
                    // If can't return, break out of loop
                    break;
                  }
                }
              }
            } catch (e) {
              console.log(`    ⚠️  Error exploring sub-links: ${e.message}`);
            }
            
            // Go back to main dashboard
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(1000);
            
          } catch (e) {
            console.log(`    ⚠️  Error navigating to mapped link: ${e.message}`);
          }
        }
        
        // Fallback to selector-based approach
        if (!foundModule) {
          for (const sel of mod.selectors) {
            try {
              // Use more flexible selector matching
              const elements = await page.$$(sel).catch(() => []);
              if (elements.length > 0) {
                console.log(`  ✓ Found ${elements.length} element(s) with selector: ${sel}`);
                
                for (let i = 0; i < Math.min(elements.length, 3); i++) {
                  try {
                    const element = elements[i];
                    const isVisible = await element.isVisible().catch(() => false);
                    if (!isVisible) {
                      console.log(`    ⏭️  Element ${i} not visible, skipping`);
                      continue;
                    }
                    
                    // Get link href or button action
                    const href = await element.getAttribute('href').catch(() => null);
                    const text = (await element.textContent().catch(() => '')).trim();
                    
                    console.log(`    🖱️  Clicking: "${text.substring(0, 30)}" (href: ${href ? href.substring(0, 50) : 'none'})`);
                    
                    if (href && href.startsWith('http')) {
                      await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    } else if (href && href.startsWith('/')) {
                      await page.goto(`https://account.beta.capium.co.uk${href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    } else if (href && href.includes('RedirectionURL')) {
                      await page.goto(`https://account.beta.capium.co.uk${href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    } else {
                      await element.click();
                      await page.waitForTimeout(2000);
                    }
                    
                    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                    await page.waitForTimeout(1000);
                    
                    // Get breadcrumb
                    let breadcrumb = '';
                    try {
                      const breadcrumbEl = await page.$('.breadcrumb, [aria-label="breadcrumb"], [class*="breadcrumb"]');
                      if (breadcrumbEl) {
                        breadcrumb = await breadcrumbEl.textContent();
                      }
                    } catch (e) {}
                    
                    await recordPage(mod.name, breadcrumb || text || '');
                    foundModule = true;
                  
                    // Go back to main page
                    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await page.waitForTimeout(1000);
                    
                  } catch (e) {
                    console.log(`    ⚠️  Error with element ${i}: ${e.message}`);
                    continue;
                  }
                }
                
                if (foundModule) {
                  break; // Found working selector, move to next module
                }
              }
            } catch (e) {
              // Try next selector
              continue;
            }
          }
        }
        
        if (!foundModule) {
          console.log(`  ⚠️  No navigation elements found for ${mod.name}`);
        }
      }
    } else {
      console.log('\n⚠️  Skipping navigation crawl - authentication required');
    }

    // SAVE OUTPUTS
    await fs.ensureDir('./out');
    
    // Write JSON files
    await fs.writeJson('./out/navigation_inventory.json', inventory, { spaces: 2 });
    await fs.writeJson('./out/a11y_violations.json', a11yViolations, { spaces: 2 });
    await fs.writeJson('./out/perf_data.json', perfData, { spaces: 2 });

    // CSV for inventory - with retry logic for file lock issues
    let csvWritten = false;
    let retries = 3;
    while (!csvWritten && retries > 0) {
      try {
        // Delete existing CSV if it exists to avoid lock issues
        try {
          await fs.remove('./out/navigation_inventory.csv');
        } catch (e) {
          // Ignore if file doesn't exist
        }
        
        const csv = csvWriter({
          path: './out/navigation_inventory.csv',
          header: [
            {id: 'url', title: 'URL'},
            {id: 'title', title: 'Title'},
            {id: 'breadcrumb', title: 'Breadcrumb'},
            {id: 'module', title: 'Module'},
            {id: 'timestamp', title: 'Timestamp'}
          ]
        });
        await csv.writeRecords(inventory);
        csvWritten = true;
      } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EACCES') {
          console.log(`⚠️  CSV file locked, retrying... (${retries} attempts left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
    }
    
    if (!csvWritten) {
      console.log('⚠️  Could not write CSV file (file may be locked). JSON file saved successfully.');
    }

    console.log('\n✅ Crawl complete.');
    console.log(`   📊 Pages discovered: ${inventory.length}`);
    console.log(`   🚨 A11y violations: ${a11yViolations.length}`);
    console.log(`   ⚡ Performance records: ${perfData.length}`);
    console.log('   Check ./out/ for results');

  } catch (error) {
    console.error('❌ Crawl error:', error);
    try {
      await page.screenshot({ path: './out/screenshots/crawl_error.png', fullPage: true });
    } catch (e) {
      console.error('Could not take error screenshot:', e.message);
    }
  } finally {
    try {
      await context.close();
      await browser.close();
      console.log('\n🔒 Browser closed successfully');
    } catch (e) {
      console.log('⚠️  Error closing browser:', e.message);
    }
    process.exit(0); // Explicitly exit to prevent hanging
  }
})();

