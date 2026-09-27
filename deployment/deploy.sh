#!/bin/bash
set -e

echo "=== StudentOS Deployment ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed."; exit 1; }

# Pull latest images
echo "Building images..."
docker-compose build

# Run database migrations
echo "Running migrations..."
docker-compose run --rm backend alembic upgrade head

# Start services
echo "Starting services..."
docker-compose up -d

# Health check
echo "Checking health..."
sleep 5
curl -f http://localhost/api/v1/health && echo " - Backend OK" || echo " - Backend failed"
curl -f http://localhost && echo " - Frontend OK" || echo " - Frontend failed"

echo "=== Deployment complete! ==="
echo "Frontend: http://localhost"
echo "Backend: http://localhost/api/v1"
echo "API Docs: http://localhost/api/v1/docs"
