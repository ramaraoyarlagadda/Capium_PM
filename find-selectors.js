const { chromium } = require('playwright');
const fs = require('fs-extra');

(async () => {
  console.log('🔍 Starting selector discovery...');
  
  const browser = await chromium.launch({ headless: false }); // Headed to see what's happening
  
  try {
    const storageState = require('./out/storageState.json');
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    
    console.log('📡 Navigating to dashboard...');
    // Try both domains
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
    
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📍 Page Title: ${pageTitle}`);
    
    // Take screenshot
    await page.screenshot({ path: './out/screenshots/selector_discovery.png', fullPage: true });
    console.log('📸 Screenshot saved: ./out/screenshots/selector_discovery.png');
    
    // Find all links
    console.log('\n🔗 Finding all links...');
    const links = await page.$$eval('a', elements => 
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href || el.getAttribute('href') || '',
        id: el.id || '',
        class: el.className || '',
        visible: el.offsetParent !== null
      })).filter(el => el.visible && el.text.length > 0)
    );
    
    console.log(`\n📊 Found ${links.length} visible links\n`);
    
    // Find Practice Management related
    console.log('📋 Practice Management related links:');
    const practiceLinks = links.filter(link => 
      link.text.toLowerCase().includes('practice') ||
      link.href.toLowerCase().includes('practice') ||
      link.class.toLowerCase().includes('practice') ||
      link.id.toLowerCase().includes('practice')
    );
    
    if (practiceLinks.length > 0) {
      practiceLinks.forEach((link, idx) => {
        console.log(`\n${idx + 1}. Text: "${link.text}"`);
        console.log(`   Href: ${link.href}`);
        console.log(`   ID: ${link.id || 'none'}`);
        console.log(`   Class: ${link.class || 'none'}`);
        console.log(`   Selector suggestion: a:has-text("${link.text.substring(0, 20)}")`);
      });
    } else {
      console.log('   ⚠️  No Practice Management links found');
    }
    
    // Find Accounting related
    console.log('\n\n💰 Accounting related links:');
    const accountingLinks = links.filter(link => 
      link.text.toLowerCase().includes('accounting') ||
      link.href.toLowerCase().includes('accounting') ||
      link.class.toLowerCase().includes('accounting') ||
      link.id.toLowerCase().includes('accounting')
    );
    
    if (accountingLinks.length > 0) {
      accountingLinks.forEach((link, idx) => {
        console.log(`\n${idx + 1}. Text: "${link.text}"`);
        console.log(`   Href: ${link.href}`);
        console.log(`   ID: ${link.id || 'none'}`);
        console.log(`   Class: ${link.class || 'none'}`);
        console.log(`   Selector suggestion: a:has-text("${link.text.substring(0, 20)}")`);
      });
    } else {
      console.log('   ⚠️  No Accounting links found');
    }
    
    // Find all buttons
    console.log('\n\n🔘 Finding all buttons...');
    const buttons = await page.$$eval('button, [role="button"]', elements => 
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        id: el.id || '',
        class: el.className || '',
        type: el.type || '',
        visible: el.offsetParent !== null
      })).filter(el => el.visible && el.text.length > 0)
    );
    
    console.log(`\n📊 Found ${buttons.length} visible buttons\n`);
    
    // Find navigation-related buttons
    const navButtons = buttons.filter(btn => 
      btn.text.toLowerCase().includes('practice') ||
      btn.text.toLowerCase().includes('accounting') ||
      btn.class.toLowerCase().includes('nav') ||
      btn.id.toLowerCase().includes('nav')
    );
    
    if (navButtons.length > 0) {
      console.log('📋 Navigation-related buttons:');
      navButtons.forEach((btn, idx) => {
        console.log(`\n${idx + 1}. Text: "${btn.text}"`);
        console.log(`   ID: ${btn.id || 'none'}`);
        console.log(`   Class: ${btn.class || 'none'}`);
        console.log(`   Type: ${btn.type || 'button'}`);
      });
    }
    
    // Find navigation containers
    console.log('\n\n🧭 Finding navigation containers...');
    const navContainers = await page.$$eval('nav, [role="navigation"], [class*="nav"], [id*="nav"]', elements => 
      elements.map(el => ({
        tag: el.tagName,
        id: el.id || '',
        class: el.className || '',
        role: el.getAttribute('role') || '',
        children: el.children.length
      }))
    );
    
    if (navContainers.length > 0) {
      console.log(`\n📊 Found ${navContainers.length} navigation containers:\n`);
      navContainers.forEach((nav, idx) => {
        console.log(`${idx + 1}. <${nav.tag}>`);
        console.log(`   ID: ${nav.id || 'none'}`);
        console.log(`   Class: ${nav.class || 'none'}`);
        console.log(`   Role: ${nav.role || 'none'}`);
        console.log(`   Children: ${nav.children}`);
      });
    }
    
    // Save all findings to JSON
    const findings = {
      url: currentUrl,
      title: pageTitle,
      timestamp: new Date().toISOString(),
      links: {
        all: links,
        practice: practiceLinks,
        accounting: accountingLinks
      },
      buttons: {
        all: buttons,
        navigation: navButtons
      },
      navigationContainers: navContainers
    };
    
    await fs.writeJson('./out/selector_findings.json', findings, { spaces: 2 });
    console.log('\n\n✅ Findings saved to: ./out/selector_findings.json');
    console.log('\n⏳ Browser will stay open for 30 seconds for manual inspection...');
    console.log('   Close the browser window or wait for auto-close.\n');
    
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('💡 Please run auth.js first to create storageState.json');
    }
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
})();

