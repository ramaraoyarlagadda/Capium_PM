/**
 * Practice Management Test Reporter
 * Generates comprehensive reports from test results
 */

const fs = require('fs-extra');
const path = require('path');

class PMReporter {
  /**
   * Generate comprehensive test report
   */
  static async generateReport(testResults, page) {
    const reportDir = './out/pm-reports';
    await fs.ensureDir(reportDir);
    
    // Generate JSON report
    await this.generateJSONReport(testResults, reportDir);
    
    // Generate Markdown report
    await this.generateMarkdownReport(testResults, reportDir);
    
    // Generate HTML report
    await this.generateHTMLReport(testResults, reportDir);
    
    // Generate summary
    await this.generateSummary(testResults, reportDir);
    
    console.log(`\n📊 Reports generated in ${reportDir}/`);
  }

  /**
   * Generate JSON report
   */
  static async generateJSONReport(testResults, reportDir) {
    const jsonReport = {
      summary: this.calculateSummary(testResults),
      testResults: testResults.tests,
      features: testResults.features,
      issues: testResults.issues,
      coverage: testResults.coverage,
      metadata: {
        startTime: testResults.startTime,
        endTime: testResults.endTime,
        duration: testResults.duration,
        testPrefix: testResults.testPrefix
      }
    };
    
    await fs.writeJson(
      path.join(reportDir, 'pm-test-results.json'),
      jsonReport,
      { spaces: 2 }
    );
  }

  /**
   * Generate Markdown report
   */
  static async generateMarkdownReport(testResults, reportDir) {
    const summary = this.calculateSummary(testResults);
    
    let markdown = `# Practice Management Comprehensive Test Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Test Prefix:** ${testResults.testPrefix}\n\n`;
    
    // Summary
    markdown += `## 📊 Test Summary\n\n`;
    markdown += `| Metric | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Tests | ${summary.total} |\n`;
    markdown += `| Passed | ${summary.passed} |\n`;
    markdown += `| Failed | ${summary.failed} |\n`;
    markdown += `| Skipped | ${summary.skipped} |\n`;
    markdown += `| Pass Rate | ${summary.passRate}% |\n`;
    markdown += `| Duration | ${this.formatDuration(testResults.duration)} |\n\n`;
    
    // Coverage
    markdown += `## ✅ Feature Coverage\n\n`;
    const coverageItems = Object.entries(testResults.coverage);
    coverageItems.forEach(([feature, covered]) => {
      markdown += `- ${feature.charAt(0).toUpperCase() + feature.slice(1)}: ${covered ? '✅' : '❌'}\n`;
    });
    markdown += `\n`;
    
    // Features Discovered
    if (testResults.features.length > 0) {
      markdown += `## 🔍 Features Discovered\n\n`;
      markdown += `Total: ${testResults.features.length}\n\n`;
      testResults.features.forEach((feature, idx) => {
        markdown += `${idx + 1}. **${feature.name}** (${feature.type})\n`;
        if (feature.pages && feature.pages.length > 0) {
          markdown += `   - Pages: ${feature.pages.length}\n`;
        }
      });
      markdown += `\n`;
    }
    
    // Test Results
    markdown += `## 🧪 Test Results\n\n`;
    testResults.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      markdown += `### ${status} ${test.name}\n\n`;
      markdown += `- **Status:** ${test.passed ? 'PASSED' : 'FAILED'}\n`;
      markdown += `- **Duration:** ${this.formatDuration(test.duration)}ms\n`;
      markdown += `- **Timestamp:** ${test.timestamp}\n`;
      if (test.error) {
        markdown += `- **Error:** ${test.error}\n`;
      }
      if (test.details) {
        markdown += `- **Details:**\n`;
        markdown += `  \`\`\`json\n${JSON.stringify(test.details, null, 2)}\n  \`\`\`\n`;
      }
      markdown += `\n`;
    });
    
    // Issues
    if (testResults.issues.length > 0) {
      markdown += `## 🚨 Issues Found\n\n`;
      testResults.issues.forEach((issue, idx) => {
        markdown += `### Issue ${idx + 1}: ${issue.type}\n\n`;
        markdown += `- **Severity:** ${issue.severity}\n`;
        markdown += `- **Test:** ${issue.test}\n`;
        if (issue.count) {
          markdown += `- **Count:** ${issue.count}\n`;
        }
        if (issue.violations) {
          markdown += `- **Violations:** ${issue.violations.length}\n`;
        }
        markdown += `\n`;
      });
    }
    
    // Recommendations
    markdown += `## 💡 Recommendations\n\n`;
    const recommendations = this.generateRecommendations(testResults);
    recommendations.forEach(rec => {
      markdown += `- ${rec}\n`;
    });
    
    await fs.writeFile(
      path.join(reportDir, 'pm-test-report.md'),
      markdown
    );
  }

  /**
   * Generate HTML report
   */
  static async generateHTMLReport(testResults, reportDir) {
    const summary = this.calculateSummary(testResults);
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Practice Management Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .test { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
    .test.passed { border-color: #4caf50; }
    .test.failed { border-color: #f44336; }
    .coverage { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .coverage-item { padding: 10px; background: #e3f2fd; border-radius: 3px; }
    .coverage-item.covered { background: #c8e6c9; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4caf50; color: white; }
  </style>
</head>
<body>
  <h1>Practice Management Comprehensive Test Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Test Prefix:</strong> ${testResults.testPrefix}</p>
  
  <div class="summary">
    <h2>Test Summary</h2>
    <table>
      <tr><th>Metric</th><th>Count</th></tr>
      <tr><td>Total Tests</td><td>${summary.total}</td></tr>
      <tr><td>Passed</td><td>${summary.passed}</td></tr>
      <tr><td>Failed</td><td>${summary.failed}</td></tr>
      <tr><td>Pass Rate</td><td>${summary.passRate}%</td></tr>
      <tr><td>Duration</td><td>${this.formatDuration(testResults.duration)}</td></tr>
    </table>
  </div>
  
  <h2>Feature Coverage</h2>
  <div class="coverage">
`;
    
    Object.entries(testResults.coverage).forEach(([feature, covered]) => {
      html += `    <div class="coverage-item ${covered ? 'covered' : ''}">
      <strong>${feature.charAt(0).toUpperCase() + feature.slice(1)}</strong><br>
      ${covered ? '✅ Covered' : '❌ Not Covered'}
    </div>\n`;
    });
    
    html += `  </div>
  
  <h2>Test Results</h2>
`;
    
    testResults.tests.forEach(test => {
      html += `  <div class="test ${test.passed ? 'passed' : 'failed'}">
    <h3>${test.passed ? '✅' : '❌'} ${test.name}</h3>
    <p><strong>Status:</strong> ${test.passed ? 'PASSED' : 'FAILED'}</p>
    <p><strong>Duration:</strong> ${this.formatDuration(test.duration)}ms</p>
    ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
  </div>\n`;
    });
    
    html += `</body>
</html>`;
    
    await fs.writeFile(
      path.join(reportDir, 'pm-test-report.html'),
      html
    );
  }

  /**
   * Generate summary
   */
  static async generateSummary(testResults, reportDir) {
    const summary = this.calculateSummary(testResults);
    
    const summaryText = `
PRACTICE MANAGEMENT TEST SUMMARY
================================

Generated: ${new Date().toLocaleString()}
Test Prefix: ${testResults.testPrefix}

TEST RESULTS:
- Total Tests: ${summary.total}
- Passed: ${summary.passed}
- Failed: ${summary.failed}
- Skipped: ${summary.skipped}
- Pass Rate: ${summary.passRate}%

FEATURE COVERAGE:
${Object.entries(testResults.coverage).map(([f, c]) => `- ${f}: ${c ? '✅' : '❌'}`).join('\n')}

FEATURES DISCOVERED: ${testResults.features.length}
ISSUES FOUND: ${testResults.issues.length}
DURATION: ${this.formatDuration(testResults.duration)}
`;
    
    await fs.writeFile(
      path.join(reportDir, 'summary.txt'),
      summaryText
    );
  }

  /**
   * Calculate summary statistics
   */
  static calculateSummary(testResults) {
    const total = testResults.tests.length;
    const passed = testResults.tests.filter(t => t.passed).length;
    const failed = testResults.tests.filter(t => !t.passed).length;
    const skipped = testResults.tests.filter(t => t.skipped).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    return { total, passed, failed, skipped, passRate };
  }

  /**
   * Format duration
   */
  static formatDuration(ms) {
    if (!ms) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generate recommendations
   */
  static generateRecommendations(testResults) {
    const recommendations = [];
    
    // Coverage recommendations
    const uncoveredFeatures = Object.entries(testResults.coverage)
      .filter(([_, covered]) => !covered)
      .map(([feature, _]) => feature);
    
    if (uncoveredFeatures.length > 0) {
      recommendations.push(`Add tests for uncovered features: ${uncoveredFeatures.join(', ')}`);
    }
    
    // Issue recommendations
    if (testResults.issues.length > 0) {
      const a11yIssues = testResults.issues.filter(i => i.type === 'accessibility');
      const perfIssues = testResults.issues.filter(i => i.type === 'performance');
      
      if (a11yIssues.length > 0) {
        recommendations.push(`Fix ${a11yIssues.length} accessibility violations`);
      }
      if (perfIssues.length > 0) {
        recommendations.push(`Address ${perfIssues.length} performance issues`);
      }
    }
    
    // Feature discovery recommendations
    if (testResults.features.length === 0) {
      recommendations.push('Feature discovery did not find any features - check navigation selectors');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passed! Great job!');
    }
    
    return recommendations;
  }
}

module.exports = PMReporter;

