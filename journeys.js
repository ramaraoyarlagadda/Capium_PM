const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs-extra');
const path = require('path');

// Generate UUID helper
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const uuid = generateUUID();
const prefix = `AUTO_QA_20260105_${uuid}`;

(async () => {
  // Load saved authentication state
  let browser;
  let context;
  try {
    const storageState = require('./out/storageState.json');
    browser = await chromium.launch({ headless: false }); // Headed for visual verification
    context = await browser.newContext({ storageState });
  } catch (e) {
    console.log('⚠️ storageState.json not found. Please run auth.js first.');
    console.error('Error:', e.message);
    process.exit(1);
  }
  
  const page = await context.newPage();

  // Trackers
  const actionsLog = [];
  const createdEntities = [];
  const issues = [];

  // Helper: Log action
  const logAction = async (action, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      url: page.url(),
      ...details
    };
    actionsLog.push(logEntry);
    
    // Append to JSONL file
    await fs.appendFile('./out/actions_log.jsonl', JSON.stringify(logEntry) + '\n');
    console.log(`📝 ${action}: ${JSON.stringify(details)}`);
  };

  // Helper: Take screenshot with action context
  const screenshot = async (name) => {
    const slug = name.replace(/[^a-z0-9]/gi, '_');
    const path = `./out/screenshots/journey_${slug}.png`;
    await page.screenshot({ path, fullPage: true });
    return path;
  };

  try {
    console.log('🚀 Starting deep journey testing...');
    console.log(`📌 Test data prefix: ${prefix}`);
    
    // Navigate to dashboard (try both domains)
    const baseUrls = [
      'https://account.beta.capium.co.uk/home',
      'https://app.beta.capium.co.uk/',
      'https://account.beta.capium.co.uk/'
    ];
    
    let navigated = false;
    for (const baseUrl of baseUrls) {
      try {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
    
    await logAction('NAVIGATE', { target: 'Dashboard', url: page.url() });

    // ========== PRACTICE MANAGEMENT JOURNEYS ==========
    console.log('\n📋 === PRACTICE MANAGEMENT JOURNEYS ===');
    
    // First, navigate to Practice Management module (like crawl.js does)
    console.log('🔍 Navigating to Practice Management module...');
    const redirectionLinks = await page.$$eval('a[href*="RedirectionURL"]', elements => 
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href || el.getAttribute('href') || '',
        visible: el.offsetParent !== null,
        moduleid: (el.href || el.getAttribute('href') || '').match(/moduleid=(\d+)/)?.[1]
      })).filter(el => el.visible)
    );
    
    // Find Practice Management link
    const practiceLink = redirectionLinks.find(link => 
      link.text.toLowerCase().includes('practice') || 
      link.text.toLowerCase().includes('management')
    );
    
    if (practiceLink) {
      console.log(`  ✓ Found Practice Management: "${practiceLink.text}"`);
      await page.goto(practiceLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      await logAction('NAVIGATE', { target: 'Practice Management', url: page.url() });
      await screenshot('practice_management_dashboard');
    } else {
      console.log('  ⚠️  Practice Management link not found, trying alternative navigation...');
    }
    
    // Journey 1: Create Client
    try {
      console.log('\n1️⃣ Creating test client...');
      
      // Navigate to Clients within Practice Management
      const clientSelectors = [
        'text=/Client/i',
        'a[href*="/client"]',
        'a[href*="client"]',
        'a:has-text("Clients")',
        'button:has-text("Client")',
        '[id*="client"]',
        '[class*="client"]'
      ];
      
      let clientNavSuccess = false;
      for (const sel of clientSelectors) {
        try {
          const elements = await page.$$(sel);
          for (const element of elements) {
            try {
              if (await element.isVisible()) {
                const text = await element.textContent();
                if (text && text.toLowerCase().includes('client')) {
                  await element.click();
                  await page.waitForTimeout(2000);
                  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                  clientNavSuccess = true;
                  await logAction('NAVIGATE', { target: 'Clients', selector: sel, text });
                  await screenshot('clients_page');
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          if (clientNavSuccess) break;
        } catch (e) {
          continue;
        }
      }
      
      if (clientNavSuccess) {
        // Look for "Add Client" or "New Client" button
        const addClientSelectors = [
          'button:has-text("Add")',
          'button:has-text("New")',
          'button:has-text("Create")',
          'a:has-text("Add Client")',
          '[class*="add"]',
          '[id*="add"]'
        ];
        
        for (const sel of addClientSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await btn.click();
              await page.waitForTimeout(1000);
              await logAction('CLICK', { element: 'Add Client Button', selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Fill client form
        const clientName = `${prefix}_Client`;
        const clientEmail = `${prefix.toLowerCase().replace(/_/g, '.')}@test.com`;
        
        // Try to find and fill name field
        const nameSelectors = [
          'input[name*="name"]',
          'input[id*="name"]',
          'input[placeholder*="name"]',
          'input[type="text"]:first-of-type'
        ];
        
        for (const sel of nameSelectors) {
          try {
            const field = await page.$(sel);
            if (field && await field.isVisible()) {
              await field.fill(clientName);
              await logAction('FILL', { field: 'Client Name', value: clientName, selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Try to find and fill email field
        const emailSelectors = [
          'input[type="email"]',
          'input[name*="email"]',
          'input[id*="email"]'
        ];
        
        for (const sel of emailSelectors) {
          try {
            const field = await page.$(sel);
            if (field && await field.isVisible()) {
              await field.fill(clientEmail);
              await logAction('FILL', { field: 'Client Email', value: clientEmail, selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Submit form
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Save")',
          'button:has-text("Create")',
          'button:has-text("Submit")'
        ];
        
        for (const sel of submitSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await screenshot('before_client_submit');
              await btn.click();
              await page.waitForTimeout(3000);
              await logAction('SUBMIT', { form: 'Create Client', selector: sel });
              await screenshot('after_client_submit');
              
              createdEntities.push({
                type: 'Client',
                name: clientName,
                email: clientEmail,
                prefix,
                timestamp: new Date().toISOString()
              });
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error creating client:', error.message);
      await logAction('ERROR', { action: 'Create Client', error: error.message });
      await screenshot('error_client_creation');
    }

    // Journey 2: Create Task
    try {
      console.log('\n2️⃣ Creating test task...');
      
      // Navigate back to Practice Management dashboard first
      if (practiceLink) {
        await page.goto(practiceLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
      }
      
      // Navigate to Tasks
      const taskSelectors = [
        'text=/Task/i',
        'a[href*="/task"]',
        'a[href*="task"]',
        'a:has-text("Tasks")',
        'button:has-text("Task")',
        '[id*="task"]',
        '[class*="task"]'
      ];
      
      let taskNavSuccess = false;
      for (const sel of taskSelectors) {
        try {
          const elements = await page.$$(sel);
          for (const element of elements) {
            try {
              if (await element.isVisible()) {
                const text = await element.textContent();
                if (text && text.toLowerCase().includes('task')) {
                  await element.click();
                  await page.waitForTimeout(2000);
                  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                  taskNavSuccess = true;
                  await logAction('NAVIGATE', { target: 'Tasks', selector: sel, text });
                  await screenshot('tasks_page');
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          if (taskNavSuccess) break;
        } catch (e) {
          continue;
        }
      }
      
      if (taskNavSuccess) {
        // Look for "Add Task" button
        const addTaskSelectors = [
          'button:has-text("Add")',
          'button:has-text("New")',
          'button:has-text("Create")',
          'a:has-text("Add Task")'
        ];
        
        for (const sel of addTaskSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await btn.click();
              await page.waitForTimeout(1000);
              await logAction('CLICK', { element: 'Add Task Button', selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Fill task form
        const taskTitle = `${prefix}_Task`;
        const taskDescription = `Automated test task created on ${new Date().toISOString()}`;
        
        // Try to find and fill title field
        const titleSelectors = [
          'input[name*="title"]',
          'input[id*="title"]',
          'input[placeholder*="title"]',
          'textarea[name*="title"]',
          'input[type="text"]:first-of-type'
        ];
        
        for (const sel of titleSelectors) {
          try {
            const field = await page.$(sel);
            if (field && await field.isVisible()) {
              await field.fill(taskTitle);
              await logAction('FILL', { field: 'Task Title', value: taskTitle, selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Try to find and fill description field
        const descSelectors = [
          'textarea[name*="description"]',
          'textarea[id*="description"]',
          'textarea[placeholder*="description"]',
          'textarea'
        ];
        
        for (const sel of descSelectors) {
          try {
            const field = await page.$(sel);
            if (field && await field.isVisible()) {
              await field.fill(taskDescription);
              await logAction('FILL', { field: 'Task Description', value: taskDescription, selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Submit task form
        for (const sel of submitSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await screenshot('before_task_submit');
              await btn.click();
              await page.waitForTimeout(3000);
              await logAction('SUBMIT', { form: 'Create Task', selector: sel });
              await screenshot('after_task_submit');
              
              createdEntities.push({
                type: 'Task',
                title: taskTitle,
                description: taskDescription,
                prefix,
                timestamp: new Date().toISOString()
              });
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error creating task:', error.message);
      await logAction('ERROR', { action: 'Create Task', error: error.message });
      await screenshot('error_task_creation');
    }

    // ========== ACCOUNTING JOURNEYS ==========
    console.log('\n💰 === ACCOUNTING JOURNEYS ===');
    
    // Navigate back to dashboard first
    await page.goto('https://account.beta.capium.co.uk/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Find Accounting module link
    const accountingLinks = await page.$$eval('a[href*="RedirectionURL"]', elements => 
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href || el.getAttribute('href') || '',
        visible: el.offsetParent !== null
      })).filter(el => el.visible && (
        el.text.toLowerCase().includes('account') || 
        el.text.toLowerCase().includes('bookkeeping')
      ))
    );
    
    const accountingLink = accountingLinks[0];
    if (accountingLink) {
      console.log(`  ✓ Found Accounting: "${accountingLink.text}"`);
      await page.goto(accountingLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      await logAction('NAVIGATE', { target: 'Accounting', url: page.url() });
      await screenshot('accounting_dashboard');
    }
    
    // Journey 3: Create Invoice
    try {
      console.log('\n3️⃣ Creating test invoice...');
      
      // Navigate to Invoices within Accounting
      const invoiceSelectors = [
        'text=/Invoice/i',
        'a[href*="/invoice"]',
        'a[href*="invoice"]',
        'a:has-text("Invoice")',
        'button:has-text("Invoice")',
        '[id*="invoice"]',
        '[class*="invoice"]'
      ];
      
      let invoiceNavSuccess = false;
      for (const sel of invoiceSelectors) {
        try {
          const elements = await page.$$(sel);
          for (const element of elements) {
            try {
              if (await element.isVisible()) {
                const text = await element.textContent();
                if (text && text.toLowerCase().includes('invoice')) {
                  await element.click();
                  await page.waitForTimeout(2000);
                  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                  invoiceNavSuccess = true;
                  await logAction('NAVIGATE', { target: 'Invoices', selector: sel, text });
                  await screenshot('invoices_page');
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          if (invoiceNavSuccess) break;
        } catch (e) {
          continue;
        }
      }
      
      if (invoiceNavSuccess) {
        // Look for "Add Invoice" or "New Invoice" button
        const addInvoiceSelectors = [
          'button:has-text("Add")',
          'button:has-text("New")',
          'button:has-text("Create")',
          'a:has-text("Add Invoice")'
        ];
        
        for (const sel of addInvoiceSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await btn.click();
              await page.waitForTimeout(1000);
              await logAction('CLICK', { element: 'Add Invoice Button', selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Fill invoice form
        const invoiceNumber = `${prefix}_INV`;
        const invoiceAmount = '100.00';
        
        // Try to find and fill invoice number
        const invNumSelectors = [
          'input[name*="number"]',
          'input[id*="number"]',
          'input[placeholder*="number"]',
          'input[type="text"]:first-of-type'
        ];
        
        for (const sel of invNumSelectors) {
          try {
            const field = await page.$(sel);
            if (field && await field.isVisible()) {
              await field.fill(invoiceNumber);
              await logAction('FILL', { field: 'Invoice Number', value: invoiceNumber, selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Try to find and fill amount
        const amountSelectors = [
          'input[name*="amount"]',
          'input[id*="amount"]',
          'input[type="number"]',
          'input[placeholder*="amount"]'
        ];
        
        for (const sel of amountSelectors) {
          try {
            const field = await page.$(sel);
            if (field && await field.isVisible()) {
              await field.fill(invoiceAmount);
              await logAction('FILL', { field: 'Invoice Amount', value: invoiceAmount, selector: sel });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Submit invoice form
        for (const sel of submitSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && await btn.isVisible()) {
              await screenshot('before_invoice_submit');
              await btn.click();
              await page.waitForTimeout(3000);
              await logAction('SUBMIT', { form: 'Create Invoice', selector: sel });
              await screenshot('after_invoice_submit');
              
              createdEntities.push({
                type: 'Invoice',
                number: invoiceNumber,
                amount: invoiceAmount,
                prefix,
                timestamp: new Date().toISOString()
              });
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error creating invoice:', error.message);
      await logAction('ERROR', { action: 'Create Invoice', error: error.message });
      await screenshot('error_invoice_creation');
    }

    // Save created entities
    await fs.writeJson('./out/created_entities.json', createdEntities, { spaces: 2 });
    console.log(`\n✅ Created ${createdEntities.length} test entities`);
    console.log('📝 All actions logged to ./out/actions_log.jsonl');
    console.log('📦 Created entities saved to ./out/created_entities.json');

  } catch (error) {
    console.error('❌ Journey error:', error);
    await screenshot('error_journey');
  } finally {
    // Keep browser open for 10 seconds to observe
    await page.waitForTimeout(10000);
    try {
      await context.close();
      await browser.close();
      console.log('\n🔒 Browser closed successfully');
    } catch (e) {
      console.log('⚠️  Error closing browser:', e.message);
    }
    process.exit(0);
  }
})();

