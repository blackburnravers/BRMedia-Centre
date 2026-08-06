param([string]$ProjectRoot = "")
$ErrorActionPreference = "Stop"
if (!$ProjectRoot) { $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }
$scripts = @(
  "mixxx-startup.ps1",
  "install-mixxx-startup.ps1",
  "disable-mixxx-startup.ps1",
  "status-mixxx-startup.ps1"
)
foreach ($name in $scripts) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Join-Path $ProjectRoot "tools\windows\$name"),
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null
  if ($errors.Count) { throw "PowerShell parse failure in ${name}: $($errors[0].Message)" }
}

$installerSource = Get-Content (Join-Path $ProjectRoot "tools\windows\install-mixxx-startup.ps1") -Raw
if ($installerSource -notmatch "Get-CimInstance Win32_ComputerSystem") {
  throw "Installer does not discover the interactive console account."
}
if ($installerSource -notmatch 'Name -eq "explorer\.exe"') {
  throw "Installer does not verify the interactive desktop owner."
}
if ($installerSource -notmatch "New-ScheduledTaskPrincipal -UserId [`$]identity -LogonType Interactive -RunLevel Limited") {
  throw "Installer does not use the limited interactive-token principal."
}
if ($installerSource -match "Password|LogonType Password") {
  throw "Installer must not request or store a Windows password."
}
if ($installerSource -match '-Enabled\s+[`$]true') {
  throw "Installer passes an unbindable Boolean through powershell.exe -File."
}

$testRoot = Join-Path $env:TEMP "brmedia-m16-$PID"
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
$startup = Join-Path $ProjectRoot "tools\windows\mixxx-startup.ps1"
try {
  & $startup -Enabled:$false -DelaySeconds 0 -RetryCount 1 -StateDirectory $testRoot
  $disabled = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($disabled.state -ne "disabled") { throw "Disabled state was not recorded." }

  & $startup -Enabled:$true -DelaySeconds 0 -RetryCount 1 -StateDirectory $testRoot -Executable (Join-Path $testRoot "missing-mixxx.exe") -ProcessStateForTest stopped
  $missing = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($missing.state -ne "executable-missing") { throw "Missing executable state was not recorded." }

  & $startup -Enabled:$true -DelaySeconds 0 -RetryCount 1 -StateDirectory $testRoot -Executable "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLaunch -ProcessStateForTest stopped
  $suppressed = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($suppressed.state -ne "launch-failed") { throw "Suppressed launch state was not recorded." }

  & $startup -Enabled:$true -DelaySeconds 0 -RetryCount 2 -RetryDelaySeconds 1 -StateDirectory $testRoot -ProcessStateForTest running -BridgeStateForTest unhealthy
  $exhausted = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($exhausted.state -ne "process-running-bridge-unavailable" -or $exhausted.retryCount -ne 2) { throw "Bounded retry exhaustion was not recorded." }

  & $startup -Enabled:$true -DelaySeconds 0 -RetryCount 1 -StateDirectory $testRoot -ProcessStateForTest running -BridgeStateForTest healthy
  $healthy = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($healthy.state -ne "already-running") { throw "Healthy existing process was not recorded." }

  $testExecutable = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  & $startup -Enabled:$true -DelaySeconds 0 -RetryCount 3 -RetryDelaySeconds 1 -StateDirectory $testRoot -Executable $testExecutable -ProcessStateForTest stopped -LaunchStateForTest success -BridgeHealthyAfterAttemptForTest 2
  $delayedHealthy = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($delayedHealthy.state -ne "connected" -or $delayedHealthy.retryCount -ne 2) { throw "Delayed bridge health after successful launch was not recorded." }

  & $startup -Enabled:$true -DelaySeconds 0 -RetryCount 1 -StateDirectory $testRoot -Executable $testExecutable -ProcessStateForTest stopped -LaunchStateForTest failure
  $launchFailed = Get-Content (Join-Path $testRoot "mixxx-startup-status.json") -Raw | ConvertFrom-Json
  if ($launchFailed.state -ne "launch-failed") { throw "Launch failure was not recorded." }

  Write-Host "M16 PowerShell startup checks PASS"
  Write-Host "disabled, executable-missing, launch-suppressed, bounded-exhaustion, already-running, launch-success, delayed-health, launch-failure, syntax"
} finally {
  Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
