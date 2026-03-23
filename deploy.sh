#!/bin/bash
set -e

echo "🔄 [1/3] Pulling latest code from Git..."
git pull
echo "✅ Git pull complete."

echo ""
echo "🛑 [2/3] Stopping containers..."
docker compose -f docker-compose.dthu.yml down
echo "✅ Containers stopped."

echo ""
echo "🚀 [3/3] Building and starting containers..."
docker compose -f docker-compose.dthu.yml up -d --build
echo "✅ Deploy complete!"
