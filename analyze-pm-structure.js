/**
 * Practice Management Structural Analysis
 * Analyzes the PM module structure, components, and implementations
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

(async () => {
  console.log('🔍 Starting Practice Management Structural Analysis...\n');
  
  let browser;
  let context;
  try {
    const storageState = require('./out/storageState.json');
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ storageState });
  } catch (e) {
    console.log('⚠️ storageState.json not found. Please run auth.js first.');
    process.exit(1);
  }
  
  const page = await context.newPage();
  const analysis = {
    timestamp: new Date().toISOString(),
    module: 'Practice Management',
    structure: {
      routes: [],
      components: [],
      apiEndpoints: [],
      dataModels: [],
      services: [],
      events: []
    },
    navigation: {
      mainSections: [],
      subSections: [],
      workflows: []
    },
    technical: {
      framework: null,
      patterns: [],
      integrations: []
    }
  };

  try {
    // Navigate to Practice Management
    console.log('📍 Navigating to Practice Management...');
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
    
    if (!practiceLink) {
      throw new Error('Practice Management link not found');
    }
    
    await page.goto(practiceLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`✅ Loaded: ${currentUrl}\n`);
    
    // 1. Analyze Routes/URLs
    console.log('📊 Analyzing Routes and URLs...');
    analysis.structure.routes.push({
      path: currentUrl,
      type: 'main',
      hash: currentUrl.includes('#') ? currentUrl.split('#')[1] : null
    });
    
    // Monitor route changes
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url.includes('capium') && !analysis.structure.routes.find(r => r.path === url)) {
          analysis.structure.routes.push({
            path: url,
            type: 'navigation',
            hash: url.includes('#') ? url.split('#')[1] : null,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    // 2. Analyze DOM Structure for Components
    console.log('🧩 Analyzing Component Structure...');
    const componentAnalysis = await page.evaluate(() => {
      const components = [];
      
      // Find Angular/React/Vue components (common patterns)
      const componentSelectors = [
        '[ng-controller]',
        '[ng-component]',
        '[data-component]',
        '[class*="component"]',
        '[id*="Component"]',
        '[ng-view]',
        '[router-outlet]',
        '[data-reactroot]',
        '[data-v-]'
      ];
      
      componentSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el, idx) => {
            components.push({
              selector,
              tag: el.tagName,
              id: el.id || null,
              className: el.className || null,
              attributes: Array.from(el.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
              }))
            });
          });
        } catch (e) {}
      });
      
      return components;
    });
    
    analysis.structure.components = componentAnalysis;
    console.log(`   Found ${componentAnalysis.length} potential components\n`);
    
    // 3. Analyze API Endpoints
    console.log('🌐 Monitoring API Calls...');
    const apiCalls = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('/rest/') || url.includes('/graphql')) {
        apiCalls.push({
          url,
          method: request.method(),
          resourceType: request.resourceType(),
          headers: request.headers(),
          postData: request.postData(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // 4. Analyze Navigation Structure
    console.log('🧭 Analyzing Navigation Structure...');
    const navStructure = await page.evaluate(() => {
      const sections = [];
      
      // Find all navigation elements
      const navSelectors = [
        'nav a',
        '[role="navigation"] a',
        '[class*="nav"] a',
        '[class*="menu"] a',
        '[class*="sidebar"] a'
      ];
      
      navSelectors.forEach(selector => {
        try {
          const links = document.querySelectorAll(selector);
          links.forEach(link => {
            if (link.offsetParent !== null) {
              const text = link.textContent?.trim();
              const href = link.href || link.getAttribute('href');
              if (text && href) {
                sections.push({
                  text,
                  href,
                  selector,
                  parent: link.closest('nav, [role="navigation"], [class*="nav"]')?.tagName || null
                });
              }
            }
          });
        } catch (e) {}
      });
      
      return sections;
    });
    
    analysis.navigation.mainSections = navStructure;
    console.log(`   Found ${navStructure.length} navigation items\n`);
    
    // 5. Analyze Data Models (from forms, tables, etc.)
    console.log('📋 Analyzing Data Models...');
    const dataModels = await page.evaluate(() => {
      const models = [];
      
      // Find forms
      const forms = document.querySelectorAll('form');
      forms.forEach((form, idx) => {
        const fields = Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
          name: field.name || field.id || null,
          type: field.type || field.tagName.toLowerCase(),
          required: field.required || field.hasAttribute('required'),
          placeholder: field.placeholder || null
        }));
        
        if (fields.length > 0) {
          models.push({
            type: 'form',
            id: form.id || `form-${idx}`,
            action: form.action || null,
            fields
          });
        }
      });
      
      // Find tables (potential data structures)
      const tables = document.querySelectorAll('table, [role="grid"]');
      tables.forEach((table, idx) => {
        const headers = Array.from(table.querySelectorAll('th, [role="columnheader"]')).map(th => 
          th.textContent?.trim()
        );
        
        if (headers.length > 0) {
          models.push({
            type: 'table',
            id: table.id || `table-${idx}`,
            headers,
            rowCount: table.querySelectorAll('tr, [role="row"]').length
          });
        }
      });
      
      return models;
    });
    
    analysis.structure.dataModels = dataModels;
    console.log(`   Found ${dataModels.length} data models\n`);
    
    // 6. Navigate through sections to discover more
    console.log('🔍 Exploring PM Sections...');
    const sectionsToExplore = ['client', 'task', 'deadline', 'staff', 'workflow'];
    
    for (const section of sectionsToExplore) {
      try {
        await page.goto(practiceLink.href, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        const sectionLink = await page.$(`text=/${section}/i, a[href*="${section}" i]`);
        if (sectionLink && await sectionLink.isVisible()) {
          await sectionLink.click();
          await page.waitForTimeout(2000);
          
          const sectionUrl = page.url();
          const sectionAnalysis = await page.evaluate(() => {
            return {
              title: document.title,
              url: window.location.href,
              components: document.querySelectorAll('[class*="component"], [data-component]').length,
              forms: document.querySelectorAll('form').length,
              tables: document.querySelectorAll('table, [role="grid"]').length,
              buttons: document.querySelectorAll('button, [role="button"]').length
            };
          });
          
          analysis.navigation.subSections.push({
            name: section,
            url: sectionUrl,
            ...sectionAnalysis
          });
          
          // Capture API calls for this section
          await page.waitForTimeout(3000);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not explore ${section} section`);
      }
    }
    
    // 7. Analyze Framework/Technology
    console.log('🔧 Analyzing Technology Stack...');
    const techStack = await page.evaluate(() => {
      const stack = {
        framework: null,
        libraries: [],
        patterns: []
      };
      
      // Check for Angular
      if (window.angular || document.querySelector('[ng-app], [ng-controller]')) {
        stack.framework = 'Angular';
      }
      // Check for React
      else if (window.React || document.querySelector('[data-reactroot]')) {
        stack.framework = 'React';
      }
      // Check for Vue
      else if (window.Vue || document.querySelector('[data-v-]')) {
        stack.framework = 'Vue';
      }
      
      // Check for common libraries
      if (window.jQuery) stack.libraries.push('jQuery');
      if (window._) stack.libraries.push('Lodash');
      if (window.moment) stack.libraries.push('Moment.js');
      
      return stack;
    });
    
    analysis.technical.framework = techStack.framework;
    analysis.technical.patterns = techStack.patterns;
    
    // Collect API calls
    analysis.structure.apiEndpoints = apiCalls;
    
    // 8. Save comprehensive analysis
    const outputDir = './out/pm-analysis';
    await fs.ensureDir(outputDir);
    
    await fs.writeJson(
      path.join(outputDir, 'pm-structural-analysis.json'),
      analysis,
      { spaces: 2 }
    );
    
    // Generate markdown report
    let report = `# Practice Management Structural Analysis\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    
    report += `## 📊 Overview\n\n`;
    report += `- **Module:** ${analysis.module}\n`;
    report += `- **Framework:** ${analysis.technical.framework || 'Unknown'}\n`;
    report += `- **Routes Found:** ${analysis.structure.routes.length}\n`;
    report += `- **Components Found:** ${analysis.structure.components.length}\n`;
    report += `- **API Endpoints:** ${analysis.structure.apiEndpoints.length}\n`;
    report += `- **Data Models:** ${analysis.structure.dataModels.length}\n\n`;
    
    report += `## 🧭 Navigation Structure\n\n`;
    analysis.navigation.mainSections.forEach((section, idx) => {
      report += `${idx + 1}. **${section.text}**\n`;
      report += `   - URL: ${section.href}\n`;
      report += `   - Selector: ${section.selector}\n\n`;
    });
    
    report += `## 📋 Data Models\n\n`;
    analysis.structure.dataModels.forEach((model, idx) => {
      report += `### ${model.type.toUpperCase()} ${idx + 1}\n\n`;
      if (model.fields) {
        report += `**Fields:**\n`;
        model.fields.forEach(field => {
          report += `- ${field.name || 'unnamed'} (${field.type})${field.required ? ' *required' : ''}\n`;
        });
      }
      if (model.headers) {
        report += `**Headers:** ${model.headers.join(', ')}\n`;
      }
      report += `\n`;
    });
    
    report += `## 🌐 API Endpoints\n\n`;
    const uniqueEndpoints = [...new Set(analysis.structure.apiEndpoints.map(e => e.url))];
    uniqueEndpoints.forEach((url, idx) => {
      const endpoint = analysis.structure.apiEndpoints.find(e => e.url === url);
      report += `${idx + 1}. **${endpoint.method}** ${url}\n`;
    });
    
    report += `\n## 🧩 Components\n\n`;
    const componentTypes = {};
    analysis.structure.components.forEach(comp => {
      componentTypes[comp.selector] = (componentTypes[comp.selector] || 0) + 1;
    });
    Object.entries(componentTypes).forEach(([type, count]) => {
      report += `- ${type}: ${count}\n`;
    });
    
    await fs.writeFile(
      path.join(outputDir, 'pm-structural-analysis.md'),
      report
    );
    
    console.log('\n✅ Analysis Complete!');
    console.log(`📁 Results saved to: ${outputDir}/`);
    console.log(`   - pm-structural-analysis.json (detailed data)`);
    console.log(`   - pm-structural-analysis.md (readable report)`);
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await browser.close();
  }
})();

