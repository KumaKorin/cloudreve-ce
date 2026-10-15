[CmdletBinding()]
param(
    [switch]$BuildFrontend,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloudreve CE Full Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Frontend Build
$hasFrontendBuild = Test-Path "$root\frontend\build"
if (($BuildFrontend -or -not $hasFrontendBuild) -and -not $SkipFrontend) {
    if (Test-Path "$root\frontend") {
        Write-Host "`n[1/3] Building frontend assets..." -ForegroundColor Yellow
        Push-Location "$root\frontend"
        try {
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                Write-Host "Running pnpm install..."
                pnpm install
                Write-Host "Running pnpm build..."
                pnpm build
            } else {
                Write-Host "pnpm not found, trying npm..." -ForegroundColor DarkYellow
                npm install
                npm run build
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "`n[1/3] Frontend directory not found, skipping frontend build." -ForegroundColor DarkGray
    }
} else {
    Write-Host "`n[1/3] Skipping frontend build (build exists or -SkipFrontend specified)." -ForegroundColor DarkGray
}

# 2. Pack assets
Write-Host "`n[2/3] Packing frontend assets into assets.zip..." -ForegroundColor Yellow
$frontendBuildDir = if (Test-Path "$root\frontend\build") { "$root\frontend\build" } else { "$root\assets\build" }
if (Test-Path $frontendBuildDir) {
    go run pack_assets.go
} else {
    Write-Host "Warning: No frontend build output found at frontend/build or assets/build." -ForegroundColor Yellow
    if (-not (Test-Path "$root\application\statics\assets.zip")) {
        Write-Host "Creating minimal dummy assets.zip to allow compilation..." -ForegroundColor Yellow
        python -c "import zipfile; zipfile.ZipFile(r'application/statics/assets.zip', 'w').close()"
    }
}

# 3. Build Go backend
Write-Host "`n[3/3] Building Cloudreve backend with -trimpath..." -ForegroundColor Yellow
go build -trimpath -ldflags="-s -w" -o Cloudreve.exe

if (Test-Path "$root\Cloudreve.exe") {
    $size = [math]::Round((Get-Item "$root\Cloudreve.exe").Length / 1MB, 2)
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  Build Succeeded!" -ForegroundColor Green
    Write-Host "  Output: Cloudreve.exe ($size MB)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Error "Build completed but Cloudreve.exe not found."
}
