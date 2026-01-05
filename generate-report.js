const fs = require('fs-extra');
const path = require('path');

(async () => {
  console.log('📊 Generating UI/UX Issues Report...');
  
  const issues = [];
  
  // Load a11y violations
  try {
    const a11yViolations = await fs.readJson('./out/a11y_violations.json');
    if (Array.isArray(a11yViolations) && a11yViolations.length > 0) {
      // Group by rule
      const grouped = {};
      a11yViolations.forEach(v => {
        const rule = v.id || 'unknown';
        if (!grouped[rule]) {
          grouped[rule] = {
            rule,
            impact: v.impact,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            count: 0,
            urls: new Set()
          };
        }
        grouped[rule].count++;
        if (v.url) grouped[rule].urls.add(v.url);
      });
      
      Object.values(grouped).forEach(group => {
        issues.push({
          severity: group.impact === 'critical' || group.impact === 'serious' ? 'HIGH' : 'MEDIUM',
          category: 'Accessibility',
          type: 'WCAG Violation',
          description: group.description,
          rule: group.rule,
          help: group.help,
          helpUrl: group.helpUrl,
          affectedPages: Array.from(group.urls).slice(0, 5),
          count: group.count
        });
      });
    }
  } catch (e) {
    console.log('⚠️ Could not load a11y violations:', e.message);
  }
  
  // Load performance data
  try {
    const perfData = await fs.readJson('./out/perf_data.json');
    if (Array.isArray(perfData)) {
      perfData.forEach(perf => {
        if (perf.loadTime && perf.loadTime > 5000) {
          issues.push({
            severity: perf.loadTime > 10000 ? 'HIGH' : 'MEDIUM',
            category: 'Performance',
            type: 'Slow Page Load',
            description: `Page load time is ${(perf.loadTime / 1000).toFixed(2)}s, exceeding recommended 3s threshold`,
            url: perf.url,
            loadTime: perf.loadTime,
            recommendation: 'Optimize assets, reduce bundle size, implement lazy loading'
          });
        }
      });
    }
  } catch (e) {
    console.log('⚠️ Could not load performance data:', e.message);
  }
  
  // Generate markdown report
  let markdown = `# Capium Beta - UI/UX Issues Report\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- Total Issues: ${issues.length}\n`;
  markdown += `- High Severity: ${issues.filter(i => i.severity === 'HIGH').length}\n`;
  markdown += `- Medium Severity: ${issues.filter(i => i.severity === 'MEDIUM').length}\n\n`;
  
  // Group by category
  const byCategory = {};
  issues.forEach(issue => {
    if (!byCategory[issue.category]) {
      byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
  });
  
  Object.keys(byCategory).forEach(category => {
    markdown += `## ${category} Issues\n\n`;
    
    byCategory[category].forEach((issue, idx) => {
      markdown += `### ${idx + 1}. ${issue.type}\n\n`;
      markdown += `**Severity:** ${issue.severity}\n\n`;
      markdown += `**Description:** ${issue.description}\n\n`;
      
      if (issue.rule) {
        markdown += `**Rule:** ${issue.rule}\n\n`;
      }
      
      if (issue.help) {
        markdown += `**Help:** ${issue.help}\n\n`;
      }
      
      if (issue.helpUrl) {
        markdown += `**Reference:** ${issue.helpUrl}\n\n`;
      }
      
      if (issue.url) {
        markdown += `**Affected URL:** ${issue.url}\n\n`;
      }
      
      if (issue.affectedPages && issue.affectedPages.length > 0) {
        markdown += `**Affected Pages:**\n`;
        issue.affectedPages.forEach(url => {
          markdown += `- ${url}\n`;
        });
        markdown += `\n`;
      }
      
      if (issue.recommendation) {
        markdown += `**Recommendation:** ${issue.recommendation}\n\n`;
      }
      
      if (issue.count) {
        markdown += `**Occurrences:** ${issue.count}\n\n`;
      }
      
      markdown += `---\n\n`;
    });
  });
  
  // Save report
  await fs.writeFile('./out/uiux_issues.md', markdown);
  console.log('✅ Report generated: ./out/uiux_issues.md');
  
  // Also save as JSON
  await fs.writeJson('./out/uiux_issues.json', issues, { spaces: 2 });
  console.log('✅ JSON report generated: ./out/uiux_issues.json');
})();

