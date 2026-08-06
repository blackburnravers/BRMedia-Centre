param(
  [string]$ProjectRoot = "",
  [string]$ControllerDirectory = "",
  [string]$StateDirectory = "C:\BRMedia",
  [ValidateSet("auto", "running", "stopped")]
  [string]$MixxxStateForTest = "auto"
)

$ErrorActionPreference = "Stop"
$ExpectedVersion = 5
$XmlName = "BRMedia-Mixxx-M7-Live-Engine.midi.xml"
$ScriptName = "BRMedia-Mixxx-M7-Live-Engine-scripts.js"

if (!$ProjectRoot) { $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }
$sourceDirectory = Join-Path $ProjectRoot "tools\mixxx"

function Resolve-InteractiveLocalAppData {
  $account = (Get-CimInstance Win32_ComputerSystem).UserName
  if (!$account) { throw "No interactive Windows user is logged on." }
  $user = $account.Split("\")[-1]
  $profile = Get-CimInstance Win32_UserProfile |
    Where-Object { $_.LocalPath -and (Split-Path $_.LocalPath -Leaf) -eq $user } |
    Select-Object -First 1
  if (!$profile) { throw "The interactive Mixxx profile could not be resolved." }
  return Join-Path $profile.LocalPath "AppData\Local"
}

if (!$ControllerDirectory) {
  $ControllerDirectory = Join-Path (Resolve-InteractiveLocalAppData) "Mixxx\controllers"
}

function Test-MappingSource([string]$XmlPath, [string]$JsPath) {
  try { [xml]$xml = Get-Content -LiteralPath $XmlPath -Raw } catch { throw "Mapping XML is invalid." }
  $preset = $xml.MixxxControllerPreset
  if ($preset.mixxxVersion -ne "2.5" -or $preset.schemaVersion -ne "1") { throw "Mapping targets an unsupported Mixxx/schema version." }
  if ($preset.controller.id -ne "BRMedia Mixxx Remote") { throw "Mapping controller identity is invalid." }
  $scriptFile = $preset.controller.scriptfiles.file
  if ($scriptFile.filename -ne $ScriptName -or $scriptFile.functionprefix -ne "BRMediaMixxxM7") { throw "Mapping script identity is invalid." }
  $source = Get-Content -LiteralPath $JsPath -Raw
  if ($source -notmatch "var BRMediaMixxxM7 = \{\}" -or
      $source -notmatch "midi\.sendShortMsg\(0x90, 0x71, $ExpectedVersion\)" -or
      $source -notmatch "beginTimer\(2000,[\s\S]*midi\.sendShortMsg\(0x90, 0x70") {
    throw "Mapping script protocol or heartbeat is invalid."
  }
}

$xmlSource = Join-Path $sourceDirectory $XmlName
$scriptSource = Join-Path $sourceDirectory $ScriptName
Test-MappingSource $xmlSource $scriptSource
New-Item -ItemType Directory -Force -Path $ControllerDirectory, $StateDirectory | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$installed = @()
$backups = @()
foreach ($name in @($XmlName, $ScriptName)) {
  $source = Join-Path $sourceDirectory $name
  $target = Join-Path $ControllerDirectory $name
  $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  if (Test-Path -LiteralPath $target) {
    $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    if ($targetHash -eq $sourceHash) { continue }
    $backup = "$target.m19-$timestamp.bak"
    Copy-Item -LiteralPath $target -Destination $backup
    $backups += Split-Path $backup -Leaf
  }
  Copy-Item -LiteralPath $source -Destination $target
  $installed += $name
}

Test-MappingSource (Join-Path $ControllerDirectory $XmlName) (Join-Path $ControllerDirectory $ScriptName)
$running = if ($MixxxStateForTest -eq "running") { $true } elseif ($MixxxStateForTest -eq "stopped") { $false } else {
  $null -ne (Get-Process -Name mixxx -ErrorAction SilentlyContinue | Select-Object -First 1)
}
$result = [ordered]@{
  state = "mapping-installed"
  version = $ExpectedVersion
  controllerDirectory = $ControllerDirectory
  installedFiles = $installed
  backupFiles = $backups
  validation = "valid"
  restartRequired = $running
  idempotent = $installed.Count -eq 0
  updatedAt = (Get-Date).ToString("o")
}
$result | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $StateDirectory "mixxx-mapping-status.json") -Encoding UTF8
$result | ConvertTo-Json -Depth 4
