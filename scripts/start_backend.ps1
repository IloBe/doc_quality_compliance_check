param(
    [string]$BindHost = "127.0.0.1",
    [int]$Port = 8000,
    [switch]$Reload
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    throw "Python executable not found at $pythonExe. Create/activate the project .venv first."
}

function Test-BackendHealth {
    param(
        [string]$TargetHost,
        [int]$TargetPort
    )

    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri "http://$TargetHost`:$TargetPort/health" -TimeoutSec 3
        return ($resp.StatusCode -eq 200)
    } catch {
        return $false
    }
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $healthy = Test-BackendHealth -TargetHost $BindHost -TargetPort $Port
    if ($healthy) {
        Write-Output "Backend already running and healthy on http://$BindHost`:$Port (PID: $($listener.OwningProcess))."
        exit 0
    }

    Write-Warning "Port $Port is in use by PID $($listener.OwningProcess), but /health is not responding."
    Write-Warning "Stop the process or choose another port, then re-run this script."
    exit 1
}

Set-Location $repoRoot

$args = @(
    "-m", "uvicorn",
    "src.doc_quality.api.main:app",
    "--host", $BindHost,
    "--port", "$Port"
)

if ($Reload.IsPresent) {
    $args += @("--reload", "--reload-dir", (Join-Path $repoRoot "src"))
}

Write-Output "Starting backend on http://$BindHost`:$Port ..."
& $pythonExe @args
