$ErrorActionPreference = "Stop"

$packageName = "prompt-sage"
$url64 = "https://example.com/prompt-sage/v0.2.1/prompt-sage-windows-x64.exe"
$checksum64 = "REPLACE_WITH_SHA256"

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$exePath = Join-Path $toolsDir "prompt-sage.exe"

Get-ChocolateyWebFile -PackageName $packageName -FileFullPath $exePath -Url64bit $url64 -Checksum64 $checksum64 -ChecksumType64 "sha256"
