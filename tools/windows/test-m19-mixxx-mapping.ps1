param([string]$ProjectRoot = "")
$ErrorActionPreference = "Stop"
if (!$ProjectRoot) { $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }

$installer = Join-Path $ProjectRoot "tools\windows\install-mixxx-mapping.ps1"
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($installer, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count) { throw "PowerShell parse failure: $($errors[0].Message)" }

$testRoot = Join-Path $env:TEMP "BRMedia M19 path with spaces $PID"
$controllers = Join-Path $testRoot "Mixxx controllers"
$state = Join-Path $testRoot "state"
New-Item -ItemType Directory -Force -Path $controllers, $state | Out-Null
try {
  Set-Content -LiteralPath (Join-Path $controllers "User Custom Mapping.midi.xml") -Value "preserve-me"
  Set-Content -LiteralPath (Join-Path $controllers "BRMedia-Mixxx-M7-Live-Engine.midi.xml") -Value "<outdated />"

  $first = & $installer -ProjectRoot $ProjectRoot -ControllerDirectory $controllers -StateDirectory $state -MixxxStateForTest running | ConvertFrom-Json
  if ($first.validation -ne "valid" -or $first.version -ne 5 -or !$first.restartRequired) { throw "First install validation failed." }
  if ($first.backupFiles.Count -ne 1) { throw "Changed BRMedia file was not backed up exactly once." }
  if ((Get-Content -LiteralPath (Join-Path $controllers "User Custom Mapping.midi.xml") -Raw).Trim() -ne "preserve-me") {
    throw "Unrelated mapping was changed."
  }

  $second = & $installer -ProjectRoot $ProjectRoot -ControllerDirectory $controllers -StateDirectory $state -MixxxStateForTest running | ConvertFrom-Json
  if (!$second.idempotent -or $second.installedFiles.Count -ne 0 -or $second.backupFiles.Count -ne 0) {
    throw "Repeated install was not idempotent."
  }

  Write-Host "M19 mapping installer checks PASS"
  Write-Host "spaces, validation, current-version, backup-replacement, unrelated-preservation, restart-required, idempotency"
} finally {
  Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
