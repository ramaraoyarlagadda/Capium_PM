# 📚 Code Understanding: Module Connections & Information Retrieval

## 🎯 Overview

This codebase is a comprehensive audit and testing system for Capium Beta that:
1. **Discovers and maps modules** (Practice Management, Accounting, etc.)
2. **Crawls all accessible pages** within each module
3. **Collects information** about pages, connections, accessibility, and performance
4. **Tests user journeys** by creating entities across modules
5. **Generates reports** on issues and findings

## 🏗️ Architecture

### Main Files

1. **`crawl.js`** - Main crawling script that discovers and explores modules
2. **`journeys.js`** - User journey testing that creates test entities
3. **`auth.js`** - Authentication handler (saves session state)
4. **`generate-report.js`** - Report generator for UI/UX issues
5. **`tests/pm.spec.js`** - Playwright regression tests for Practice Management

---

## 🔍 How Module Discovery Works

### Step 1: Initial Navigation
```javascript
// Navigate to dashboard
await page.goto('https://account.beta.capium.co.uk/home');
```

### Step 2: Find Module Links
The code searches for links with the `RedirectionURL` pattern that contain `moduleid` parameters:

```javascript
const redirectionLinks = await page.$$eval('a[href*="RedirectionURL"]', elements => 
  elements.map(el => ({
    text: el.textContent?.trim() || '',
    href: el.href || el.getAttribute('href') || '',
    visible: el.offsetParent !== null,
    moduleid: (el.href || el.getAttribute('href') || '').match(/moduleid=(\d+)/)?.[1]
  })).filter(el => el.visible)
);
```

### Step 3: Map Modules
Modules are identified by analyzing link text and `moduleid`:

```javascript
const moduleMap = {};
redirectionLinks.forEach(link => {
  const text = link.text.toLowerCase();
  const moduleid = link.moduleid;
  
  if (text.includes('practice') || text.includes('management')) {
    if (!moduleMap['Practice Management']) moduleMap['Practice Management'] = [];
    moduleMap['Practice Management'].push(link);
  } else if (text.includes('account') || text.includes('bookkeeping')) {
    if (!moduleMap['Accounting']) moduleMap['Accounting'] = [];
    moduleMap['Accounting'].push(link);
  }
});
```

**Key Finding**: 
- **Practice Management** has `moduleid=7`
- **Accounting** has `moduleid=2`

---

## 🔗 How Connections Between Modules Are Discovered

### 1. **Module-to-Module Navigation**

The code maintains a `moduleMap` that stores all links for each module:

```javascript
moduleMap = {
  'Practice Management': [
    { text: 'Practice Management', href: '...?moduleid=7', moduleid: '7' },
    // ... more links
  ],
  'Accounting': [
    { text: 'Accounting', href: '...?moduleid=2', moduleid: '2' },
    // ... more links
  ]
}
```

### 2. **Sub-Link Discovery Within Modules**

Once inside a module (e.g., Practice Management), the code finds all sub-links:

```javascript
// Get all potential navigation links
const subLinks = await page.$$eval('a[href], button:not([disabled])', elements => 
  elements.map(el => ({
    href: el.href || el.getAttribute('href') || '',
    text: el.getAttribute('aria-label') || 
          el.getAttribute('title') || 
          el.textContent?.trim() || '',
    visible: el.offsetParent !== null
  })).filter(el => el.visible && el.href)
);
```

### 3. **Deep Link Exploration**

The code explores up to 3 levels deep:
- **Level 1**: Main module page (e.g., Practice Management Dashboard)
- **Level 2**: Sub-pages (e.g., Clients, Tasks)
- **Level 3**: Deep pages (e.g., Individual Client Details)

```javascript
// Explore sub-pages
await recordPage(mod.name + '-sub', subText);

// Try to explore one level deeper
const deepLinks = await page.$$('a[href]:not([href^="#"]):not([href="javascript:;"])');
for (let k = 0; k < Math.min(deepLinks.length, 3); k++) {
  await recordPage(mod.name + '-deep', deepText);
}
```

---

## 📊 How Information Is Collected

### 1. **Page Recording Function**

Every discovered page is recorded with comprehensive information:

```javascript
const recordPage = async (module, breadcrumb = '') => {
  const url = page.url();
  const title = await page.title();
  const timestamp = new Date().toISOString();
  
  // Store in inventory
  inventory.push({url, title, breadcrumb, module, timestamp});
  
  // Take screenshot
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  // Run accessibility audit
  const axeResults = await new AxeBuilder({ page }).analyze();
  a11yViolations.push(...axeResults.violations.map(v => ({
    ...v, url, title, module, timestamp
  })));
  
  // Collect performance metrics
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: perf.loadEventEnd - perf.fetchStart,
      domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
      firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime
    };
  });
  perfData.push({url, title, module, ...metrics, timestamp});
};
```

### 2. **Data Structures**

All information is stored in these arrays:

- **`inventory`**: `[{url, title, breadcrumb, module, timestamp}]`
- **`a11yViolations`**: `[{id, impact, description, nodes, url, module, timestamp}]`
- **`perfData`**: `[{url, loadTime, domContentLoaded, firstPaint, module, timestamp}]`
- **`visitedUrls`**: `Set<string>` - Prevents duplicate visits

### 3. **Output Files**

Information is saved to:

- **`out/navigation_inventory.json`** - All discovered pages
- **`out/navigation_inventory.csv`** - Same data in CSV format
- **`out/a11y_violations.json`** - Accessibility issues
- **`out/perf_data.json`** - Performance metrics
- **`out/screenshots/*.png`** - Full-page screenshots

---

## 🔄 Practice Management Specific Flow

### Navigation to Practice Management

```javascript
// 1. Find Practice Management link
const practiceLink = redirectionLinks.find(link => 
  link.text.toLowerCase().includes('practice') || 
  link.text.toLowerCase().includes('management')
);

// 2. Navigate to it
await page.goto(practiceLink.href, { waitUntil: 'domcontentloaded' });

// 3. Record the main page
await recordPage('Practice Management', 'Practice Management Dashboard');
```

### Exploring Practice Management Sub-Pages

```javascript
// Find all sub-links (e.g., Clients, Tasks, Deadlines)
const subLinks = await page.$$eval('a[href], button', elements => 
  elements.map(el => ({
    text: el.textContent?.trim(),
    href: el.href
  }))
);

// Explore up to 25 sub-links
const subCount = Math.min(validSubLinks.length, 25);
for (let j = 0; j < subCount; j++) {
  await subLink.click();
  await recordPage('Practice Management-sub', subText);
  
  // Explore one level deeper
  const deepLinks = await page.$$('a[href]');
  // ... explore deep links
}
```

### Current Discovery Status

From `CRAWL_ANALYSIS.md`:
- **Practice Management**: Found **77 sub-links**, exploring **25** of them
- **Accounting**: Found **36 sub-links**, exploring **25** of them

---

## 🧪 User Journey Testing (journeys.js)

### How Journeys Connect Modules

The `journeys.js` script tests cross-module workflows:

```javascript
// 1. Navigate to Practice Management
const practiceLink = redirectionLinks.find(link => 
  link.text.toLowerCase().includes('practice')
);
await page.goto(practiceLink.href);

// 2. Create a Client in Practice Management
// Navigate to Clients section
await page.click('text=/Client/i');
// Fill form and create client
await logAction('CREATE_CLIENT', { clientName: 'AUTO_QA_20260105_...' });

// 3. Navigate to Accounting
const accountingLink = redirectionLinks.find(link => 
  link.text.toLowerCase().includes('account')
);
await page.goto(accountingLink.href);

// 4. Create Invoice (potentially linked to the client)
await logAction('CREATE_INVOICE', { invoiceNumber: 'AUTO_QA_20260105_...' });
```

### Action Logging

All actions are logged with context:

```javascript
const logAction = async (action, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,  // e.g., 'NAVIGATE', 'CREATE_CLIENT', 'CREATE_TASK'
    url: page.url(),
    ...details
  };
  actionsLog.push(logEntry);
  await fs.appendFile('./out/actions_log.jsonl', JSON.stringify(logEntry) + '\n');
};
```

---

## 🔑 Key Concepts

### 1. **Module Mapping**
- Uses `RedirectionURL` links with `moduleid` parameters
- Identifies modules by text content ("practice", "accounting")
- Stores in `moduleMap` for easy access

### 2. **Sub-Link Exploration**
- Finds all clickable elements (`a[href]`, `button`)
- Filters by visibility and validity
- Explores up to 25 sub-links per module
- Goes 3 levels deep (module → sub-page → deep-page)

### 3. **Information Collection**
- **Page metadata**: URL, title, breadcrumb, module, timestamp
- **Accessibility**: WCAG violations via Axe
- **Performance**: Load times, paint metrics
- **Visual**: Full-page screenshots

### 4. **Connection Tracking**
- `visitedUrls` Set prevents duplicate visits
- Handles SPA route changes (hash-based URLs)
- Tracks module hierarchy (module → sub → deep)

### 5. **Data Persistence**
- JSON files for structured data
- CSV for spreadsheet analysis
- JSONL for streaming logs
- Screenshots for visual verification

---

## 📈 Current Status

### What's Working ✅
- Module discovery (Practice Management, Accounting)
- Sub-link discovery (77 in PM, 36 in Accounting)
- Page recording with metadata
- Accessibility auditing
- Performance metrics collection
- Screenshot capture

### What's Being Explored 🔍
- Up to 25 sub-links per module (increased from 5)
- 3 levels of depth per sub-link
- Cross-module navigation
- SPA route detection

### Output Files Generated 📁
- `out/navigation_inventory.json` - All pages
- `out/a11y_violations.json` - Accessibility issues
- `out/perf_data.json` - Performance data
- `out/actions_log.jsonl` - Action history
- `out/screenshots/*.png` - Visual records

---

## 🎯 Summary

The codebase uses a **systematic discovery approach**:

1. **Find modules** by analyzing navigation links with `moduleid` parameters
2. **Map modules** to their links (Practice Management = moduleid 7, Accounting = moduleid 2)
3. **Navigate to each module** and record the main page
4. **Discover sub-links** within each module (up to 25 per module)
5. **Explore sub-pages** and record them with full metadata
6. **Go deeper** (up to 3 levels) to find all accessible pages
7. **Collect information** on each page: accessibility, performance, screenshots
8. **Track connections** via URL tracking and module hierarchy

This creates a comprehensive map of:
- **What modules exist** (Practice Management, Accounting, etc.)
- **How they connect** (via RedirectionURL links)
- **What pages are in each module** (sub-links and deep-links)
- **What information each page contains** (metadata, a11y, performance)

The system is designed to be **comprehensive** (finds all accessible pages) and **non-destructive** (uses saved authentication, doesn't modify data unless explicitly testing).

