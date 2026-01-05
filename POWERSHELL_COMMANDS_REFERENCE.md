# PowerShell Commands Reference for PM Analysis

## 🔄 Unix to PowerShell Command Conversions

### Finding Patterns in Files

**Unix:**
```bash
grep -r "class Client\|interface Client" src/
```

**PowerShell:**
```powershell
Select-String -Path ".\src\*" -Pattern "class Client|interface Client" -Recurse
```

### Counting Matches

**Unix:**
```bash
grep -r "TaskStatus\|DeadlineType" src/ | wc -l
```

**PowerShell:**
```powershell
(Select-String -Path ".\src\*" -Pattern "TaskStatus|DeadlineType" -Recurse).Count
```

### Finding Files

**Unix:**
```bash
find . -name "*Test*" | wc -l
```

**PowerShell:**
```powershell
(Get-ChildItem -Path . -Filter "*Test*" -Recurse).Count
```

### Finding Events/Patterns

**Unix:**
```bash
grep -r "Event\|Message\|Saga\|IntegrationEvent" src/
```

**PowerShell:**
```powershell
Select-String -Path ".\src\*" -Pattern "Event|Message|Saga|IntegrationEvent" -Recurse
```

## 📋 Common PM Analysis Commands

### 1. Find All Client-Related Code
```powershell
Select-String -Path ".\tests\*.js", ".\utils\*.js", ".\*.js" -Pattern "Client|client" -CaseSensitive:$false
```

### 2. Find All Task-Related Code
```powershell
Select-String -Path ".\*.js" -Pattern "Task|task" -Recurse
```

### 3. Find All API Endpoints
```powershell
Select-String -Path ".\*.js" -Pattern "https?://|/api/|/rest/" -Recurse | Select-Object -ExpandProperty Line -Unique
```

### 4. Count Test Files
```powershell
(Get-ChildItem -Path ".\tests" -Filter "*Test*" -Recurse).Count
```

### 5. Find Component Definitions
```powershell
Select-String -Path ".\*.js" -Pattern "component|Component|COMPONENT" -Recurse
```

### 6. Find Event Handlers
```powershell
Select-String -Path ".\*.js" -Pattern "Event|Message|Saga|IntegrationEvent|on\(|emit\(" -Recurse
```

### 7. Find Data Models/Interfaces
```powershell
Select-String -Path ".\*.js" -Pattern "interface|type|class|model" -Recurse
```

### 8. Find Service Definitions
```powershell
Select-String -Path ".\*.js" -Pattern "service|Service|SERVICE|@Injectable" -Recurse
```

### 9. Find Workflow Definitions
```powershell
Select-String -Path ".\*.js" -Pattern "workflow|Workflow|WORKFLOW|process|Process" -Recurse
```

### 10. Find All Functions/Methods
```powershell
Select-String -Path ".\*.js" -Pattern "function\s+\w+|const\s+\w+\s*=\s*\(|async\s+\w+\s*\(" -Recurse
```

## 🔍 Advanced Analysis Commands

### Analyze File Structure
```powershell
Get-ChildItem -Path ".\tests" -Recurse -File | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
```

### Find Large Files
```powershell
Get-ChildItem -Path "." -Recurse -File | Where-Object { $_.Length -gt 10KB } | Sort-Object Length -Descending | Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}
```

### Count Lines of Code
```powershell
Get-ChildItem -Path ".\tests" -Filter "*.js" -Recurse | Get-Content | Measure-Object -Line
```

### Find Duplicate Code Patterns
```powershell
Select-String -Path ".\*.js" -Pattern "TODO|FIXME|HACK|XXX" -Recurse
```

### Find Import/Require Statements
```powershell
Select-String -Path ".\*.js" -Pattern "import|require|from" -Recurse
```

## 📊 Generate Statistics

### File Count by Type
```powershell
Get-ChildItem -Path "." -Recurse -File | Group-Object Extension | Sort-Object Count -Descending | Format-Table Name, Count
```

### Code Statistics
```powershell
$stats = @{
    TotalFiles = (Get-ChildItem -Path ".\tests" -Recurse -File).Count
    TotalLines = (Get-ChildItem -Path ".\tests" -Filter "*.js" -Recurse | Get-Content | Measure-Object -Line).Lines
    TotalTests = (Select-String -Path ".\tests\*.js" -Pattern "test\(" -Recurse).Count
}
$stats | Format-List
```

## 🎯 PM-Specific Analysis

### Find All PM Test Cases
```powershell
Select-String -Path ".\tests\pm*.js" -Pattern "test\(" | Select-Object -ExpandProperty Line
```

### Find PM Helper Functions
```powershell
Select-String -Path ".\utils\pm-*.js" -Pattern "static\s+\w+|function\s+\w+" | Select-Object -ExpandProperty Line
```

### Find PM API Calls
```powershell
Select-String -Path ".\*.js" -Pattern "Practice Management|practice.*management|moduleid=7" -CaseSensitive:$false
```

### Find PM Navigation Patterns
```powershell
Select-String -Path ".\*.js" -Pattern "navigateTo|goto|href.*practice" -CaseSensitive:$false
```

## 💡 Quick Analysis Script

Save this as `quick-analysis.ps1`:

```powershell
Write-Host "🔍 Quick PM Analysis" -ForegroundColor Cyan

# Client references
$clients = (Select-String -Path ".\*.js" -Pattern "Client|client" -Recurse).Count
Write-Host "Client references: $clients" -ForegroundColor Green

# Task references
$tasks = (Select-String -Path ".\*.js" -Pattern "Task|task" -Recurse).Count
Write-Host "Task references: $tasks" -ForegroundColor Green

# Deadline references
$deadlines = (Select-String -Path ".\*.js" -Pattern "Deadline|deadline" -Recurse).Count
Write-Host "Deadline references: $deadlines" -ForegroundColor Green

# API endpoints
$apis = (Select-String -Path ".\*.js" -Pattern "/api/|https?://" -Recurse).Count
Write-Host "API references: $apis" -ForegroundColor Green

# Test files
$testFiles = (Get-ChildItem -Path ".\tests" -Filter "*.js" -Recurse).Count
Write-Host "Test files: $testFiles" -ForegroundColor Green
```

Run with:
```powershell
.\quick-analysis.ps1
```

## 🚀 Using the Analysis Scripts

### Run JavaScript Analysis (Deep)
```bash
npm run analyze:pm
```

### Run PowerShell Analysis (Quick)
```bash
npm run analyze:pm:ps
```

Or:
```powershell
.\analyze-pm-structure.ps1
```

## 📝 Output Files

After running analysis:
- `out/pm-analysis/pm-structural-analysis.json` - Detailed runtime analysis
- `out/pm-analysis/pm-structural-analysis.md` - Human-readable report
- `out/pm-analysis/pm-structure-analysis-ps.json` - Code analysis
- `out/pm-analysis/pm-structure-analysis-ps.md` - Code report

---

**Note:** All PowerShell commands work in Windows PowerShell and PowerShell Core.

