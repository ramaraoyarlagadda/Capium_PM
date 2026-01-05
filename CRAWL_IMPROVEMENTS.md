# 🚀 Crawl Script Improvements

## What Was Fixed

Based on the actual navigation structure discovered, the crawl script has been updated to handle:

### 1. **RedirectionURL Pattern**
The site uses `RedirectionURL` with `moduleid` parameters instead of direct links:
- `https://account.beta.capium.co.uk/Home/RedirectionURL?moduleid=2&username=...`
- `https://account.beta.capium.co.uk/Home/RedirectionURL?moduleid=1&username=...`

### 2. **Module Mapping**
The script now:
- Analyzes all `RedirectionURL` links
- Maps modules by analyzing link text (Practice, Accounting, Bookkeeping)
- Uses mapped links first before falling back to selectors

### 3. **Base URL Handling**
Updated to handle the actual domain:
- `account.beta.capium.co.uk` (actual domain)
- `app.beta.capium.co.uk` (fallback)

### 4. **Better Link Discovery**
- Handles links with empty text but valid hrefs
- Properly constructs full URLs from relative paths
- Better visibility checking

## How It Works Now

1. **Initial Navigation**
   - Tries multiple base URLs
   - Takes screenshot of initial page
   - Analyzes page structure

2. **Module Discovery**
   - Finds all `RedirectionURL` links
   - Maps them to modules by text content
   - Creates a module map for efficient navigation

3. **Module Exploration**
   - Uses mapped links first (more reliable)
   - Falls back to selector-based approach
   - Explores sub-pages within each module
   - Records all discovered pages

4. **Sub-Page Crawling**
   - Finds sub-links within each module
   - Limits to 5 sub-pages per module to avoid infinite loops
   - Properly navigates back to module page

## Expected Behavior

When you run `node crawl.js`, you should now see:

```
🚀 Starting crawl...
📡 Navigating to dashboard...
📍 Current URL: https://account.beta.capium.co.uk/home
📍 Page Title: [Title]
📸 Screenshot saved: ./out/screenshots/initial_page.png

🔍 Analyzing page structure...
   Found 77 interactive elements

🔍 Analyzing RedirectionURL links for module mapping...
   Found 20 RedirectionURL links
   Mapped modules: Practice Management, Accounting

🔍 Exploring Practice Management...
  ✓ Found 3 mapped link(s) for Practice Management
    🖱️  Navigating to: "Practice Management" (https://account.beta.capium.co.uk/Home/RedirectionURL?...)
📍 Practice Management: [Page Title] (/practice)

    🔍 Found 15 sub-links, exploring first 5...
      → Clicking sub-link: "Clients"
📍 Practice Management-sub: Clients

🔍 Exploring Accounting...
  ✓ Found 2 mapped link(s) for Accounting
    🖱️  Navigating to: "Bookkeeping" (https://account.beta.capium.co.uk/Home/RedirectionURL?...)
📍 Accounting: [Page Title] (/accounting)

✅ Crawl complete.
   📊 Pages discovered: 12
   🚨 A11y violations: 5
   ⚡ Performance records: 12
   Check ./out/ for results

🔒 Browser closed successfully
```

## Next Steps

1. **Run the improved crawl:**
   ```bash
   node crawl.js
   ```

2. **Check the results:**
   ```bash
   # View navigation inventory
   cat out/navigation_inventory.json
   
   # View CSV
   cat out/navigation_inventory.csv
   
   # Check screenshots
   ls out/screenshots/
   ```

3. **If modules still not found:**
   - Check `out/screenshots/initial_page.png` to see what the script sees
   - Run `node find-selectors.js` to discover actual selectors
   - Update module mapping logic in `crawl.js` if needed

## Troubleshooting

### Issue: "No mapped links found"
**Solution:** The link text might not contain "practice" or "accounting". Check the screenshot and update the mapping logic in `crawl.js` around line 200.

### Issue: "Module not found"
**Solution:** 
1. Check what text the links actually have
2. Update the mapping keywords in the `moduleMap` creation logic
3. Or manually add selectors based on `find-selectors.js` output

### Issue: "Sub-links not working"
**Solution:** The sub-link exploration is limited to avoid infinite loops. If you need more depth, increase the `subCount` limit in the code.

## Customization

To customize which modules are discovered, edit the `modules` array in `crawl.js`:

```javascript
const modules = [
  {
    name: 'Practice Management',
    // Add more selectors here
    selectors: [
      'a[href*="RedirectionURL"]:has-text("Practice")',
      // ... your custom selectors
    ],
    priority: 1
  },
  // ... more modules
];
```

To customize module mapping, edit the mapping logic around line 200:

```javascript
if (text.includes('practice') || text.includes('management')) {
  // Your custom logic
}
```

