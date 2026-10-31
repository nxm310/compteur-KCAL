#!/bin/bash
set -e

REMOTE_HOST="mac-m1"
REMOTE_DIR="/Users/macminim1/docker/compteur-kcal"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔨 [1/3] Compilation du frontend (Vite)..."
npm run build

echo "📦 [2/3] Synchronisation vers le Mac M1 ($REMOTE_DIR)..."
rsync -avz \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'data' \
    "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

echo "🐳 [3/3] Rechargement du conteneur CaloTrack KCAL sur OrbStack..."
ssh "$REMOTE_HOST" "
    export PATH=\"\$HOME/.orbstack/bin:/usr/local/bin:\$PATH\"
    cd $REMOTE_DIR
    docker compose up -d --build
"

echo "✅ CaloTrack KCAL déployé avec succès sur OrbStack !"
