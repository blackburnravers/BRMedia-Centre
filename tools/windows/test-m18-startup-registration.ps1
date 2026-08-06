param([string]$ProjectRoot = "")

$ErrorActionPreference = "Stop"

if (!$ProjectRoot) {
  $ProjectRoot =
    (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$brmediaInstaller =
  Get-Content `
    (Join-Path $ProjectRoot "tools\windows\install-brmedia-service.ps1") `
    -Raw

$mixxxInstaller =
  Get-Content `
    (Join-Path $ProjectRoot "tools\windows\install-mixxx-startup.ps1") `
    -Raw

foreach (
  $entry in @(
    @{
      Name = "BRMedia"
      Source = $brmediaInstaller
    },
    @{
      Name = "Mixxx"
      Source = $mixxxInstaller
    }
  )
) {
  if ($entry.Source -notmatch "Get-CimInstance Win32_ComputerSystem") {
    throw "$($entry.Name) installer does not discover the interactive console account."
  }

  if ($entry.Source -notmatch 'Name -eq "explorer\.exe"') {
    throw "$($entry.Name) installer does not verify the interactive desktop owner."
  }

  if (
    $entry.Source -notmatch
      "New-ScheduledTaskPrincipal[\s\S]*-LogonType Interactive[\s\S]*-RunLevel Limited"
  ) {
    throw "$($entry.Name) installer does not use a limited interactive-token principal."
  }

  if ($entry.Source -match "LogonType Password|ConvertTo-SecureString") {
    throw "$($entry.Name) installer must not request or store a Windows password."
  }

  if ($entry.Source -notmatch "Register-ScheduledTask[\s\S]*-Force") {
    throw "$($entry.Name) registration is not idempotent."
  }
}

if ($brmediaInstaller -match "Unregister-ScheduledTask") {
  throw "BRMedia installer unregisters the existing task instead of updating it."
}

if ($brmediaInstaller -match "Start-ScheduledTask") {
  throw "BRMedia installer starts the task during registration."
}

if ($mixxxInstaller -match '-Enabled\s+[`$]true') {
  throw "Mixxx installer passes an unbindable Boolean through powershell.exe -File."
}

if (
  $mixxxInstaller -notmatch
    '-DelaySeconds [`$]DelaySeconds -RetryCount [`$]RetryCount -RetryDelaySeconds [`$]RetryDelaySeconds'
) {
  throw "Mixxx installer does not preserve its bounded startup timings."
}

Write-Host "M18 startup registration checks PASS"
Write-Host "interactive-account, explorer-owner, limited-token, no-password, idempotent-update, no-auto-start, Mixxx-boolean-binding, delays"
