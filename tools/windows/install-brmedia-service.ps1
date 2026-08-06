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

# The watchdog must follow the real automatically logged-on desktop account,
# not the terminal/service account that happens to run this installer.
$taskUser =
  (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName

if (!$taskUser) {
  throw "No active interactive Windows desktop account was found."
}

$explorerOwners =
  @(
    Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        $_.Name -eq "explorer.exe"
      } |
      ForEach-Object {
        $owner =
          Invoke-CimMethod `
            -InputObject $_ `
            -MethodName GetOwner `
            -ErrorAction Stop

        if ($owner.ReturnValue -eq 0) {
          "$($owner.Domain)\$($owner.User)"
        }
      }
  ) |
    Select-Object -Unique

if ($taskUser -notin $explorerOwners) {
  throw "The console account does not own an explorer.exe desktop session; task registration was not changed."
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
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force |
  Out-Null

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

Write-Host ""
Write-Host "BRMedia independent background watchdog registered idempotently."
Write-Host "The task was not started by this installer."
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
