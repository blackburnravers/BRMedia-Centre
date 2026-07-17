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

Write-Host "Restarting BRMedia..."
& (Join-Path $ProjectRoot "tools\windows\stop-brmedia-service.ps1") -ProjectRoot $ProjectRoot -TaskName $TaskName -Port $Port

Start-Sleep -Seconds 1

& (Join-Path $ProjectRoot "tools\windows\start-brmedia-service.ps1") -ProjectRoot $ProjectRoot -TaskName $TaskName -Port $Port

Write-Host ""
Write-Host "BRMedia restart requested."
Write-Host ""

& (Join-Path $ProjectRoot "tools\windows\status-brmedia-service.ps1") -ProjectRoot $ProjectRoot -TaskName $TaskName -Port $Port