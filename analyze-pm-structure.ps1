# Practice Management Structural Analysis - PowerShell Script
# Analyzes PM module structure using PowerShell commands

Write-Host "Practice Management Structural Analysis" -ForegroundColor Cyan
Write-Host ""

# Set output directory
$outputDir = ".\out\pm-analysis"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# 1. Analyze JavaScript/TypeScript files for PM-related code
Write-Host "Analyzing source files..." -ForegroundColor Yellow

$pmAnalysis = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    module = "Practice Management"
    files = @()
    patterns = @{
        clients = @()
        tasks = @()
        deadlines = @()
        workflows = @()
        apiEndpoints = @()
    }
}

# Get all JS files
$jsFiles = @()
$jsFiles += Get-ChildItem -Path ".\tests" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue
$jsFiles += Get-ChildItem -Path ".\utils" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue
$jsFiles += Get-ChildItem -Path "." -Filter "*.js" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "node_modules\*" }

foreach ($file in $jsFiles) {
    if (Test-Path $file.FullName) {
        try {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                $pmAnalysis.files += @{
                    path = $file.FullName
                    size = $file.Length
                    lines = (Get-Content $file.FullName).Count
                }
                
                # Find Client-related patterns
                if ($content -match "Client|client") {
                    if ($file.FullName -notin $pmAnalysis.patterns.clients) {
                        $pmAnalysis.patterns.clients += $file.FullName
                    }
                }
                
                # Find Task-related patterns
                if ($content -match "Task|task") {
                    if ($file.FullName -notin $pmAnalysis.patterns.tasks) {
                        $pmAnalysis.patterns.tasks += $file.FullName
                    }
                }
                
                # Find Deadline-related patterns
                if ($content -match "Deadline|deadline") {
                    if ($file.FullName -notin $pmAnalysis.patterns.deadlines) {
                        $pmAnalysis.patterns.deadlines += $file.FullName
                    }
                }
                
                # Find Workflow-related patterns
                if ($content -match "Workflow|workflow") {
                    if ($file.FullName -notin $pmAnalysis.patterns.workflows) {
                        $pmAnalysis.patterns.workflows += $file.FullName
                    }
                }
                
                # Find API endpoints - simpler pattern
                $apiMatches = Select-String -InputObject $content -Pattern "https?://|/api/" -AllMatches
                if ($apiMatches) {
                    foreach ($match in $apiMatches.Matches) {
                        $value = $match.Value
                        if ($value -and $value -notin $pmAnalysis.patterns.apiEndpoints) {
                            $pmAnalysis.patterns.apiEndpoints += $value
                        }
                    }
                }
            }
        } catch {
            Write-Host "  Warning: Could not analyze $($file.Name)" -ForegroundColor Yellow
        }
    }
}

# 2. Analyze test files structure
Write-Host "Analyzing test structure..." -ForegroundColor Yellow

$testFiles = Get-ChildItem -Path ".\tests" -Filter "*.spec.js" -Recurse -ErrorAction SilentlyContinue
$testAnalysis = @{
    totalTests = 0
    testSuites = @()
}

foreach ($testFile in $testFiles) {
    try {
        $content = Get-Content $testFile.FullName -Raw -ErrorAction SilentlyContinue
        if ($content) {
            # Count test patterns
            $testCount = (Select-String -InputObject $content -Pattern "test\(" -AllMatches).Matches.Count
            $itCount = (Select-String -InputObject $content -Pattern "it\(" -AllMatches).Matches.Count
            $totalCount = $testCount + $itCount
            
            # Extract test names
            $testNames = @()
            $testLines = Select-String -Path $testFile.FullName -Pattern "test\(|it\(" | Select-Object -ExpandProperty Line
            foreach ($line in $testLines) {
                if ($line -match "test\(['`"]([^'`"]+)['`"]") {
                    $testNames += $matches[1]
                }
                if ($line -match "it\(['`"]([^'`"]+)['`"]") {
                    $testNames += $matches[1]
                }
            }
            
            $testAnalysis.testSuites += @{
                file = $testFile.Name
                tests = $totalCount
                testNames = $testNames
            }
            $testAnalysis.totalTests += $totalCount
        }
    } catch {
        Write-Host "  Warning: Could not analyze $($testFile.Name)" -ForegroundColor Yellow
    }
}

# 3. Analyze helper utilities
Write-Host "Analyzing helper utilities..." -ForegroundColor Yellow

$utils = Get-ChildItem -Path ".\utils" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue
$utilsAnalysis = @{
    files = @()
    functions = @()
}

foreach ($util in $utils) {
    try {
        $content = Get-Content $util.FullName -Raw -ErrorAction SilentlyContinue
        if ($content) {
            # Find function definitions
            $functionMatches = Select-String -InputObject $content -Pattern "function\s+\w+|const\s+\w+\s*=|static\s+\w+\s*\(" -AllMatches
            
            $functions = @()
            foreach ($match in $functionMatches.Matches) {
                $funcName = $match.Value
                if ($funcName -match "function\s+(\w+)|const\s+(\w+)|static\s+(\w+)") {
                    $name = if ($matches[1]) { $matches[1] } elseif ($matches[2]) { $matches[2] } else { $matches[3] }
                    if ($name -and $name -notin $functions) {
                        $functions += $name
                        $utilsAnalysis.functions += $name
                    }
                }
            }
            
            $utilsAnalysis.files += @{
                name = $util.Name
                functions = $functions
            }
        }
    } catch {
        Write-Host "  Warning: Could not analyze $($util.Name)" -ForegroundColor Yellow
    }
}

# 4. Generate comprehensive report
Write-Host "Generating report..." -ForegroundColor Yellow

$report = @"
# Practice Management Structural Analysis Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Overview

- **Total Source Files Analyzed:** $($pmAnalysis.files.Count)
- **Total Test Files:** $($testFiles.Count)
- **Total Tests:** $($testAnalysis.totalTests)
- **Helper Utilities:** $($utils.Count)

## File Structure

### Source Files
$($pmAnalysis.files | ForEach-Object { "- $($_.path) ($($_.lines) lines)" } | Out-String)

### Test Files
$($testAnalysis.testSuites | ForEach-Object { "- $($_.file): $($_.tests) tests" } | Out-String)

### Helper Utilities
$($utilsAnalysis.files | ForEach-Object { "- $($_.name): $($_.functions.Count) functions" } | Out-String)

## Pattern Analysis

### Client Management
- Files containing "Client": $($pmAnalysis.patterns.clients.Count)
$($pmAnalysis.patterns.clients | ForEach-Object { "  - $_" } | Out-String)

### Task Management
- Files containing "Task": $($pmAnalysis.patterns.tasks.Count)
$($pmAnalysis.patterns.tasks | ForEach-Object { "  - $_" } | Out-String)

### Deadline Management
- Files containing "Deadline": $($pmAnalysis.patterns.deadlines.Count)
$($pmAnalysis.patterns.deadlines | ForEach-Object { "  - $_" } | Out-String)

### Workflow Management
- Files containing "Workflow": $($pmAnalysis.patterns.workflows.Count)
$($pmAnalysis.patterns.workflows | ForEach-Object { "  - $_" } | Out-String)

## API Endpoints Found

$($pmAnalysis.patterns.apiEndpoints | ForEach-Object { "- $_" } | Out-String)

## Test Coverage

$($testAnalysis.testSuites | ForEach-Object { 
    "### $($_.file)`n"
    "Tests: $($_.tests)`n"
    if ($_.testNames.Count -gt 0) {
        $_.testNames | ForEach-Object { "- $_" }
    }
    "`n"
} | Out-String)

## Helper Functions

$($utilsAnalysis.functions | Sort-Object -Unique | ForEach-Object { "- $_" } | Out-String)

"@

# Save reports
$report | Out-File -FilePath "$outputDir\pm-structure-analysis-ps.md" -Encoding UTF8

$pmAnalysis | ConvertTo-Json -Depth 10 | Out-File -FilePath "$outputDir\pm-structure-analysis-ps.json" -Encoding UTF8

Write-Host ""
Write-Host "Analysis Complete!" -ForegroundColor Green
Write-Host "Results saved to: $outputDir\" -ForegroundColor Cyan
Write-Host "   - pm-structure-analysis-ps.md" -ForegroundColor Gray
Write-Host "   - pm-structure-analysis-ps.json" -ForegroundColor Gray
