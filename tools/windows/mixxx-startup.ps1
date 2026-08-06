param(
  [bool]$Enabled = $true,
  [int]$DelaySeconds = 12,
  [int]$RetryCount = 12,
  [int]$RetryDelaySeconds = 3,
  [int]$Port = 8787,
  [string]$Executable = "",
  [string]$StateDirectory = "C:\BRMedia",
  [switch]$NoLaunch,
  [ValidateSet("auto", "running", "stopped")]
  [string]$ProcessStateForTest = "auto",
  [ValidateSet("auto", "healthy", "unhealthy")]
  [string]$BridgeStateForTest = "auto",
  [ValidateSet("auto", "success", "failure")]
  [string]$LaunchStateForTest = "auto",
  [int]$BridgeHealthyAfterAttemptForTest = 0
)

$ErrorActionPreference = "Stop"
$DelaySeconds = [math]::Max(0, [math]::Min(120, $DelaySeconds))
$RetryCount = [math]::Max(1, [math]::Min(60, $RetryCount))
$RetryDelaySeconds = [math]::Max(1, [math]::Min(30, $RetryDelaySeconds))
$LogDirectory = Join-Path $StateDirectory "logs"
$LogPath = Join-Path $LogDirectory "mixxx-startup.log"
$StatusPath = Join-Path $StateDirectory "mixxx-startup-status.json"
$BridgeUrl = "http://localhost:$Port/api/dj/mixxx/status"
$RunId = [guid]::NewGuid().ToString("n")
$TriggerObservedAt = (Get-Date).ToString("o")
$DelayElapsedAt = $null
$script:HealthAttempt = 0
$script:SimulatedProcessRunning = $false
New-Item -ItemType Directory -Force -Path $StateDirectory, $LogDirectory | Out-Null

function Write-MixxxLog([string]$Message) {
  if ((Test-Path $LogPath) -and (Get-Item $LogPath).Length -gt 524288) {
    $tail = Get-Content $LogPath -Tail 1000
    Set-Content -Path $LogPath -Encoding UTF8 -Value $tail
  }
  Add-Content -Path $LogPath -Encoding UTF8 -Value "[$((Get-Date).ToString('o'))] $Message"
}
function Write-MixxxState(
  [string]$State,
  [int]$Retries,
  [Nullable[bool]]$ProcessRunning,
  [Nullable[bool]]$BridgeHealthy,
  [string]$ResolvedExecutable = "",
  [string]$Action = "none"
) {
  [ordered]@{
    state = $State
    updatedAt = (Get-Date).ToString("o")
    runId = $RunId
    triggerObservedAt = $TriggerObservedAt
    delayElapsedAt = $DelayElapsedAt
    action = $Action
    retryCount = $Retries
    processRunning = $ProcessRunning
    bridgeHealthy = $BridgeHealthy
    executable = if ($ResolvedExecutable) { Split-Path $ResolvedExecutable -Leaf } else { $null }
  } | ConvertTo-Json | Set-Content -Path $StatusPath -Encoding UTF8
  Write-MixxxLog "runId=$RunId finalState=$State action=$Action retryCount=$Retries processRunning=$ProcessRunning bridgeHealthy=$BridgeHealthy executable=$(if ($ResolvedExecutable) { Split-Path $ResolvedExecutable -Leaf } else { 'none' })"
}
function Test-MixxxProcess {
  if ($script:SimulatedProcessRunning) { return $true }
  if ($ProcessStateForTest -eq "running") { return $true }
  if ($ProcessStateForTest -eq "stopped") { return $false }
  return $null -ne (Get-Process -Name "mixxx" -ErrorAction SilentlyContinue | Select-Object -First 1)
}
function Test-MixxxBridge {
  $script:HealthAttempt += 1
  if ($BridgeHealthyAfterAttemptForTest -gt 0) {
    return $script:HealthAttempt -ge $BridgeHealthyAfterAttemptForTest
  }
  if ($BridgeStateForTest -eq "healthy") { return $true }
  if ($BridgeStateForTest -eq "unhealthy") { return $false }
  try {
    $response = Invoke-RestMethod -Uri $BridgeUrl -TimeoutSec 3
    return $response.bridge.connected -eq $true `
      -and $response.bridge.inputAvailable -eq $true `
      -and $response.bridge.outputAvailable -eq $true `
      -and $response.bridge.protocolCompatible -eq $true `
      -and $response.bridge.heartbeatHealthy -eq $true
  } catch { return $false }
}
function Find-MixxxExecutable {
  if ($Executable) {
    if (Test-Path -LiteralPath $Executable -PathType Leaf) {
      return (Resolve-Path -LiteralPath $Executable).Path
    }
    return $null
  }
  if ($env:BRMEDIA_MIXXX_EXE) {
    if (Test-Path -LiteralPath $env:BRMEDIA_MIXXX_EXE -PathType Leaf) {
      return (Resolve-Path -LiteralPath $env:BRMEDIA_MIXXX_EXE).Path
    }
    return $null
  }
  $registryKeys = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\mixxx.exe",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\mixxx.exe"
  )
  foreach ($key in $registryKeys) {
    try {
      $candidate = (Get-ItemProperty -LiteralPath $key -ErrorAction Stop)."(default)"
      if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
    } catch {}
  }
  $candidates = @(
    (Join-Path $env:ProgramFiles "Mixxx\mixxx.exe"),
    $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} "Mixxx\mixxx.exe" }),
    $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Programs\Mixxx\mixxx.exe" })
  ) | Where-Object { $_ }
  return $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
}

if (!$Enabled) {
  Write-MixxxState "disabled" 0 (Test-MixxxProcess) $false "" "disabled"
  exit 0
}

Write-MixxxLog "runId=$RunId triggerObservedAt=$TriggerObservedAt startup requested delaySeconds=$DelaySeconds retryLimit=$RetryCount retryDelaySeconds=$RetryDelaySeconds"
if ($DelaySeconds -gt 0) { Start-Sleep -Seconds $DelaySeconds }
$DelayElapsedAt = (Get-Date).ToString("o")
Write-MixxxLog "runId=$RunId delay elapsed delaySeconds=$DelaySeconds"

if (Test-MixxxProcess) {
  Write-MixxxLog "process already running; no launch attempted"
  if (Test-MixxxBridge) { Write-MixxxState "already-running" 0 $true $true "" "process-already-running"; exit 0 }
  for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
    if (Test-MixxxBridge) { Write-MixxxState "already-running" $attempt $true $true "" "process-already-running"; exit 0 }
    if ($attempt -lt $RetryCount) { Start-Sleep -Seconds $RetryDelaySeconds }
  }
  Write-MixxxState "process-running-bridge-unavailable" $RetryCount $true $false "" "process-already-running"
  exit 0
}

$resolved = Find-MixxxExecutable
if (!$resolved) {
  Write-MixxxState "executable-missing" 0 $false $false "" "executable-missing"
  exit 0
}
if ($NoLaunch) {
  Write-MixxxLog "launch suppressed by NoLaunch; executable=$(Split-Path $resolved -Leaf)"
  Write-MixxxState "launch-failed" 0 $false $false $resolved "launch-suppressed"
  exit 0
}

Write-MixxxLog "launching executable=$(Split-Path $resolved -Leaf)"
Write-MixxxState "starting" 0 $false $false $resolved "launch-attempted"
try {
  if ($LaunchStateForTest -eq "failure") { throw [System.InvalidOperationException]::new("Simulated launch failure") }
  if ($LaunchStateForTest -eq "success") {
    $script:SimulatedProcessRunning = $true
    Write-MixxxLog "process launch simulated for deterministic check"
  } else {
    $process = Start-Process -FilePath $resolved -PassThru -ErrorAction Stop
    Write-MixxxLog "process launch returned pid=$($process.Id)"
  }
} catch {
  Write-MixxxLog "launch failed type=$($_.Exception.GetType().Name)"
  Write-MixxxState "launch-failed" 0 $false $false $resolved "launch-failed"
  exit 0
}

for ($attempt = 1; $attempt -le $RetryCount; $attempt++) {
  $running = Test-MixxxProcess
  $healthy = if ($running) { Test-MixxxBridge } else { $false }
  Write-MixxxLog "healthAttempt=$attempt processRunning=$running bridgeHealthy=$healthy"
  if ($healthy) { Write-MixxxState "connected" $attempt $true $true $resolved "process-launched"; exit 0 }
  if (!$running) { Write-MixxxState "launch-failed" $attempt $false $false $resolved "launch-failed"; exit 0 }
  if ($attempt -lt $RetryCount) { Start-Sleep -Seconds $RetryDelaySeconds }
}
Write-MixxxState "process-running-bridge-unavailable" $RetryCount $true $false $resolved "process-launched"
exit 0
