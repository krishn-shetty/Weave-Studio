# Launches the unified local Banking AI Agent and Weave Studio environment.
# Orchestrates mock Banking Gateway and Weave Studio frontend on http://localhost:5173/banking.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-banking-rehearsal.ps1
# Or simply: npm run dev:banking

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
node scripts/dev-banking.mjs
