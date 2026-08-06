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
$SidecarPidFile = Join-Path $ProjectRoot "tools\webrtc-sidecar\run\sidecar.pid"
$SidecarApp = Join-Path $ProjectRoot "tools\webrtc-sidecar\app.cjs"

# Stop only the exact repository-local sidecar child recorded by BRMedia.
if (Test-Path $SidecarPidFile) {
  $sidecarPidValue = Get-Content $SidecarPidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($sidecarPidValue -match "^\d+$") {
    $sidecarProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $sidecarPidValue" -ErrorAction SilentlyContinue
    if ($sidecarProcess -and $sidecarProcess.Name -eq "node.exe" -and $sidecarProcess.CommandLine -like "*$SidecarApp*") {
      Stop-Process -Id ([int]$sidecarPidValue) -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item $SidecarPidFile -Force -ErrorAction SilentlyContinue
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

if (Test-Path $PidFile) {
  $pidValue = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidValue -match "^\d+$") {
    Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    (
      $_.Name -match "^(node|node.exe|npm|npm.cmd|ts-node|ts-node.cmd|powershell|powershell.exe|pwsh|pwsh.exe)$"
    ) -and (
      $_.CommandLine -like "*brmedia-runner.ps1*" -or
      $_.CommandLine -like "*server/src/index.ts*" -or
      $_.CommandLine -like "*server\src\index.ts*" -or
      (
        $_.CommandLine -like "*BRMedia-Centre*" -and
        $_.CommandLine -like "*ts-node*"
      )
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host "BRMedia server stopped."
