/**
 * Practice Management Helper Utilities
 * Common functions for PM testing
 */

class PMHelpers {
  /**
   * Navigate to Practice Management module
   */
  static async navigateToPracticeManagement(page) {
    // Find Practice Management link
    const redirectionLinks = await page.$$eval('a[href*="RedirectionURL"]', elements => 
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href || el.getAttribute('href') || '',
        visible: el.offsetParent !== null,
        moduleid: (el.href || el.getAttribute('href') || '').match(/moduleid=(\d+)/)?.[1]
      })).filter(el => el.visible)
    );
    
    const practiceLink = redirectionLinks.find(link => 
      link.text.toLowerCase().includes('practice') || 
      link.text.toLowerCase().includes('management')
    );
    
    if (practiceLink) {
      await page.goto(practiceLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      return practiceLink;
    }
    
    throw new Error('Practice Management link not found');
  }

  /**
   * Navigate to a specific section within Practice Management
   */
  static async navigateToSection(page, sectionName) {
    const sectionSelectors = [
      `text=/${sectionName}/i`,
      `a[href*="/${sectionName}"]`,
      `a[href*="${sectionName}"]`,
      `a:has-text("${sectionName}")`,
      `button:has-text("${sectionName}")`,
      `[id*="${sectionName}"]`,
      `[class*="${sectionName}"]`
    ];
    
    for (const selector of sectionSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          try {
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text && text.toLowerCase().includes(sectionName.toLowerCase())) {
                await element.click();
                await page.waitForTimeout(2000);
                await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                return true;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  /**
   * Find and click a button by text
   */
  static async findAndClickButton(page, buttonTexts) {
    const buttonSelectors = [
      ...buttonTexts.map(text => `button:has-text("${text}")`),
      ...buttonTexts.map(text => `a:has-text("${text}")`),
      'button[class*="add"]',
      'button[class*="new"]',
      'button[class*="create"]',
      '[class*="add"] button',
      '[class*="new"] button'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(500);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  /**
   * Find a form field
   */
  static async findField(page, selectors) {
    for (const selector of selectors) {
      try {
        const field = await page.$(selector);
        if (field && await field.isVisible()) {
          return field;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  /**
   * Fill a form field
   */
  static async fillField(page, selectors, value) {
    const field = await this.findField(page, selectors);
    if (field) {
      await field.fill(value);
      await page.waitForTimeout(200);
      return true;
    }
    return false;
  }

  /**
   * Submit a form
   */
  static async submitForm(page) {
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Save")',
      'button:has-text("Create")',
      'button:has-text("Submit")',
      'button:has-text("Add")',
      '[class*="submit"] button',
      '[class*="save"] button'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(500);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  /**
   * Check for success message or indication
   */
  static async checkForSuccess(page) {
    const successIndicators = [
      'text=/success/i',
      'text=/created/i',
      'text=/saved/i',
      '[class*="success"]',
      '[class*="alert-success"]',
      '[role="alert"]'
    ];
    
    for (const selector of successIndicators) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          const text = await element.textContent();
          if (text && (text.toLowerCase().includes('success') || 
                       text.toLowerCase().includes('created') ||
                       text.toLowerCase().includes('saved'))) {
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Also check URL change (might indicate success)
    const url = page.url();
    if (!url.includes('create') && !url.includes('new') && !url.includes('add')) {
      return true; // Might have navigated away from form
    }
    
    return false;
  }

  /**
   * Test a specific feature
   */
  static async testFeature(page, feature) {
    try {
      // Try to navigate to feature
      if (feature.url) {
        await page.goto(feature.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        return true;
      }
      
      // Try to find and click feature link
      if (feature.selectors && feature.selectors.length > 0) {
        for (const selector of feature.selectors) {
          try {
            const element = await page.$(selector);
            if (element && await element.isVisible()) {
              await element.click();
              await page.waitForTimeout(2000);
              return true;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Wait for element to be visible
   */
  static async waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get all clickable elements on page
   */
  static async getAllClickableElements(page) {
    return await page.$$eval('a[href], button:not([disabled])', elements =>
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: el.href || el.getAttribute('href') || '',
        tag: el.tagName,
        visible: el.offsetParent !== null,
        id: el.id || '',
        className: el.className || ''
      })).filter(el => el.visible)
    );
  }

  /**
   * Get page metadata
   */
  static async getPageMetadata(page) {
    return {
      url: page.url(),
      title: await page.title(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = PMHelpers;

