Write-Host "🤖 Launching Atrosha Test Agent..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."
python Atrosha/sdk/example_agent.py
