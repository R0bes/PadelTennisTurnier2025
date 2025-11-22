#!/bin/bash

# Bash script to test Docker Compose setup

set -e

echo "Checking Docker..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "✗ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✓ Docker is running"

echo ""
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting services..."
docker-compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

echo ""
echo "Checking service status..."
docker-compose ps

echo ""
echo "Testing API health endpoint..."
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "✓ API is healthy"
else
    echo "✗ API health check failed"
fi

echo ""
echo "Testing Web service..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ Web service is accessible"
else
    echo "✗ Web service check failed"
fi

echo ""
echo "Services are running!"
echo "API: http://localhost:4000"
echo "Web: http://localhost:3000"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"

