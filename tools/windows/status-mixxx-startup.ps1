param([string]$TaskName = "BRMedia Mixxx Startup", [int]$Port = 8787)
$ErrorActionPreference = "Continue"
Write-Host "BRMedia Mixxx Startup Status"
Write-Host "----------------------------"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Write-Host "Scheduled task: $(if ($task) { $task.State } else { 'not installed' })"
if ($task) {
  Write-Host "Multiple instances: $($task.Settings.MultipleInstances)"
  Write-Host "Restart count: $($task.Settings.RestartCount)"
  Write-Host "Logon type: $($task.Principal.LogonType)"
  $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($taskInfo) {
    $neverRun = $taskInfo.LastTaskResult -eq 267011
    Write-Host "Operator state: $(if ($task.State -eq 'Disabled') { 'disabled' } elseif ($task.State -eq 'Running') { 'running' } elseif ($task.State -eq 'Ready' -and $neverRun) { 'waiting for logon' } else { 'ready' })"
    Write-Host "Last run: $(if ($neverRun) { 'never' } else { $taskInfo.LastRunTime.ToString('o') })"
    Write-Host "Last result: $($taskInfo.LastTaskResult)"
    Write-Host "Last outcome: $(if ($neverRun) { 'never-run' } elseif ($taskInfo.LastTaskResult -eq 0) { 'succeeded' } elseif ($task.State -eq 'Running') { 'running' } else { 'failed' })"
  }
}
$statusPath = "C:\BRMedia\mixxx-startup-status.json"
if (Test-Path $statusPath) {
  try {
    $status = Get-Content $statusPath -Raw | ConvertFrom-Json
    Write-Host "Final state: $($status.state)"
    Write-Host "Updated: $($status.updatedAt)"
    Write-Host "Run ID: $($status.runId)"
    Write-Host "Trigger observed: $($status.triggerObservedAt)"
    Write-Host "Delay elapsed: $($status.delayElapsedAt)"
    Write-Host "Startup action: $($status.action)"
    Write-Host "Retries: $($status.retryCount)"
    Write-Host "Process running: $($status.processRunning)"
    Write-Host "Bridge healthy: $($status.bridgeHealthy)"
    Write-Host "Executable: $($status.executable)"
  } catch { Write-Host "Status file: unreadable" }
} else { Write-Host "Final state: unknown (not run yet)" }
$process = Get-Process -Name mixxx -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "Mixxx process: $(if ($process) { "running (PID $($process.Id))" } else { 'not running' })"
try {
  $bridge = Invoke-RestMethod "http://localhost:$Port/api/dj/mixxx/status" -TimeoutSec 3
  Write-Host "Bridge connected: $($bridge.bridge.connected)"
  Write-Host "Protocol connected: $($bridge.bridge.readiness.protocolConnected)"
  Write-Host "Heartbeat recent: $($bridge.bridge.readiness.heartbeatRecent)"
  Write-Host "Bridge stale: $($bridge.bridge.readiness.stale)"
  Write-Host "Backend usable: $($bridge.bridge.readiness.backendUsable)"
  Write-Host "Effective backend: $($bridge.bridge.effectiveBackend)"
} catch { Write-Host "Bridge status: unavailable" }
Write-Host "Log: C:\BRMedia\logs\mixxx-startup.log"
