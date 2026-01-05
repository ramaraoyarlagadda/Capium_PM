/**
 * Practice Management Feature Discovery
 * Dynamically discovers all features and pages in PM module
 */

const PMHelpers = require('./pm-helpers');

class PMDiscovery {
  /**
   * Discover all features in Practice Management
   */
  static async discoverAllFeatures(page) {
    const features = [];
    
    // Navigate to PM dashboard
    await PMHelpers.navigateToPracticeManagement(page);
    await page.waitForTimeout(2000);
    
    // Discover main sections
    const mainSections = await this.discoverMainSections(page);
    features.push(...mainSections);
    
    // Discover navigation menu items
    const navItems = await this.discoverNavigationItems(page);
    features.push(...navItems);
    
    // Discover dashboard widgets
    const widgets = await this.discoverDashboardWidgets(page);
    features.push(...widgets);
    
    // Discover CRUD operations for each section
    for (const section of mainSections) {
      try {
        await PMHelpers.navigateToPracticeManagement(page);
        await PMHelpers.navigateToSection(page, section.name.toLowerCase());
        await page.waitForTimeout(2000);
        
        const crudOps = await this.discoverCRUDOperations(page, section.name);
        features.push(...crudOps);
      } catch (e) {
        // Skip if section not accessible
      }
    }
    
    return features;
  }

  /**
   * Discover main sections (Clients, Tasks, Deadlines, etc.)
   */
  static async discoverMainSections(page) {
    const sections = [];
    const sectionKeywords = [
      'client', 'task', 'deadline', 'staff', 'workflow',
      'document', 'report', 'setting', 'dashboard', 'calendar',
      'notification', 'search', 'filter', 'export', 'import'
    ];
    
    // Get all navigation links
    const navLinks = await page.$$eval('nav a, [role="navigation"] a, [class*="nav"] a, [class*="menu"] a', elements =>
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href || el.getAttribute('href') || '',
        visible: el.offsetParent !== null
      })).filter(el => el.visible && el.text)
    );
    
    // Also check for buttons
    const navButtons = await page.$$eval('nav button, [role="navigation"] button, [class*="nav"] button', elements =>
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        visible: el.offsetParent !== null
      })).filter(el => el.visible && el.text)
    );
    
    const allNavItems = [...navLinks, ...navButtons];
    
    for (const keyword of sectionKeywords) {
      const matchingItems = allNavItems.filter(item =>
        item.text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (matchingItems.length > 0) {
        sections.push({
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          type: 'section',
          pages: matchingItems.map(item => ({
            name: item.text,
            url: item.href || null,
            selector: `text="${item.text}"`
          })),
          selectors: matchingItems.map(item => `text="${item.text}"`)
        });
      }
    }
    
    return sections;
  }

  /**
   * Discover navigation menu items
   */
  static async discoverNavigationItems(page) {
    const navItems = [];
    
    try {
      const items = await page.$$eval('nav a, [role="navigation"] a, [class*="nav"] a', elements =>
        elements.map(el => ({
          text: el.textContent?.trim() || '',
          href: el.href || el.getAttribute('href') || '',
          visible: el.offsetParent !== null,
          ariaLabel: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || ''
        })).filter(el => el.visible && (el.text || el.ariaLabel || el.title))
      );
      
      items.forEach(item => {
        navItems.push({
          name: item.text || item.ariaLabel || item.title,
          type: 'navigation',
          url: item.href,
          selector: `text="${item.text}"`
        });
      });
    } catch (e) {
      // Navigation discovery failed
    }
    
    return navItems;
  }

  /**
   * Discover dashboard widgets
   */
  static async discoverDashboardWidgets(page) {
    const widgets = [];
    
    try {
      const widgetSelectors = [
        '[class*="widget"]',
        '[class*="card"]',
        '[class*="panel"]',
        '[class*="stat"]',
        '[class*="metric"]',
        '[class*="dashboard-item"]'
      ];
      
      for (const selector of widgetSelectors) {
        const elements = await page.$$(selector);
        for (const element of elements) {
          try {
            if (await element.isVisible()) {
              const text = await element.textContent();
              const title = await element.getAttribute('title') || 
                           await element.getAttribute('aria-label') || 
                           text?.trim().substring(0, 50) || 'Widget';
              
              widgets.push({
                name: title,
                type: 'widget',
                selector: selector,
                text: text?.trim().substring(0, 100)
              });
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      // Widget discovery failed
    }
    
    return widgets;
  }

  /**
   * Discover CRUD operations for a section
   */
  static async discoverCRUDOperations(page, sectionName) {
    const operations = [];
    
    // Look for action buttons
    const actionButtons = await page.$$eval('button, a[class*="button"], a[class*="btn"]', elements =>
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        title: el.getAttribute('title') || '',
        visible: el.offsetParent !== null,
        className: el.className || ''
      })).filter(el => el.visible && (el.text || el.ariaLabel || el.title))
    );
    
    // Categorize operations
    const operationKeywords = {
      create: ['add', 'new', 'create', 'insert'],
      read: ['view', 'show', 'details', 'open', 'see'],
      update: ['edit', 'update', 'modify', 'change'],
      delete: ['delete', 'remove', 'trash', 'destroy']
    };
    
    for (const [operation, keywords] of Object.entries(operationKeywords)) {
      const matchingButtons = actionButtons.filter(btn => {
        const text = (btn.text + ' ' + btn.ariaLabel + ' ' + btn.title).toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
      
      if (matchingButtons.length > 0) {
        operations.push({
          name: `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${sectionName}`,
          type: 'operation',
          operation: operation,
          section: sectionName,
          buttons: matchingButtons.map(btn => ({
            text: btn.text || btn.ariaLabel || btn.title,
            selector: `text="${btn.text || btn.ariaLabel || btn.title}"`
          }))
        });
      }
    }
    
    return operations;
  }

  /**
   * Discover forms on current page
   */
  static async discoverForms(page) {
    const forms = [];
    
    try {
      const formElements = await page.$$eval('form, [class*="form"]', elements =>
        elements.map((form, idx) => ({
          id: form.id || `form-${idx}`,
          action: form.action || form.getAttribute('action') || '',
          method: form.method || form.getAttribute('method') || 'get',
          fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
            type: field.type || field.tagName.toLowerCase(),
            name: field.name || field.id || '',
            placeholder: field.placeholder || '',
            required: field.required || field.hasAttribute('required')
          }))
        }))
      );
      
      forms.push(...formElements);
    } catch (e) {
      // Form discovery failed
    }
    
    return forms;
  }

  /**
   * Discover tables/lists on current page
   */
  static async discoverTables(page) {
    const tables = [];
    
    try {
      const tableElements = await page.$$eval('table, [class*="table"], [class*="list"], [role="grid"]', elements =>
        elements.map((table, idx) => ({
          id: table.id || `table-${idx}`,
          rows: table.querySelectorAll('tr, [class*="row"]').length,
          columns: table.querySelectorAll('th, td:first-child').length,
          hasHeader: table.querySelector('thead, th') !== null
        }))
      );
      
      tables.push(...tableElements);
    } catch (e) {
      // Table discovery failed
    }
    
    return tables;
  }
}

module.exports = PMDiscovery;

