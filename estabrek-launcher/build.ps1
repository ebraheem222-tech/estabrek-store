# Builds EstabrekLauncher.exe with the C# compiler that comes with Windows
# (.NET Framework 4.8): nothing to install.
#
#   powershell -ExecutionPolicy Bypass -File build.ps1 -ApiUrl https://estabrek-store-production.up.railway.app
#
# The shop's licence keys are read from <ApiUrl>/v1/licences/public-key and built
# into the program (so licences are checked offline). Build again after the keys
# change (e.g. when the vault is turned on), then upload the new .exe in
# admin -> الخزنة. Optional: sign it with your code-signing certificate:
#   signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a dist\EstabrekLauncher.exe
param(
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [string]$Version = "1.0.0",
  [string]$KeysJson = "",
  [string]$OutDir = ""
)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot "dist" }
if ($Version -notmatch '^\d{1,3}(\.\d{1,3}){1,3}$') { throw "Version like 1.0.0" }

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "The .NET Framework C# compiler (csc.exe) wasn't found" }

$api = $ApiUrl.TrimEnd('/')
if (-not $KeysJson) { $KeysJson = (Invoke-WebRequest -UseBasicParsing "$api/v1/licences/public-key").Content }
$keys = @(($KeysJson | ConvertFrom-Json).keys)
if ($keys.Count -eq 0) { throw "No licence keys from $api" }
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
    public static class Config
    {
        public const string Version = "$Version";
        public const string ApiBase = "$api";
        public const int OfflineGraceDays = 14;
        public static readonly string[][] Keys = new string[][]
        {
$($rows -join "`r`n")
        };
    }
}
"@
[IO.File]::WriteAllText((Join-Path $obj "Config.g.cs"), $config, (New-Object Text.UTF8Encoding $false))

$out = Join-Path $OutDir "EstabrekLauncher.exe"
$sources = @(Get-ChildItem (Join-Path $PSScriptRoot "src") -Filter *.cs | ForEach-Object { $_.FullName }) + (Join-Path $obj "Config.g.cs")
& $csc /nologo /target:winexe /optimize+ /codepage:65001 /utf8output "/out:$out" `
  /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  /r:System.Security.dll /r:System.Management.dll /r:System.Web.Extensions.dll $sources
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
Write-Host "Built $out ($Version, keys: $(($keys | ForEach-Object { $_.kid }) -join ', '))"
