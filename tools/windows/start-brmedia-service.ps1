param(
  [string]$ProjectRoot = "",
  [string]$TaskName = "BRMedia Centre Server",
  [int]$Port = 8787
)

$ErrorActionPreference = "Continue"

if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$StateDir = "C:\BRMedia"
$LogDir = Join-Path $StateDir "logs"
$HealthUrl = "http://localhost:$Port/health"

New-Item -ItemType Directory -Force -Path $StateDir, $LogDir | Out-Null

function Test-BRMediaHealth {
  try {
    Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 6 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Wait-BRMediaHealth {
  param([int]$Seconds = 45)

  for ($i = 1; $i -le $Seconds; $i++) {
    if (Test-BRMediaHealth) {
      Write-Host "BRMedia health OK: $HealthUrl"
      return $true
    }

    Start-Sleep -Seconds 1
  }

  return $false
}

if (Test-BRMediaHealth) {
  Write-Host "BRMedia already running and healthy: $HealthUrl"
  exit 0
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (!$task) {
  Write-Host "BRMedia Scheduled Task is not installed."
  Write-Host ""
  Write-Host "Run this once:"
  Write-Host 'powershell -NoProfile -ExecutionPolicy Bypass -File "tools\windows\install-brmedia-service.ps1" -ProjectRoot "C:\Users\Rosegrove Chippy\Documents\BRMedia-Centre"'
  exit 1
}

if ($task.State -eq "Running") {
  Write-Host "Existing BRMedia watchdog appears unhealthy. Restarting Scheduled Task..."
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

try {
  Start-ScheduledTask `
    -TaskName $TaskName `
    -ErrorAction Stop
} catch {
  Write-Host ""
  Write-Host "BRMedia Scheduled Task could not be started."
  Write-Host "Reason: $($_.Exception.Message)"
  Write-Host ""
  Write-Host "Run the installer again:"
  Write-Host 'powershell -NoProfile -ExecutionPolicy Bypass -File "tools\windows\install-brmedia-service.ps1" -ProjectRoot "C:\Users\Rosegrove Chippy\Documents\BRMedia-Centre"'
  exit 1
}

Write-Host "BRMedia Scheduled Task started. Waiting for health..."

if (Wait-BRMediaHealth -Seconds 45) {
  exit 0
}

Write-Host ""
Write-Host "BRMedia Scheduled Task did not pass its health check."
Write-Host "No temporary SSH-bound fallback was started."
Write-Host ""
Write-Host "Run this for diagnostics:"
Write-Host 'powershell -ExecutionPolicy Bypass -File "C:\BRMedia\status-brmedia.ps1"'
exit 1