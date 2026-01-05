# Capium Beta - Comprehensive QA Audit & Automation

This project performs a full-depth coverage crawl and audit of Capium Beta, focusing on Practice Management (primary) and Accounting modules (secondary), along with all other accessible features.

## 🎯 Mission

- Authenticate into Capium Beta (Super Accountant role)
- Perform comprehensive navigation discovery
- Generate navigation inventory
- Identify UI/UX issues
- Conduct WCAG accessibility audit
- Measure performance metrics
- Create Playwright regression tests
- Log all actions and changes
- Export created entities list

## 📁 Project Structure

```
capium-beta-audit/
├── auth.js              # Authentication script
├── crawl.js             # Navigation discovery and audit
├── journeys.js          # Deep testing with actions (create entities)
├── generate-report.js   # Generate UI/UX issues report
├── playwright.config.js # Playwright configuration
├── .env                 # Credentials (DO NOT COMMIT)
├── .gitignore          # Git ignore rules
├── tests/              # Playwright regression tests
│   ├── pm.spec.js      # Practice Management tests
│   └── accounting.spec.js # Accounting tests
└── out/                # Output directory
    ├── screenshots/    # Page screenshots
    ├── a11y/          # Accessibility reports
    ├── performance/   # Performance traces
    ├── tests/         # Test screenshots
    ├── navigation_inventory.json/csv
    ├── a11y_violations.json
    ├── perf_data.json
    ├── actions_log.jsonl
    ├── created_entities.json
    ├── uiux_issues.md
    └── storageState.json
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install --with-deps
```

### 2. Configure Credentials

Create `.env` file (already created, but verify):

```env
USERNAME=jacquelinewilliamson2023@gmail.com
PASSWORD=Lam@1234
```

**⚠️ IMPORTANT:** Never commit `.env` or `storageState.json` to version control.

### 3. Run Authentication

```bash
node auth.js
```

This will:
- Open a browser window (headed mode)
- Log in to Capium Beta
- Save authentication state to `./out/storageState.json`
- Take screenshots for verification

**Note:** If MFA/email verification appears, complete it manually and note the selectors.

### 4. Run Navigation Crawl

```bash
node crawl.js
```

This will:
- Load saved authentication state
- Discover all accessible pages
- Capture screenshots
- Run accessibility audits (axe-core)
- Collect performance metrics
- Generate navigation inventory (JSON & CSV)
- Export a11y violations and performance data

### 5. Run Deep Journey Testing

```bash
node journeys.js
```

This will:
- Create test entities with prefix `AUTO_QA_20260105_<uuid>`
- Test Practice Management workflows (clients, tasks)
- Test Accounting workflows (invoices)
- Log all actions to `actions_log.jsonl`
- Export created entities to `created_entities.json`
- Take screenshots at key steps

### 6. Generate UI/UX Issues Report

```bash
node generate-report.js
```

This will:
- Analyze a11y violations
- Identify performance issues
- Generate `uiux_issues.md` report
- Export structured JSON report

### 7. Run Regression Tests

```bash
npx playwright test
```

Or run specific test suites:

```bash
npx playwright test tests/pm.spec.js
npx playwright test tests/accounting.spec.js
```

View HTML report:

```bash
npx playwright show-report
```

## 📊 Output Files

### Navigation Inventory
- `out/navigation_inventory.json` - Full navigation structure (JSON)
- `out/navigation_inventory.csv` - Navigation inventory (CSV)

### Accessibility
- `out/a11y_violations.json` - All WCAG violations found
- `out/tests/*-a11y-violations.json` - Test-specific violations

### Performance
- `out/perf_data.json` - Performance metrics for all pages
- `out/tests/*-performance.json` - Test-specific performance data

### Actions & Entities
- `out/actions_log.jsonl` - All actions logged (JSONL format)
- `out/created_entities.json` - List of created test entities

### Screenshots
- `out/screenshots/*.png` - Full-page screenshots of all discovered pages
- `out/screenshots/journey_*.png` - Screenshots from journey testing
- `out/tests/*.png` - Test execution screenshots

### Reports
- `out/uiux_issues.md` - Comprehensive UI/UX issues report
- `out/uiux_issues.json` - Structured issues data

## 🧪 Test Account Policy

All test data is prefixed with `AUTO_QA_20260105_<uuid>` to:
- Clearly identify automated test data
- Enable easy cleanup
- Prevent conflicts with real data

**Created entities include:**
- Clients
- Tasks
- Invoices
- Other test data as discovered

## 🔍 Test Coverage

### Practice Management
- ✅ Navigation structure
- ✅ Dashboard accessibility
- ✅ Client management workflows
- ✅ Task management workflows
- ✅ Performance metrics
- ✅ Responsive layout testing

### Accounting
- ✅ Navigation structure
- ✅ Dashboard accessibility
- ✅ Invoice workflows
- ✅ Performance metrics

### General
- ✅ WCAG 2.1 AA compliance
- ✅ Page load performance
- ✅ Navigation consistency
- ✅ Breadcrumb structure

## 🛠️ Troubleshooting

### Authentication Fails

1. Check `.env` file exists and has correct credentials
2. Run `auth.js` in headed mode to observe the login process
3. If MFA is required, complete manually and note selectors
4. Verify `storageState.json` is created after successful login

### Selectors Not Found

The scripts use multiple fallback selectors. If navigation fails:
1. Check screenshots in `out/screenshots/`
2. Inspect the page structure manually
3. Update selectors in the relevant script
4. Re-run the script

### Performance Issues

If pages load slowly:
1. Check network conditions
2. Review `perf_data.json` for specific slow pages
3. Consider increasing timeouts in scripts

## 📝 Notes

- All scripts are designed to be resilient with multiple selector fallbacks
- Screenshots are taken at every step for debugging
- Actions are logged in JSONL format for easy parsing
- Test data is clearly marked with the `AUTO_QA_20260105_` prefix

## 🔒 Security

- `.env` file is gitignored
- `storageState.json` contains session cookies and is gitignored
- Never commit credentials or session data
- Test data is clearly marked and can be safely deleted

## 📈 Next Steps

1. Review `out/uiux_issues.md` for identified issues
2. Prioritize fixes based on severity
3. Use regression tests in CI/CD pipeline
4. Re-run audit after fixes to verify improvements

## 🤝 Contributing

When updating selectors or adding new test journeys:
1. Update the relevant script
2. Test in headed mode first
3. Verify outputs are generated correctly
4. Update this README if structure changes

---

**Generated:** 2026-01-05  
**Target:** Capium Beta (app.beta.capium.co.uk)  
**Role:** Super Accountant

