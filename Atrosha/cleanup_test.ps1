Write-Host "🧹 Atrosha Test CLEANUP Utility 🧹" -ForegroundColor Cyan
Write-Host "Killing processes... (this may take a few seconds)" -ForegroundColor Yellow

# Kill all potential lock holders
$processes = @("atrosha-proxy", "cargo", "rustc", "link", "rust-analyzer", "rls", "code")
foreach ($proc in $processes) {
    Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

Write-Host "Cleaning OLD build artifacts (if possible)..." -ForegroundColor Yellow

# Clean Proxy target (Optional - ignore errors)
$proxyTarget = ".\Atrosha\proxy\target"
if (Test-Path $proxyTarget) {
    Try {
        Remove-Item -Path $proxyTarget -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Removed $proxyTarget" -ForegroundColor Green
    } Catch {
        Write-Host "⚠️ Old target locked (ignoring). Using new temp dir anyway." -ForegroundColor Yellow
    }
}

# Clean Temp Build Dir
$tempBuild = "$env:TEMP\atrosha_build"
if (Test-Path $tempBuild) {
    Try {
        Remove-Item -Path $tempBuild -Recurse -Force -ErrorAction SilentlyContinue 
        Write-Host "✅ Removed temp build: $tempBuild" -ForegroundColor Green
    } Catch {
        Write-Host "⚠️ Temp build locked? Using anyway." -ForegroundColor Yellow
    }
}


# Clean __pycache__
Get-ChildItem -Path "." -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✨ Cleanup Complete! You are ready to test." -ForegroundColor Cyan
