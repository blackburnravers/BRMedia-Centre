param(
  [string]$ProjectRoot = "",
  [int]$Port = 8787,
  [int]$RestartDelaySeconds = 8,
  [int]$HealthIntervalSeconds = 15,
  [int]$HealthTimeoutSeconds = 8,
  [int]$StartupGraceSeconds = 90,
  [int]$MaxMissedHealthChecks = 12
)

$ErrorActionPreference = "Continue"

if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$StateDir = "C:\BRMedia"
$LogDir = Join-Path $StateDir "logs"
$PidFile = Join-Path $StateDir "brmedia-server.pid"
$RunnerPidFile = Join-Path $StateDir "brmedia-runner.pid"
$RunnerHeartbeatFile = Join-Path $StateDir "runner-heartbeat.json"
$RunnerLog = Join-Path $LogDir "runner.log"
$HealthUrl = "http://localhost:$Port/health"

New-Item -ItemType Directory -Force -Path $StateDir, $LogDir | Out-Null

function Write-RunnerLog {
  param([string]$Message)

  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $RunnerLog -Value $line
}

function Write-RunnerHeartbeat {
  param(
    [string]$State = "running",
    [int]$ServerPid = 0,
    [int]$MissedHealth = 0,
    [string]$Detail = ""
  )

  try {
    $payload = [ordered]@{
      at = (Get-Date).ToString("o")
      runnerPid = $PID
      serverPid = $ServerPid
      state = $State
      missedHealthChecks = $MissedHealth
      healthUrl = $HealthUrl
      detail = $Detail
    }

    $payload |
      ConvertTo-Json -Compress |
      Set-Content -Path $RunnerHeartbeatFile -Encoding UTF8
  } catch {}
}

function Clear-OldBRMediaLogs {
  try {
    Get-ChildItem $LogDir -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and
        $_.Name -ne "runner.log"
      } |
      Remove-Item -Force -ErrorAction SilentlyContinue

    $serverLogs = Get-ChildItem $LogDir -File -Filter "server-*.log" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -Skip 80

    $serverErrorLogs = Get-ChildItem $LogDir -File -Filter "server-*-error.log" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -Skip 80

    $serverLogs + $serverErrorLogs |
      Where-Object { $_ } |
      Remove-Item -Force -ErrorAction SilentlyContinue
  } catch {
    Write-RunnerLog "Log cleanup warning: $($_.Exception.Message)"
  }
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Global\BRMediaCentreRunner", [ref]$createdNew)

if (-not $createdNew) {
  Write-RunnerLog "Another BRMedia runner is already active. Exiting this duplicate runner."
  exit 0
}

function Test-BRMediaHealth {
  try {
    $res = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec $HealthTimeoutSeconds
    return ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Stop-StaleBRMediaServerProcesses {
  try {
    if (Test-Path $PidFile) {
      $pidValue = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($pidValue -match "^\d+$") {
        $proc = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
        if ($proc) {
          Write-RunnerLog "Stopping stale saved server PID=$pidValue before clean start."
          Stop-Process -Id ([int]$pidValue) -Force -ErrorAction SilentlyContinue
        }
      }
      Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
    }
  } catch {
    Write-RunnerLog "Stale process cleanup warning: $($_.Exception.Message)"
  }
}

Set-Location $ProjectRoot

$env:PORT = [string]$Port
$env:BRMEDIA_BACKGROUND = "1"
$env:BRMEDIA_STARTUP_AUTO_IMPORT = "0"
$env:NODE_ENV = "production"

if (-not $env:NODE_OPTIONS) {
  $env:NODE_OPTIONS = "--max-old-space-size=4096"
}

Set-Content -Path $RunnerPidFile -Value $PID -Encoding ASCII

Write-RunnerHeartbeat `
  -State "runner-started" `
  -ServerPid 0 `
  -MissedHealth 0

Write-RunnerLog "BRMedia runner started. RunnerPID=$PID ProjectRoot=$ProjectRoot Port=$Port HealthInterval=$HealthIntervalSeconds Timeout=$HealthTimeoutSeconds Misses=$MaxMissedHealthChecks StartupGrace=$StartupGraceSeconds"

$script:LastQbitEnsureAt = [datetime]::MinValue

function Find-QBittorrentExe {
  $candidates = @(
    $env:QBITTORRENT_EXE,
    "C:\Program Files\qBittorrent\qbittorrent.exe",
    "C:\Program Files (x86)\qBittorrent\qbittorrent.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\qBittorrent\qbittorrent.exe")
  ) | Where-Object { $_ -and $_.Trim() }

  foreach ($candidate in $candidates) {
    try {
      if (Test-Path $candidate) {
        return (Resolve-Path $candidate).Path
      }
    } catch {}
  }

  return ""
}

function Ensure-QBittorrentRunning {
  param([int]$ThrottleSeconds = 120)

  try {
    if (((Get-Date) - $script:LastQbitEnsureAt).TotalSeconds -lt $ThrottleSeconds) {
      return
    }

    $script:LastQbitEnsureAt = Get-Date

    $existing = Get-Process -Name "qbittorrent" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing) {
      return
    }

    $exe = Find-QBittorrentExe
    if (-not $exe) {
      Write-RunnerLog "qBittorrent.exe not found. Install qBittorrent or set QBITTORRENT_EXE to its full path."
      return
    }

    Write-RunnerLog "qBittorrent is not running. Starting: $exe"
    Start-Process -FilePath $exe -WindowStyle Minimized -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 4
  } catch {
    Write-RunnerLog "qBittorrent auto-start warning: $($_.Exception.Message)"
  }
}

while ($true) {
  try {
    Clear-OldBRMediaLogs
    Ensure-QBittorrentRunning

    $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $node) {
      Write-RunnerLog "node.exe was not found on PATH. Waiting 30 seconds."
      Start-Sleep -Seconds 30
      continue
    }

    if (Test-BRMediaHealth) {
      Write-RunnerHeartbeat `
        -State "existing-server-healthy" `
        -ServerPid 0 `
        -MissedHealth 0

      Write-RunnerLog "BRMedia already healthy on $HealthUrl. Not starting a duplicate server."
      Start-Sleep -Seconds $HealthIntervalSeconds
      continue
    }

    Stop-StaleBRMediaServerProcesses

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $stdoutLog = Join-Path $LogDir "server-$stamp.log"
    $stderrLog = Join-Path $LogDir "server-$stamp-error.log"

    Write-RunnerLog "Starting BRMedia server with node. Logs: $stdoutLog / $stderrLog"

    $process = Start-Process `
      -FilePath $node `
      -ArgumentList @("-r", "ts-node/register", "server/src/index.ts") `
      -WorkingDirectory $ProjectRoot `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog `
      -WindowStyle Hidden `
      -PassThru

    Set-Content -Path $PidFile -Value $process.Id -Encoding ASCII

    Write-RunnerHeartbeat `
      -State "server-started" `
      -ServerPid $process.Id `
      -MissedHealth 0

    Write-RunnerLog "BRMedia server started. PID=$($process.Id)"

    $missedHealth = 0
    $startedAt = Get-Date

    while (-not $process.HasExited) {
      Start-Sleep -Seconds $HealthIntervalSeconds

      $uptimeSeconds = ((Get-Date) - $startedAt).TotalSeconds
      if ($uptimeSeconds -lt $StartupGraceSeconds) {
        if (Test-BRMediaHealth) {
          $missedHealth = 0

          Write-RunnerHeartbeat `
            -State "startup-healthy" `
            -ServerPid $process.Id `
            -MissedHealth 0

          Write-RunnerLog "Startup health OK for PID=$($process.Id)."
        } else {
          Write-RunnerHeartbeat `
            -State "startup-waiting" `
            -ServerPid $process.Id `
            -MissedHealth $missedHealth
        }

        continue
      }

      if (Test-BRMediaHealth) {
        if ($missedHealth -gt 0) {
          Write-RunnerLog "Health recovered for PID=$($process.Id) after $missedHealth missed checks."
        }

        $missedHealth = 0

        Write-RunnerHeartbeat `
          -State "healthy" `
          -ServerPid $process.Id `
          -MissedHealth 0
      } else {
        $missedHealth++

        Write-RunnerHeartbeat `
          -State "health-missed" `
          -ServerPid $process.Id `
          -MissedHealth $missedHealth

        Write-RunnerLog "Health check failed $missedHealth/$MaxMissedHealthChecks for PID=$($process.Id)."

        if ($missedHealth -ge $MaxMissedHealthChecks) {
          Write-RunnerLog "Health failed $MaxMissedHealthChecks times. Killing stuck BRMedia server PID=$($process.Id)."
          Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
          break
        }
      }
    }

    $exitCode = $process.ExitCode
    Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue

    Write-RunnerHeartbeat `
      -State "server-stopped" `
      -ServerPid 0 `
      -MissedHealth $missedHealth `
      -Detail "ExitCode=$exitCode"

    Write-RunnerLog "BRMedia server stopped. ExitCode=$exitCode. Restarting in $RestartDelaySeconds seconds."
    Start-Sleep -Seconds $RestartDelaySeconds
  } catch {
    Write-RunnerHeartbeat `
      -State "runner-error" `
      -ServerPid 0 `
      -Detail $_.Exception.Message

    Write-RunnerLog "Runner error: $($_.Exception.Message). Restarting in 10 seconds."
    Start-Sleep -Seconds 10
  }
}