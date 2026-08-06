param(
  [string]$EndpointId = ""
)

$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "m26-wasapi-loopback.cs"
$buildRoot = Join-Path ([System.IO.Path]::GetTempPath()) "brmedia-m26-wasapi-test"
$binary = Join-Path $buildRoot "m26-wasapi-loopback.exe"
$compiler = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path -LiteralPath $compiler)) { throw "C# compiler is unavailable" }
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
& $compiler /nologo /optimize+ /target:exe /out:$binary $source
if ($LASTEXITCODE -ne 0) { throw "M26 WASAPI helper compilation failed" }

& $binary --self-test
if ($LASTEXITCODE -ne 0) { throw "M26 WASAPI helper self-test failed" }

& $binary --capture-endpoint ""
if ($LASTEXITCODE -ne 64) { throw "Empty endpoint was not rejected with usage exit code" }

if ($EndpointId) {
  & $binary --probe-endpoint $EndpointId
  if ($LASTEXITCODE -ne 0) { throw "Explicit render endpoint probe failed" }
}

Write-Output "M26 WASAPI helper checks passed"
