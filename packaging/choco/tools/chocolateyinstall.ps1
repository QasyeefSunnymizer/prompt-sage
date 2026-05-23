$ErrorActionPreference = "Stop"

$packageName = "prompt-sage"
$url64 = "https://example.com/prompt-sage/v0.1.0/prompt-sage-win-x64.zip"
$checksum64 = "REPLACE_WITH_SHA256"

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$zipPath = Join-Path $toolsDir "prompt-sage.zip"

Get-ChocolateyWebFile -PackageName $packageName -FileFullPath $zipPath -Url64bit $url64 -Checksum64 $checksum64 -ChecksumType64 "sha256"
Get-ChocolateyUnzip -FileFullPath $zipPath -Destination $toolsDir

