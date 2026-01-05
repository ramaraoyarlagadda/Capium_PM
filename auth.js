const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: false }); // Headed first for visual check
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🔐 Navigating to login page...');
    await page.goto('https://app.beta.capium.co.uk/sign-in.aspx?redir=%2f', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(2000); // Give page time to fully render
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="email"], input[name*="email"], input[id*="email"], input[type="text"]', { timeout: 10000 });
    
    // Try multiple selectors for email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name*="email"]',
      'input[id*="email"]',
      'input[type="text"]:first-of-type'
    ];
    
    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        const emailField = await page.$(selector);
        if (emailField) {
          await emailField.fill(process.env.USERNAME || 'jacquelinewilliamson2023@gmail.com');
          emailFilled = true;
          console.log(`✅ Email filled using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!emailFilled) {
      console.log('⚠️ Could not find email field. Taking screenshot...');
      await page.screenshot({ path: './out/screenshots/login_page.png', fullPage: true });
      throw new Error('Email field not found');
    }
    
    // Try multiple selectors for password field
    await page.waitForSelector('input[type="password"], input[name*="password"], input[id*="password"]', { timeout: 5000 });
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="password"]',
      'input[id*="password"]'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const passwordField = await page.$(selector);
        if (passwordField) {
          await passwordField.fill(process.env.PASSWORD || 'Lam@1234');
          passwordFilled = true;
          console.log(`✅ Password filled using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!passwordFilled) {
      throw new Error('Password field not found');
    }
    
    // Try to find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      '[type="submit"]',
      'form button:last-child'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const submitBtn = await page.$(selector);
        if (submitBtn && await submitBtn.isVisible()) {
          await submitBtn.click();
          submitted = true;
          console.log(`✅ Submit clicked using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!submitted) {
      // Try pressing Enter
      await page.keyboard.press('Enter');
      console.log('✅ Pressed Enter to submit');
    }
    
    // Wait for dashboard/app load (adjust selector after observing)
    console.log('⏳ Waiting for dashboard to load...');
    try {
      await page.waitForSelector(
        '[data-testid*="dashboard"], .app-header, nav[role="navigation"], body:has-text("Practice"), body:has-text("Dashboard"), [class*="dashboard"], [id*="dashboard"]',
        { timeout: 30000 }
      );
      console.log('✅ Dashboard loaded successfully');
    } catch (e) {
      // Check if MFA/email code is required
      const mfaIndicators = await page.textContent('body');
      if (mfaIndicators && (mfaIndicators.includes('code') || mfaIndicators.includes('verification') || mfaIndicators.includes('MFA'))) {
        console.log('⚠️ MFA/Email verification detected. Please complete manually and note the selectors.');
        await page.screenshot({ path: './out/screenshots/mfa_page.png', fullPage: true });
        await page.waitForTimeout(60000); // Wait 60 seconds for manual completion
      } else {
        console.log('⚠️ Dashboard selector not found. Taking screenshot...');
        await page.screenshot({ path: './out/screenshots/post_login.png', fullPage: true });
      }
    }
    
    // Save state for future headless runs
    await context.storageState({ path: './out/storageState.json' });
    console.log('✅ Login success. storageState.json saved.');
    
    // Take final screenshot
    await page.screenshot({ path: './out/screenshots/dashboard.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    await page.screenshot({ path: './out/screenshots/auth_error.png', fullPage: true });
    throw error;
  } finally {
    // Keep browser open for 5 seconds to observe
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();

