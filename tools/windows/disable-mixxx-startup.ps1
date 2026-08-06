param([string]$TaskName = "BRMedia Mixxx Startup", [switch]$Uninstall)
$ErrorActionPreference = "Continue"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  if ($Uninstall) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
  else { Disable-ScheduledTask -TaskName $TaskName | Out-Null }
}
New-Item -ItemType Directory -Force -Path "C:\BRMedia" | Out-Null
[ordered]@{ state = "disabled"; updatedAt = (Get-Date).ToString("o"); retryCount = 0; processRunning = $null; bridgeHealthy = $null; executable = $null } |
  ConvertTo-Json | Set-Content "C:\BRMedia\mixxx-startup-status.json" -Encoding UTF8
Write-Host $(if ($Uninstall) { "Mixxx startup task removed. Running Mixxx was left untouched." } else { "Mixxx automatic startup disabled. Running Mixxx was left untouched." })
