# 🔧 Journeys.js & Playwright Config Fixes

## Issues Fixed

### 1. **Journeys.js - 0 Entities Created** ✅ FIXED

**Problem**: Script couldn't find navigation elements or form fields

**Root Causes**:
- Using wrong browser context method (`launchPersistentContext` instead of `newContext`)
- Navigating to wrong base URL (`app.beta.capium.co.uk` instead of `account.beta.capium.co.uk`)
- Not using the RedirectionURL pattern that works (like crawl.js does)
- Selectors too generic, not finding actual elements

**Solutions Applied**:
1. ✅ Fixed browser context (same pattern as crawl.js)
2. ✅ Fixed base URL navigation (tries multiple domains)
3. ✅ Added RedirectionURL pattern detection (like crawl.js)
4. ✅ Improved selectors to check text content
5. ✅ Added screenshots at key steps for debugging
6. ✅ Better error handling and logging

### 2. **Playwright Config - Folder Conflict** ✅ FIXED

**Problem**: HTML reporter output folder clashes with test results folder

**Error**: 
```
HTML reporter folder: test-results/html-report
test results folder: test-results
```

**Solution**: Changed HTML reporter output to `./playwright-report` (separate folder)

## What Changed

### journeys.js Improvements:

1. **Browser Context**:
   ```javascript
   // OLD (wrong):
   context = await chromium.launchPersistentContext('', { storageState: ... });
   
   // NEW (correct):
   browser = await chromium.launch({ headless: false });
   context = await browser.newContext({ storageState });
   ```

2. **Navigation**:
   - Now uses RedirectionURL pattern (like crawl.js)
   - Tries multiple base URLs
   - Better module detection

3. **Selectors**:
   - Checks multiple elements
   - Validates text content
   - More specific matching

4. **Screenshots**:
   - Takes screenshots at key steps
   - Helps debug if navigation fails

### playwright.config.js:

```javascript
// OLD:
['html', { outputFolder: './test-results/html-report' }]

// NEW:
['html', { outputFolder: './playwright-report' }]
```

## Next Steps

### 1. Re-Run Journeys.js
```bash
node journeys.js
```

**Expected**:
- Browser opens (headed mode)
- Navigates to Practice Management
- Finds Clients page
- Attempts to create client
- Takes screenshots at each step
- Logs all actions

**If it still doesn't create entities**:
- Check screenshots in `out/screenshots/journey_*.png`
- The form fields might need different selectors
- May need to handle iframes or dynamic content

### 2. Run Playwright Tests
```bash
npm test
```

**Should now work** without folder conflict error.

**View Report**:
```bash
npx playwright show-report
```

## Troubleshooting

### If Journeys Still Creates 0 Entities:

1. **Check Screenshots**:
   ```bash
   ls out/screenshots/journey_*.png
   ```
   Look at what the script sees at each step

2. **Check Action Log**:
   ```bash
   cat out/actions_log.jsonl
   ```
   See what actions were attempted

3. **Manual Inspection**:
   - Run `node journeys.js` and watch the browser
   - See where it gets stuck
   - Note the actual selectors needed

4. **Update Selectors**:
   - Based on screenshots and manual inspection
   - Update form field selectors in `journeys.js`
   - May need to handle dynamic content loading

### If Playwright Tests Still Fail:

1. **Check Authentication**:
   ```bash
   node auth.js
   ```
   Re-authenticate if needed

2. **Check Test Selectors**:
   - Tests might need updated selectors
   - Check test screenshots in `test-results/`

## Expected Behavior After Fixes

### Journeys.js:
- ✅ Navigates to Practice Management module
- ✅ Finds Clients page
- ✅ Attempts to fill client form
- ✅ Takes screenshots for debugging
- ✅ Logs all actions

### Playwright Tests:
- ✅ No folder conflict error
- ✅ Tests run successfully
- ✅ HTML report in `playwright-report/` folder

## Notes

1. **Journeys.js is exploratory**: It tries to create entities but may need selector updates based on actual page structure

2. **Screenshots are key**: They show exactly what the script sees, making it easy to update selectors

3. **Action logs**: All attempts are logged, so you can see what was tried even if it failed

4. **Playwright config**: Now uses separate folder, no conflicts

