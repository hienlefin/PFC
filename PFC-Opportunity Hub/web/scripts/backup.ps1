$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $root "backups"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
  $envFile = Join-Path $root ".env"
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
    if ($line) { $dbUrl = $line.Substring("DATABASE_URL=".Length).Trim('"') }
  }
}

if ($dbUrl -like "file:*") {
  $rel = $dbUrl.Substring(5).TrimStart("./\")
  $src = if ([System.IO.Path]::IsPathRooted($rel)) { $rel } else { Join-Path (Join-Path $root "prisma") $rel }
  if (-not (Test-Path $src)) { throw "SQLite file not found: $src" }
  $out = Join-Path $dest "opportunity-$stamp.db"
  Copy-Item $src $out
  Write-Output "Backup written: $out"
  exit 0
}

if ($dbUrl -like "postgresql:*" -or $dbUrl -like "postgres:*") {
  $out = Join-Path $dest "opportunity-$stamp.sql"
  & pg_dump $dbUrl -f $out
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
  Write-Output "Backup written: $out"
  exit 0
}

throw "Unsupported DATABASE_URL"
