# Builds EstabrekLauncher.exe with the C# compiler that comes with Windows
# (.NET Framework 4.8): nothing to install.
#
# The blank program every shop serves (nobody has to build one per shop):
#   powershell -ExecutionPolicy Bypass -File build.ps1 -Blank -Version 1.1.0
# It goes to estabrek-store-backend/assets/launcher with launcher.json (its version
# and a hash of the sources it was built from; a backend test fails when the
# sources change without building again). Commit both. Each shop's server writes
# its address, name and licence keys at the end of the file when it is downloaded
# (src/Config.cs, modules/protected/launcherStamp.ts).
#
# A build for one shop (the old way, or for a signed build of your own):
#   powershell -ExecutionPolicy Bypass -File build.ps1 -ApiUrl https://your-api -Version 1.0.0
# The shop's licence keys are read from <ApiUrl>/v1/licences/public-key and built in.
# Optional: sign it with your code-signing certificate:
#   signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a dist\EstabrekLauncher.exe
param(
  [string]$ApiUrl = "",
  [string]$Version = "1.0.0",
  [string]$KeysJson = "",
  [string]$OutDir = "",
  [switch]$Blank
)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if ($Version -notmatch '^\d{1,3}(\.\d{1,3}){1,3}$') { throw "Version like 1.0.0" }
if (-not $Blank -and -not $ApiUrl) { throw "Give -ApiUrl (a build for one shop) or -Blank (the program every shop serves)" }
if (-not $OutDir) { $OutDir = if ($Blank) { Join-Path $PSScriptRoot "..\estabrek-store-backend\assets\launcher" } else { Join-Path $PSScriptRoot "dist" } }

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "The .NET Framework C# compiler (csc.exe) wasn't found" }

$api = ""
$keys = @()
if (-not $Blank) {
  $api = $ApiUrl.TrimEnd('/') -replace '/v1$', ''
  if (-not $KeysJson) { $KeysJson = (Invoke-WebRequest -UseBasicParsing "$api/v1/licences/public-key").Content }
  $keys = @(($KeysJson | ConvertFrom-Json).keys)
  if ($keys.Count -eq 0) { throw "No licence keys from $api" }
}
if ($api -match '["\\\r\n]') { throw "Bad address" }
$rows = $keys | ForEach-Object {
  foreach ($v in @($_.kid, $_.x, $_.y)) { if ($v -notmatch '^[A-Za-z0-9_-]+$') { throw "Bad key value" } }
  '            new string[] { "' + $_.kid + '", "' + $_.x + '", "' + $_.y + '" },'
}

$obj = Join-Path $PSScriptRoot "obj"
New-Item -ItemType Directory -Force $obj, $OutDir | Out-Null
$config = @"
// Made by build.ps1: don't edit.
namespace Estabrek.Launcher
{
    public static class Built
    {
        public const string Version = "$Version";
        public const string ApiBase = "$api";
        public static readonly string[][] Keys = new string[][]
        {
$($rows -join "`r`n")
        };
    }
}
"@
[IO.File]::WriteAllText((Join-Path $obj "Config.g.cs"), $config, (New-Object Text.UTF8Encoding $false))

$out = Join-Path $OutDir "EstabrekLauncher.exe"
$srcFiles = @(Get-ChildItem (Join-Path $PSScriptRoot "src") -Filter *.cs | ForEach-Object { $_.FullName })
& $csc /nologo /target:winexe /optimize+ /codepage:65001 /utf8output "/out:$out" `
  /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  /r:System.Security.dll /r:System.Management.dll /r:System.Web.Extensions.dll ($srcFiles + (Join-Path $obj "Config.g.cs"))
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

if ($Blank) {
  # What the blank program was built from: src/*.cs and this script, by name (ordinal),
  # without CR (Windows and Linux checkouts hash the same). Same as sourcesHash() in
  # the backend's launcher.service.ts.
  $names = [string[]]@((Get-ChildItem (Join-Path $PSScriptRoot "src") -Filter *.cs | ForEach-Object { "src/" + $_.Name }) + "build.ps1")
  [Array]::Sort($names, [StringComparer]::Ordinal)
  $sb = New-Object Text.StringBuilder
  foreach ($n in $names) {
    $text = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $n), [Text.Encoding]::UTF8).Replace("`r", "").TrimStart([char]0xFEFF)
    [void]$sb.Append($n).Append("`n").Append($text).Append("`n")
  }
  $sha = [Security.Cryptography.SHA256]::Create()
  $hash = -join ($sha.ComputeHash((New-Object Text.UTF8Encoding $false).GetBytes($sb.ToString())) | ForEach-Object { $_.ToString("x2") })
  $info = [ordered]@{ version = $Version; sources = $hash }
  [IO.File]::WriteAllText((Join-Path $OutDir "launcher.json"), (($info | ConvertTo-Json) + "`n"), (New-Object Text.UTF8Encoding $false))
  Write-Host "Built the blank $out ($Version, sources $($hash.Substring(0, 12)))"
} else {
  Write-Host "Built $out ($Version, keys: $(($keys | ForEach-Object { $_.kid }) -join ', '))"
}
