Write-Host "=== StudentOS Deployment ===" -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required but not installed."
    exit 1
}

# Check Docker daemon
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
}

Write-Host "Building images..." -ForegroundColor Yellow
docker compose build

Write-Host "Starting services..." -ForegroundColor Yellow
docker compose up -d

Write-Host "Waiting for services to become healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Health check
try {
    $res = Invoke-RestMethod -Uri "http://localhost/api/v1/health" -Method Get -TimeoutSec 10
    Write-Host " - Backend OK: $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host " - Backend health check failed: $_" -ForegroundColor Red
}

try {
    $web = Invoke-WebRequest -Uri "http://localhost" -Method Get -TimeoutSec 10
    Write-Host " - Frontend OK (Status $($web.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host " - Frontend health check failed: $_" -ForegroundColor Red
}

Write-Host "=== Deployment complete! ===" -ForegroundColor Cyan
Write-Host "Frontend:  http://localhost"
Write-Host "Backend:   http://localhost/api/v1"
Write-Host "API Docs:  http://localhost/docs"
