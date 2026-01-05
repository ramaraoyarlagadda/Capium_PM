# 🕷️ Crawl Script Troubleshooting Guide

## Why the Terminal Appears Frozen

The terminal might appear frozen because:
1. **Browser not closing properly** - Fixed by adding explicit `process.exit(0)`
2. **Waiting for network requests** - Changed from `networkidle` to `domcontentloaded`
3. **Authentication expired** - Script now detects and handles this

## What Was Fixed

### 1. Browser Context Issue
**Problem:** Script was using both `chromium.launch()` and `chromium.launchPersistentContext()`, causing conflicts.

**Solution:** Now uses standard browser with storage state:
```javascript
browser = await chromium.launch({ headless: true });
context = await browser.newContext({ storageState });
```

### 2. Authentication Detection
**Problem:** Script didn't check if login was successful before crawling.

**Solution:** Now checks URL and page content to detect if still on login page.

### 3. Navigation Discovery
**Problem:** Selectors weren't finding elements, script failed silently.

**Solution:** 
- Added detailed logging
- Takes screenshot of initial page
- Lists all navigation elements found
- Better error handling

### 4. A11y Audit Error
**Problem:** `Cannot read properties of undefined (reading 'evaluate')`

**Solution:** Fixed AxeBuilder initialization and added error handling.

### 5. Browser Not Closing
**Problem:** Script hung because browser wasn't properly closed.

**Solution:** Added explicit `context.close()`, `browser.close()`, and `process.exit(0)`.

## Next Steps to Make Crawling Work

### Step 1: Verify Authentication
```bash
node auth.js
```

Make sure you see:
```
✅ Login success. storageState.json saved.
```

### Step 2: Check the Screenshot
After running `crawl.js`, check:
```
out/screenshots/initial_page.png
```

This shows what page the script sees. If it's the login page, authentication expired.

### Step 3: Review Navigation Elements
The script now logs all navigation elements it finds:
```
📋 Sample navigation elements:
   1. [A] "Practice Management" - /practice
   2. [A] "Accounting" - /accounting
   ...
```

### Step 4: Update Selectors (If Needed)
If the script doesn't find navigation elements, you can:

1. **Check the screenshot** to see the actual page structure
2. **Inspect the page manually** in a browser
3. **Update selectors in `crawl.js`** based on what you find

Example: If Practice Management link has class `nav-practice`, add:
```javascript
selectors: [
  '.nav-practice',  // Add this
  'text=/Practice/i',
  // ... rest
]
```

### Step 5: Run in Headed Mode (For Debugging)
Temporarily change in `crawl.js`:
```javascript
browser = await chromium.launch({ headless: false }); // See what's happening
```

### Step 6: Manual Selector Discovery
Create a quick script to find selectors:

```javascript
// find-selectors.js
const { chromium } = require('playwright');
const fs = require('fs-extra');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const storageState = require('./out/storageState.json');
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  
  await page.goto('https://app.beta.capium.co.uk/');
  await page.waitForTimeout(3000);
  
  // Find all links
  const links = await page.$$eval('a', elements => 
    elements.map(el => ({
      text: el.textContent.trim(),
      href: el.href,
      id: el.id,
      class: el.className
    }))
  );
  
  console.log('Found links:');
  links.forEach(link => {
    if (link.text.toLowerCase().includes('practice') || 
        link.text.toLowerCase().includes('accounting')) {
      console.log(JSON.stringify(link, null, 2));
    }
  });
  
  await page.waitForTimeout(10000); // Keep open to inspect
  await browser.close();
})();
```

Run: `node find-selectors.js`

## Common Issues & Solutions

### Issue: "Still on login page"
**Solution:** 
- Re-run `node auth.js`
- Check if MFA is required
- Verify credentials in `.env`

### Issue: "No navigation elements found"
**Solution:**
1. Check `out/screenshots/initial_page.png`
2. Run in headed mode to see what's happening
3. Use `find-selectors.js` to discover actual selectors
4. Update selectors in `crawl.js`

### Issue: "A11y audit failed"
**Solution:** This is non-critical. The script continues even if a11y audit fails.

### Issue: "Script hangs/freezes"
**Solution:** 
- The new version explicitly closes browser and exits
- If still hangs, check network connectivity
- Try increasing timeouts

## Expected Output

After fixes, you should see:
```
🚀 Starting crawl...
📡 Navigating to dashboard...
📍 Current URL: https://app.beta.capium.co.uk/dashboard
📍 Page Title: Capium Dashboard
📸 Screenshot saved: ./out/screenshots/initial_page.png

🔍 Analyzing page structure...
   Found 45 interactive elements

📋 Sample navigation elements:
   1. [A] "Practice Management" - /practice
   2. [A] "Accounting" - /accounting
   ...

🔍 Exploring Practice Management...
  ✓ Found 1 element(s) with selector: text=/Practice/i
    🖱️  Clicking: "Practice Management" (href: /practice)
📍 Practice Management: Practice Dashboard (/practice)

✅ Crawl complete.
   📊 Pages discovered: 15
   🚨 A11y violations: 3
   ⚡ Performance records: 15
   Check ./out/ for results

🔒 Browser closed successfully
```

## Quick Test

Run this to verify everything works:
```bash
# 1. Re-authenticate
node auth.js

# 2. Run crawl
node crawl.js

# 3. Check results
ls out/screenshots/
cat out/navigation_inventory.json
```

If you see the login page in screenshots, authentication expired. Re-run `auth.js`.

