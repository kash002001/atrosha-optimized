Write-Host "🛡️ Launching Atrosha Proxy..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."

# 1. Run Cleanup (Non-blocking for this script itself)
Write-Host "   -> Ensuring clean environment..." -ForegroundColor DarkGray
.\Atrosha\cleanup_test.ps1 > $null 2>&1

# 2. Setup Isolated Build Env
$env:CARGO_TARGET_DIR = "$env:TEMP\atrosha_build"
Set-Location "Atrosha\proxy"

# 3. Run Proxy
Write-Host "   -> Compiling in isolated shim ($env:TEMP\atrosha_build)..." -ForegroundColor Yellow
Write-Host "   -> Please WAIT until you see 'Listening on 0.0.0.0:8000'" -ForegroundColor White
$env:RUST_LOG="info,atrosha_proxy=debug"
cargo run
