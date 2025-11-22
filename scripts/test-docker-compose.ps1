# PowerShell script to test Docker Compose setup

Write-Host "Checking Docker..." -ForegroundColor Yellow

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Building Docker images..." -ForegroundColor Yellow
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "Testing API health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API is healthy" -ForegroundColor Green
    } else {
        Write-Host "✗ API returned status code: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ API health check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing Web service..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Web service is accessible" -ForegroundColor Green
    } else {
        Write-Host "✗ Web service returned status code: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Web service check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Services are running!" -ForegroundColor Green
Write-Host "API: http://localhost:4000" -ForegroundColor Cyan
Write-Host "Web: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "  docker-compose down" -ForegroundColor White

