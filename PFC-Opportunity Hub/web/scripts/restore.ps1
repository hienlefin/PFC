param(
  [Parameter(Mandatory = $true)]
  [string]$File
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $File)) { throw "Backup not found: $File" }
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$line = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$dbUrl = $line.Substring("DATABASE_URL=".Length).Trim('"')

if ($dbUrl -like "file:*") {
  $rel = $dbUrl.Substring(5).TrimStart("./\")
  $dest = if ([System.IO.Path]::IsPathRooted($rel)) { $rel } else { Join-Path (Join-Path $root "prisma") $rel }
  Copy-Item $File $dest -Force
  Write-Output "Restored SQLite to $dest. Restart the app and worker."
  exit 0
}

throw "Postgres restore: stop the app, then run psql `"$dbUrl`" -f `"$File`". Do not overwrite production without a fresh backup."
