param(
  [string]$ProjectRoot = "",
  [string]$TaskName = "BRMedia Mixxx Startup",
  [int]$DelaySeconds = 12,
  [int]$RetryCount = 12,
  [int]$RetryDelaySeconds = 3,
  [int]$Port = 8787,
  [string]$Executable = "",
  [switch]$Disabled
)
$ErrorActionPreference = "Stop"
if (!$ProjectRoot) { $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$launcher = Join-Path $ProjectRoot "tools\windows\mixxx-startup.ps1"
if (!(Test-Path $launcher)) { throw "Missing Mixxx startup script." }

# Mixxx must run in the real interactive desktop/audio session, which may differ
# from the terminal or service account invoking this idempotent installer.
$identity = (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName
if (!$identity) { throw "No active interactive Windows desktop account was found." }
$explorerOwners = @(
  Get-CimInstance Win32_Process -ErrorAction Stop |
    Where-Object { $_.Name -eq "explorer.exe" } |
    ForEach-Object {
      $owner = Invoke-CimMethod -InputObject $_ -MethodName GetOwner -ErrorAction Stop
      if ($owner.ReturnValue -eq 0) { "$($owner.Domain)\$($owner.User)" }
    }
) | Select-Object -Unique
if ($identity -notin $explorerOwners) {
  throw "The console account does not own an explorer.exe desktop session; task registration was not changed."
}

$powerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$escapedExecutable = $Executable.Replace('"', '""')
# Enabled defaults to true in the launcher. Do not pass a Boolean through
# powershell.exe -File: Windows PowerShell treats it as a literal string and
# fails parameter binding before the launcher can create its log/status files.
$arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -DelaySeconds $DelaySeconds -RetryCount $RetryCount -RetryDelaySeconds $RetryDelaySeconds -Port $Port"
if ($escapedExecutable) { $arguments += " -Executable `"$escapedExecutable`"" }
$action = New-ScheduledTaskAction -Execute $powerShell -Argument $arguments -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
if ($Disabled) { Disable-ScheduledTask -TaskName $TaskName | Out-Null }
$statusPath = "C:\BRMedia\mixxx-startup-status.json"
if (!$Disabled -and (Test-Path $statusPath)) {
  try {
    $status = Get-Content $statusPath -Raw | ConvertFrom-Json
    if ($status.state -eq "disabled") {
      [ordered]@{ state = "unknown"; updatedAt = (Get-Date).ToString("o"); retryCount = 0; processRunning = $null; bridgeHealthy = $null; executable = $null } |
        ConvertTo-Json | Set-Content $statusPath -Encoding UTF8
    }
  } catch {}
}
Write-Host "Mixxx startup task registered idempotently: $TaskName"
Write-Host "Interactive desktop account: $identity"
Write-Host "State: $(if ($Disabled) { 'Disabled' } else { 'Ready for next interactive logon' })"
Write-Host "The task is not started by this installer and does not restart Mixxx."
Write-Host "Interactive logon is required because Mixxx is a desktop audio application."
