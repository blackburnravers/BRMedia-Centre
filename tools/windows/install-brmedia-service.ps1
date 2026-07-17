param(
  [string]$ProjectRoot = "",
  [string]$TaskName = "BRMedia Centre Server",
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$WindowsTools = Join-Path $ProjectRoot "tools\windows"
$Runner = Join-Path $WindowsTools "brmedia-runner.ps1"

$StateDir = "C:\BRMedia"
$LogDir = Join-Path $StateDir "logs"
$ManualLauncher = Join-Path $StateDir "run-brmedia-task.cmd"

New-Item -ItemType Directory -Force -Path $StateDir, $LogDir | Out-Null

if (!(Test-Path $Runner)) {
  throw "Missing runner file: $Runner"
}

function Write-Wrapper {
  param(
    [string]$Path,
    [string]$ToolName
  )

  $toolPath = Join-Path $WindowsTools $ToolName

  @"
param(
  [int]`$Port = $Port
)

& "$toolPath" -ProjectRoot "$ProjectRoot" -Port `$Port
"@ | Set-Content -Path $Path -Encoding UTF8
}

Write-Wrapper -Path (Join-Path $StateDir "start-brmedia.ps1") -ToolName "start-brmedia-service.ps1"
Write-Wrapper -Path (Join-Path $StateDir "stop-brmedia.ps1") -ToolName "stop-brmedia-service.ps1"
Write-Wrapper -Path (Join-Path $StateDir "restart-brmedia.ps1") -ToolName "restart-brmedia-service.ps1"
Write-Wrapper -Path (Join-Path $StateDir "status-brmedia.ps1") -ToolName "status-brmedia-service.ps1"

@"
@echo off
cd /d "$ProjectRoot"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$Runner" -ProjectRoot "$ProjectRoot" -Port $Port
"@ | Set-Content -Path $ManualLauncher -Encoding ASCII

$currentIdentity =
  [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$currentIdentity =
  [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$taskUser =
  if (
    $currentIdentity -and
    $currentIdentity -notmatch "^WORKGROUP\\"
  ) {
    $currentIdentity
  } else {
    "$env:COMPUTERNAME\$env:USERNAME"
  }

$powerShellExe =
  Join-Path `
    $env:SystemRoot `
    "System32\WindowsPowerShell\v1.0\powershell.exe"

$actionArguments =
  "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`" -ProjectRoot `"$ProjectRoot`" -Port $Port"

$action =
  New-ScheduledTaskAction `
    -Execute $powerShellExe `
    -Argument $actionArguments `
    -WorkingDirectory $ProjectRoot

$trigger =
  New-ScheduledTaskTrigger `
    -AtLogOn `
    -User $taskUser

$settings =
  New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew `
    -WakeToRun

$principal =
  New-ScheduledTaskPrincipal `
    -UserId $taskUser `
    -LogonType S4U `
    -RunLevel Limited

Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue |
  Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force |
  Out-Null

Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop

$heartbeatPath =
  Join-Path $StateDir "runner-heartbeat.json"

Write-Host ""
Write-Host "Waiting for BRMedia watchdog heartbeat..."

$heartbeatFound =
  $false

for (
  $attempt = 1;
  $attempt -le 15;
  $attempt++
) {
  if (
    Test-Path $heartbeatPath
  ) {
    $heartbeatFound =
      $true

    break
  }

  Start-Sleep -Seconds 1
}

$taskState =
  (
    Get-ScheduledTask `
      -TaskName $TaskName `
      -ErrorAction SilentlyContinue
  ).State

$taskInfo =
  Get-ScheduledTaskInfo `
    -TaskName $TaskName `
    -ErrorAction SilentlyContinue

Write-Host "Task state: $taskState"

if ($taskInfo) {
  Write-Host "Last task result: $($taskInfo.LastTaskResult)"
}

if ($heartbeatFound) {
  Write-Host "Watchdog heartbeat created successfully:"
  Write-Host $heartbeatPath
} else {
  Write-Warning "The Scheduled Task registered but no watchdog heartbeat appeared."
  Write-Warning "Run C:\BRMedia\status-brmedia.ps1 and send the output."
}

Write-Host ""
Write-Host "BRMedia independent background watchdog installed and started."
Write-Host ""
Write-Host "Task:"
Write-Host $TaskName
Write-Host ""
Write-Host "User:"
Write-Host $taskUser
Write-Host ""
Write-Host "Restart command:"
Write-Host 'powershell -ExecutionPolicy Bypass -File "C:\BRMedia\restart-brmedia.ps1"'
Write-Host ""
Write-Host "Status command:"
Write-Host 'powershell -ExecutionPolicy Bypass -File "C:\BRMedia\status-brmedia.ps1"'
Write-Host ""
Write-Host "Logs:"
Write-Host $LogDir
Write-Host ""