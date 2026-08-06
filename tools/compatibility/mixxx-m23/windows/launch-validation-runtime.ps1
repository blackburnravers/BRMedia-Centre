param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")),
    [string]$RuntimePath = "C:\BRMediaMixxxCompatibility\mixxx.exe",
    [string]$CompatibilityProfile = "C:\BRMediaMixxxCompatibilityProfile"
)

$ErrorActionPreference = "Stop"

if (Get-Process -Name mixxx -ErrorAction SilentlyContinue) {
    throw "A Mixxx process is already running. Exactly one Mixxx runtime is allowed."
}
if (-not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) {
    throw "The staged compatibility executable is missing: $RuntimePath"
}
if (-not (Test-Path -LiteralPath $CompatibilityProfile -PathType Container)) {
    throw "Run backup-before-validation.ps1 first; the compatibility profile is missing."
}

$expectedRuntimeHash = "1e33e64b181f654a664fc950b59b817ac3facb76a788033846b78de8e9c3a397"
$actualRuntimeHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $RuntimePath).Hash.ToLowerInvariant()
if ($actualRuntimeHash -ne $expectedRuntimeHash) {
    throw "The staged Mixxx executable hash does not match the pinned compatibility manifest."
}

$mappingXml = Join-Path $RepositoryRoot "tools\mixxx\BRMedia-Mixxx-M7-Live-Engine.midi.xml"
$mappingJs = Join-Path $RepositoryRoot "tools\mixxx\BRMedia-Mixxx-M7-Live-Engine-scripts.js"
$controllers = Join-Path $CompatibilityProfile "controllers"
New-Item -ItemType Directory -Path $controllers -Force | Out-Null
Copy-Item -LiteralPath $mappingXml, $mappingJs -Destination $controllers -Force

$launchStartedAt = Get-Date
$interactiveExplorer = Get-Process -Name explorer -ErrorAction Stop |
    Where-Object { $_.SessionId -gt 0 } |
    Select-Object -First 1
$currentSession = (Get-Process -Id $PID).SessionId
$temporaryTaskName = "BRMedia M23 Compatibility Validation Launcher"

if ($currentSession -eq $interactiveExplorer.SessionId) {
    $process = Start-Process -FilePath $RuntimePath -ArgumentList @("--settings-path", $CompatibilityProfile) -PassThru
} else {
    $explorerProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($interactiveExplorer.Id)"
    $owner = Invoke-CimMethod -InputObject $explorerProcess -MethodName GetOwner
    $interactiveUser = "$($owner.Domain)\$($owner.User)"
    $action = New-ScheduledTaskAction -Execute $RuntimePath -Argument "--settings-path $CompatibilityProfile"
    $principal = New-ScheduledTaskPrincipal -UserId $interactiveUser -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 12) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $temporaryTaskName -Action $action -Principal $principal -Settings $settings -Force | Out-Null
    try {
        Start-ScheduledTask -TaskName $temporaryTaskName
        $process = $null
        for ($attempt = 0; $attempt -lt 30 -and -not $process; $attempt += 1) {
            Start-Sleep -Milliseconds 500
            $process = Get-Process -Name mixxx -ErrorAction SilentlyContinue |
                Where-Object { $_.SessionId -eq $interactiveExplorer.SessionId -and $_.StartTime -ge $launchStartedAt } |
                Select-Object -First 1
        }
        if (-not $process) {
            throw "Compatibility Mixxx did not start in the interactive Windows session."
        }
    } finally {
        Unregister-ScheduledTask -TaskName $temporaryTaskName -Confirm:$false -ErrorAction SilentlyContinue
    }
}

for ($attempt = 0; $attempt -lt 90 -and $process.MainWindowHandle -eq 0; $attempt += 1) {
    Start-Sleep -Seconds 1
    $process.Refresh()
    if ($process.HasExited) {
        throw "Compatibility Mixxx exited before creating its main window (exit code $($process.ExitCode))."
    }
}
if ($process.MainWindowHandle -eq 0) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    throw "Compatibility Mixxx failed to create a visible main window within 90 seconds."
}

Write-Output "Compatibility Mixxx PID: $($process.Id)"
Write-Output "Interactive session: $($process.SessionId)"
Write-Output "Main window: $($process.MainWindowTitle)"
Write-Output "Settings path: $CompatibilityProfile"
