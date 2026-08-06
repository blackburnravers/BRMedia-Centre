param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")),
    [string]$BackupRoot = "C:\BRMediaBackups\Mixxx-M23",
    [string]$CompatibilityProfile = "C:\BRMediaMixxxCompatibilityProfile",
    [string]$StableProfile = ""
)

$ErrorActionPreference = "Stop"

if (Get-Process -Name mixxx -ErrorAction SilentlyContinue) {
    throw "Mixxx is running. Close stable Mixxx before creating the validation snapshot."
}

$stableExe = "C:\Program Files\Mixxx\mixxx.exe"
if (-not $StableProfile) {
    $interactiveExplorer = Get-Process -Name explorer -ErrorAction SilentlyContinue |
        Where-Object { $_.SessionId -gt 0 } |
        Select-Object -First 1
    if (-not $interactiveExplorer) {
        throw "No interactive Windows Explorer session was found; specify -StableProfile explicitly."
    }
    $explorerProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($interactiveExplorer.Id)"
    $owner = Invoke-CimMethod -InputObject $explorerProcess -MethodName GetOwner
    $account = Get-CimInstance Win32_UserAccount -Filter "Domain='$($owner.Domain)' AND Name='$($owner.User)'"
    $userProfile = Get-CimInstance Win32_UserProfile -Filter "SID='$($account.SID)'"
    if (-not $userProfile.LocalPath) {
        throw "The interactive Windows profile path could not be resolved."
    }
    $StableProfile = Join-Path $userProfile.LocalPath "AppData\Local\Mixxx"
}
$stableProfile = $StableProfile
$mappingXml = Join-Path $RepositoryRoot "tools\mixxx\BRMedia-Mixxx-M7-Live-Engine.midi.xml"
$mappingJs = Join-Path $RepositoryRoot "tools\mixxx\BRMedia-Mixxx-M7-Live-Engine-scripts.js"

foreach ($required in @($stableExe, $stableProfile, $mappingXml, $mappingJs)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required validation input is missing: $required"
    }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$snapshot = Join-Path $BackupRoot $stamp
New-Item -ItemType Directory -Path $snapshot -Force | Out-Null

Copy-Item -LiteralPath $stableProfile -Destination (Join-Path $snapshot "stable-profile") -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $snapshot "repository-mapping") | Out-Null
Copy-Item -LiteralPath $mappingXml, $mappingJs -Destination (Join-Path $snapshot "repository-mapping")

$taskTargets = Get-ScheduledTask -ErrorAction SilentlyContinue |
    ForEach-Object {
        $task = $_
        foreach ($action in $task.Actions) {
            if (("$($action.Execute) $($action.Arguments)") -match "(?i)mixxx") {
                [pscustomobject]@{
                    TaskPath = $task.TaskPath
                    TaskName = $task.TaskName
                    Execute = $action.Execute
                    Arguments = $action.Arguments
                    WorkingDirectory = $action.WorkingDirectory
                }
            }
        }
    }

$manifest = [ordered]@{
    schemaVersion = 1
    createdAt = (Get-Date).ToString("o")
    stable = [ordered]@{
        path = $stableExe
        version = (Get-Item -LiteralPath $stableExe).VersionInfo.ProductVersion
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $stableExe).Hash
        settingsPath = $stableProfile
        interactiveUser = "$($owner.Domain)\$($owner.User)"
    }
    repositoryMappings = @(
        [ordered]@{ path = $mappingXml; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $mappingXml).Hash },
        [ordered]@{ path = $mappingJs; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $mappingJs).Hash }
    )
    startupTasks = @($taskTargets)
    productionMusicCopied = $false
    productionDatabaseWritten = $false
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $snapshot "manifest.json") -Encoding UTF8

if (Test-Path -LiteralPath $CompatibilityProfile) {
    throw "Compatibility profile already exists. Preserve or remove it deliberately before taking a new snapshot: $CompatibilityProfile"
}
Copy-Item -LiteralPath $stableProfile -Destination $CompatibilityProfile -Recurse -Force

$requiredCopiedConfig = Join-Path $CompatibilityProfile "mixxx.cfg"
if (-not (Test-Path -LiteralPath $requiredCopiedConfig -PathType Leaf)) {
    throw "The hidden Mixxx configuration was not copied into the compatibility profile."
}

Write-Output "Snapshot: $snapshot"
Write-Output "Stable profile: $stableProfile"
Write-Output "Compatibility profile: $CompatibilityProfile"
