param(
    [string]$EnvFile = ".env.local",
    [string]$SourceDb = "ctrlsqr",
    [string]$TargetDb = "69e914278670a194dbc2ced6",
    [string]$DumpDir = "./dump-db-copy",
    [switch]$DropTarget
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Get-EnvValue($Path, $Name) {
    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()

        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
            continue
        }

        if ($trimmed.StartsWith("$Name=")) {
            return $trimmed.Substring($Name.Length + 1).Trim().Trim('"').Trim("'")
        }
    }

    return ""
}

Write-Host "MongoDB Database Duplication" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host "Source DB : $SourceDb" -ForegroundColor Yellow
Write-Host "Target DB : $TargetDb" -ForegroundColor Yellow
Write-Host "Env file  : $EnvFile" -ForegroundColor Yellow
Write-Host "Drop mode : $($DropTarget.IsPresent)" -ForegroundColor Yellow
Write-Host ""

if ($SourceDb -eq $TargetDb) {
    Fail "SourceDb and TargetDb must be different."
}

if (-not (Test-Path $EnvFile)) {
    Fail "$EnvFile not found."
}

$mongoUri = Get-EnvValue $EnvFile "MONGODB_URI"
if ([string]::IsNullOrWhiteSpace($mongoUri)) {
    Fail "MONGODB_URI not found in $EnvFile."
}

$mongodumpPath = "C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe"
$mongorestorePath = "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe"

if (-not (Test-Path $mongodumpPath)) {
    Fail "mongodump not found at $mongodumpPath. Please install MongoDB Database Tools."
}

if (-not (Test-Path $mongorestorePath)) {
    Fail "mongorestore not found at $mongorestorePath. Please install MongoDB Database Tools."
}

if (Test-Path $DumpDir) {
    Remove-Item -Recurse -Force $DumpDir
}

Write-Host "Step 1: Dumping $SourceDb..." -ForegroundColor Cyan
& $mongodumpPath --uri "$mongoUri" --db "$SourceDb" --out "$DumpDir"
if ($LASTEXITCODE -ne 0) {
    Fail "mongodump failed."
}

$sourceDumpPath = Join-Path $DumpDir $SourceDb
if (-not (Test-Path $sourceDumpPath)) {
    Fail "Dump output was not created at $sourceDumpPath."
}

Write-Host "Step 2: Restoring into $TargetDb..." -ForegroundColor Cyan
$restoreArgs = @(
    "--uri", $mongoUri,
    "--nsFrom", "$SourceDb.*",
    "--nsTo", "$TargetDb.*"
)

if ($DropTarget) {
    $restoreArgs += "--drop"
}

$restoreArgs += $DumpDir
& $mongorestorePath @restoreArgs
if ($LASTEXITCODE -ne 0) {
    Fail "mongorestore failed. The dump was kept at $DumpDir for inspection."
}

Write-Host "Step 3: Cleaning up dump files..." -ForegroundColor Cyan
Remove-Item -Recurse -Force $DumpDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "SUCCESS: Database duplicated." -ForegroundColor Green
Write-Host "$SourceDb -> $TargetDb" -ForegroundColor Green
