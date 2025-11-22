# PowerShell build script for Docker images

Write-Host "Building Docker images..." -ForegroundColor Green

# Build API
Write-Host "Building API image..." -ForegroundColor Yellow
docker build -f apps/api/Dockerfile -t padel-tournament-api:latest .

# Build Web
Write-Host "Building Web image..." -ForegroundColor Yellow
docker build -f apps/web/Dockerfile -t padel-tournament-web:latest .

# Build Bot
Write-Host "Building Bot image..." -ForegroundColor Yellow
docker build -f apps/bot/Dockerfile -t padel-tournament-bot:latest .

Write-Host "All images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To run locally:" -ForegroundColor Cyan
Write-Host "  docker-compose up" -ForegroundColor White
Write-Host ""
Write-Host "Or run individually:" -ForegroundColor Cyan
Write-Host "  docker run -p 4000:4000 padel-tournament-api:latest" -ForegroundColor White
Write-Host "  docker run -p 3000:80 padel-tournament-web:latest" -ForegroundColor White
Write-Host "  docker run -e BOT_TOKEN=your_token padel-tournament-bot:latest" -ForegroundColor White

