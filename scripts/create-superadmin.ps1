param(
    [string]$EnvFile = ".env.local"
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

Write-Host "MongoDB Super Admin Creation" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host "Target DB : ctrlsqr (master)" -ForegroundColor Yellow
Write-Host "Env file  : $EnvFile" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $EnvFile)) {
    Fail "$EnvFile not found."
}

$mongoUri = Get-EnvValue $EnvFile "MONGODB_URI"
if ([string]::IsNullOrWhiteSpace($mongoUri)) {
    Fail "MONGODB_URI not found in $EnvFile."
}

$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Fail "Node.js is required. Install it, then ensure 'node' is in PATH."
}

Write-Host "Creating super admin user..." -ForegroundColor Cyan
node "$PSScriptRoot/create-superadmin.js"

if ($LASTEXITCODE -ne 0) {
    Fail "Failed to create super admin user."
}

Write-Host ""
Write-Host "✅ Super admin user created successfully!" -ForegroundColor Green
