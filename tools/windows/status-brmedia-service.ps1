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
$PidFile = Join-Path $StateDir "brmedia-server.pid"
$RunnerPidFile = Join-Path $StateDir "brmedia-runner.pid"
$RunnerHeartbeatFile = Join-Path $StateDir "runner-heartbeat.json"
$LogDir = Join-Path $StateDir "logs"
$ServerCrashLog = Join-Path $ProjectRoot "server\data\server-crashes.log"

function Test-Url {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    Write-Host "$Name OK: $Url"
    Write-Host "HTTP: $($res.StatusCode)  Bytes: $($res.RawContentLength)"
    return $true
  } catch {
    Write-Host "$Name NOT responding: $Url"
    Write-Host "Reason: $($_.Exception.Message)"
    return $false
  }
}

function Show-LatestLogTail {
  param(
    [string]$Pattern,
    [string]$Title,
    [int]$Tail = 50
  )

  if (!(Test-Path $LogDir)) { return }

  $log =
    Get-ChildItem $LogDir -File -Filter $Pattern -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

  if (!$log) { return }

  Write-Host ""
  Write-Host $Title
  Write-Host $log.FullName
  Write-Host "----------------------------"
  Get-Content $log.FullName -Tail $Tail -ErrorAction SilentlyContinue
}

function Show-PidState {
  param(
    [string]$Label,
    [string]$Path
  )

  if (!(Test-Path $Path)) {
    Write-Host "$Label PID: none"
    return
  }

  $pidValue =
    Get-Content $Path -ErrorAction SilentlyContinue |
      Select-Object -First 1

  Write-Host "$Label PID: $pidValue"

  if ($pidValue -match "^\d+$") {
    $proc =
      Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue

    if ($proc) {
      Write-Host "$Label PID process: running"
    } else {
      Write-Host "$Label PID process: not running"
    }
  }
}

function Get-TaskResultLabel {
  param([int64]$Code)

  switch ($Code) {
    0       { return "completed successfully" }
    267008  { return "ready" }
    267009  { return "currently running" }
    267010  { return "disabled" }
    267011  { return "has not yet run" }
    267012  { return "no more scheduled runs" }
    267013  { return "one or more properties are invalid" }
    267014  { return "terminated by user" }
    default { return "see Task Scheduler history" }
  }
}

Write-Host ""
Write-Host "BRMedia Centre Server Status"
Write-Host "----------------------------"
Write-Host "Project: $ProjectRoot"
Write-Host "Port: $Port"

$task =
  Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($task) {
  Write-Host "Scheduled task: $($task.State)"

  $taskInfo =
    Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue

  if ($taskInfo) {
    $resultCode =
      [int64]$taskInfo.LastTaskResult

    $resultHex =
      "0x{0:X8}" -f ([uint32]$resultCode)

    Write-Host "Last task run: $($taskInfo.LastRunTime)"
    Write-Host "Last task result: $resultCode ($resultHex)"
    Write-Host "Task result meaning: $(Get-TaskResultLabel -Code $resultCode)"
  }

  foreach ($action in $task.Actions) {
    Write-Host "Task action: $($action.Execute)"
    Write-Host "Task arguments: $($action.Arguments)"
  }

  Write-Host "Task restart count: $($task.Settings.RestartCount)"
  Write-Host "Task restart interval: $($task.Settings.RestartInterval)"
  Write-Host "Task execution time limit: $($task.Settings.ExecutionTimeLimit)"
} else {
  Write-Host "Scheduled task: not installed"
}

Write-Host ""
Show-PidState -Label "Runner" -Path $RunnerPidFile
Show-PidState -Label "Server" -Path $PidFile

if (Test-Path $RunnerHeartbeatFile) {
  try {
    $heartbeat =
      Get-Content $RunnerHeartbeatFile -Raw -ErrorAction Stop |
        ConvertFrom-Json

    $heartbeatAt =
      [datetime]$heartbeat.at

    $heartbeatAge =
      [math]::Round(
        ((Get-Date) - $heartbeatAt).TotalSeconds,
        1
      )

    Write-Host "Runner heartbeat: $($heartbeat.at)"
    Write-Host "Runner heartbeat age: $heartbeatAge seconds"
    Write-Host "Runner heartbeat state: $($heartbeat.state)"
    Write-Host "Runner heartbeat server PID: $($heartbeat.serverPid)"
    Write-Host "Runner missed health checks: $($heartbeat.missedHealthChecks)"

    if ($heartbeat.detail) {
      Write-Host "Runner heartbeat detail: $($heartbeat.detail)"
    }
  } catch {
    Write-Host "Runner heartbeat: unreadable"
  }
} else {
  Write-Host "Runner heartbeat: none"
}

$runnerProcesses =
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -like "*brmedia-runner.ps1*" -or
      $_.CommandLine -like "*server/src/index.ts*" -or
      $_.CommandLine -like "*server\src\index.ts*"
    }

Write-Host "Runner/server processes: $($runnerProcesses.Count)"

foreach ($proc in $runnerProcesses | Select-Object -First 8) {
  Write-Host "- PID $($proc.ProcessId) $($proc.Name)"
}

Write-Host ""
Test-Url -Name "Health" -Url "http://localhost:$Port/health" | Out-Null
Test-Url -Name "Video page" -Url "http://localhost:$Port/video-player" | Out-Null

if (Test-Path $LogDir) {
  $latestLogs =
    Get-ChildItem $LogDir -File |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 8

  Write-Host ""
  Write-Host "Latest logs:"

  foreach ($log in $latestLogs) {
    Write-Host ("- {0}" -f $log.FullName)
  }

  Show-LatestLogTail -Pattern "runner.log" -Title "Latest runner log" -Tail 45
  Show-LatestLogTail -Pattern "*error*.log" -Title "Latest server error log" -Tail 80
  Show-LatestLogTail -Pattern "server-*.log" -Title "Latest server output log" -Tail 45
}

if (Test-Path $ServerCrashLog) {
  Write-Host ""
  Write-Host "Latest in-app crash log"
  Write-Host $ServerCrashLog
  Write-Host "----------------------------"
  Get-Content $ServerCrashLog -Tail 60 -ErrorAction SilentlyContinue
}

Write-Host ""