# 🔍 Practice Management Structural Analysis Guide

## Overview

This guide helps you understand the core implementations and structural analysis of the Practice Management (PM) module.

## 🎯 What This Analysis Does

1. **Route Analysis**: Discovers all URLs and navigation paths
2. **Component Analysis**: Identifies UI components and their structure
3. **API Endpoint Discovery**: Monitors and catalogs all API calls
4. **Data Model Analysis**: Extracts form fields, table structures, and data models
5. **Navigation Mapping**: Maps the complete navigation structure
6. **Technology Stack Detection**: Identifies frameworks and libraries used
7. **Workflow Discovery**: Finds business processes and workflows

## 🚀 How to Run Analysis

### Option 1: JavaScript Analysis (Recommended)
This performs deep analysis by interacting with the live application:

```bash
npm run analyze:pm
```

**What it does:**
- Navigates to Practice Management
- Analyzes DOM structure
- Monitors API calls in real-time
- Discovers components, routes, and data models
- Generates comprehensive reports

**Output:**
- `out/pm-analysis/pm-structural-analysis.json` - Detailed structured data
- `out/pm-analysis/pm-structural-analysis.md` - Human-readable report

### Option 2: PowerShell Analysis (Quick)
This analyzes the codebase files:

```bash
npm run analyze:pm:ps
```

Or directly:
```powershell
powershell -ExecutionPolicy Bypass -File analyze-pm-structure.ps1
```

**What it does:**
- Analyzes source code files
- Finds patterns (Client, Task, Deadline, etc.)
- Extracts API endpoints from code
- Analyzes test structure
- Maps helper functions

**Output:**
- `out/pm-analysis/pm-structure-analysis-ps.json` - Structured data
- `out/pm-analysis/pm-structure-analysis-ps.md` - Report

## 📊 Understanding the Analysis Results

### 1. Routes Structure
Shows all URLs and navigation paths:
```json
{
  "path": "https://appv4.beta.capium.co.uk/#/home/new-dashboard",
  "type": "main",
  "hash": "/home/new-dashboard"
}
```

### 2. Components
Identifies UI components:
- Angular components (`[ng-controller]`, `[ng-component]`)
- React components (`[data-reactroot]`)
- Vue components (`[data-v-]`)
- Custom components (`[data-component]`)

### 3. API Endpoints
Lists all API calls made:
- REST endpoints (`/api/...`)
- GraphQL endpoints
- Request methods (GET, POST, PUT, DELETE)
- Request/response data

### 4. Data Models
Extracts data structures from:
- Forms (input fields, validation rules)
- Tables (column headers, data types)
- Data structures

### 5. Navigation Structure
Maps the complete navigation:
- Main sections
- Sub-sections
- Workflows
- User flows

## 🔧 PowerShell Commands Reference

Since you're on Windows, here are PowerShell equivalents for common analysis commands:

### Find files containing "Client"
```powershell
Select-String -Path ".\tests\*.js", ".\utils\*.js" -Pattern "Client" -CaseSensitive
```

### Count occurrences
```powershell
(Select-String -Path ".\tests\*.js" -Pattern "Client").Count
```

### Find all test files
```powershell
Get-ChildItem -Path ".\tests" -Filter "*Test*" -Recurse | Measure-Object | Select-Object -ExpandProperty Count
```

### Find API endpoints
```powershell
Select-String -Path ".\*.js" -Pattern "https?://|/api/" | Select-Object -ExpandProperty Line -Unique
```

### Find component patterns
```powershell
Select-String -Path ".\*.js" -Pattern "component|Component|COMPONENT"
```

### Find event handlers
```powershell
Select-String -Path ".\*.js" -Pattern "Event|Message|Saga|IntegrationEvent"
```

## 📋 Analysis Checklist

Use this checklist to ensure comprehensive analysis:

- [ ] Routes and URLs discovered
- [ ] Components identified
- [ ] API endpoints cataloged
- [ ] Data models extracted
- [ ] Navigation structure mapped
- [ ] Workflows identified
- [ ] Technology stack detected
- [ ] Integration points found
- [ ] Event handlers discovered
- [ ] Service patterns identified

## 🎯 Key Areas to Analyze

### 1. Client Management
- Client CRUD operations
- Client data model
- Client-related APIs
- Client workflows

### 2. Task Management
- Task creation/editing
- Task status workflows
- Task assignment logic
- Task dependencies

### 3. Deadline Management
- Deadline tracking
- Deadline types
- Deadline notifications
- Deadline workflows

### 4. Staff Management
- Staff assignment
- Role-based access
- Permission models

### 5. Workflow Engine
- Workflow definitions
- Workflow execution
- State machines
- Event handling

## 📁 Output Files

After running analysis, you'll find:

```
out/pm-analysis/
├── pm-structural-analysis.json      # Detailed JSON data
├── pm-structural-analysis.md         # Human-readable report
├── pm-structure-analysis-ps.json     # PowerShell analysis (JSON)
└── pm-structure-analysis-ps.md       # PowerShell analysis (Markdown)
```

## 🔍 Deep Dive Analysis

### Understanding Component Hierarchy
1. Run the JavaScript analysis
2. Check `components` array in JSON
3. Look for parent-child relationships
4. Map component dependencies

### Understanding Data Flow
1. Monitor API calls during analysis
2. Trace data from forms to APIs
3. Map response handling
4. Identify data transformations

### Understanding Navigation Flow
1. Review `navigation` section
2. Map user journeys
3. Identify workflow steps
4. Document state transitions

## 💡 Tips

1. **Run both analyses** for complete picture:
   - JavaScript analysis for runtime behavior
   - PowerShell analysis for code structure

2. **Compare results** to find:
   - Discrepancies between code and runtime
   - Missing implementations
   - Unused code

3. **Use the reports** to:
   - Document architecture
   - Plan refactoring
   - Identify dependencies
   - Map integrations

## 🚨 Troubleshooting

### Issue: "storageState.json not found"
**Solution:** Run `npm run auth` first

### Issue: PowerShell script execution blocked
**Solution:** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Issue: No API calls detected
**Solution:** 
- Ensure you're logged in
- Navigate through different sections
- Wait for page to fully load

## 📚 Next Steps

After analysis:
1. Review the generated reports
2. Map the architecture diagram
3. Document findings
4. Identify areas for improvement
5. Plan testing strategy

---

**Happy Analyzing! 🔍**

