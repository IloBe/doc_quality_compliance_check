param(
    [int]$Port = 3000,
    [switch]$Production
)

$ErrorActionPreference = "Stop"

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    throw "Frontend directory not found at $frontendDir. Run this script from the project root."
}

function Test-FrontendHealth {
    param([int]$TargetPort)
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$TargetPort/" -TimeoutSec 3
        return ($resp.StatusCode -lt 500)
    } catch {
        return $false
    }
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $healthy = Test-FrontendHealth -TargetPort $Port
    if ($healthy) {
        Write-Output "Frontend already running and healthy on http://localhost:$Port (PID: $($listener.OwningProcess))."
        exit 0
    }
    Write-Warning "Port $Port is in use by PID $($listener.OwningProcess), but is not responding."
    Write-Warning "Stop the process or choose another port, then re-run this script."
    exit 1
}

Set-Location $frontendDir

if ($Production.IsPresent) {
    Write-Output "Building production bundle..."
    & npm run build
    Write-Output "Starting production server on http://localhost:$Port ..."
    & npm start -- --port $Port
} else {
    Write-Output "Starting frontend dev server on http://localhost:$Port ..."
    & npm run dev -- --port $Port
}
