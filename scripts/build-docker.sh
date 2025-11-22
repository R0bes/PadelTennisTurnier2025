#!/bin/bash

# Build script for Docker images

set -e

echo "Building Docker images..."

# Build API
echo "Building API image..."
docker build -f apps/api/Dockerfile -t padel-tournament-api:latest .

# Build Web
echo "Building Web image..."
docker build -f apps/web/Dockerfile -t padel-tournament-web:latest .

# Build Bot
echo "Building Bot image..."
docker build -f apps/bot/Dockerfile -t padel-tournament-bot:latest .

echo "All images built successfully!"
echo ""
echo "To run locally:"
echo "  docker-compose up"
echo ""
echo "Or run individually:"
echo "  docker run -p 4000:4000 padel-tournament-api:latest"
echo "  docker run -p 3000:80 padel-tournament-web:latest"
echo "  docker run -e BOT_TOKEN=your_token padel-tournament-bot:latest"

