#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo "  Cloudreve CE Full Build Script"
echo "========================================"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Frontend
if [ -d "$ROOT/frontend" ]; then
    echo "[1/3] Building frontend assets..."
    cd "$ROOT/frontend"
    if command -v pnpm &> /dev/null; then
        pnpm install
        pnpm build
    else
        npm install
        npm run build
    fi
    cd "$ROOT"
fi

# 2. Pack assets
echo "[2/3] Packing frontend assets into assets.zip..."
if [ -d "$ROOT/frontend/build" ] || [ -d "$ROOT/assets/build" ]; then
    go run pack_assets.go
else
    if [ ! -f "$ROOT/application/statics/assets.zip" ]; then
        python3 -c "import zipfile; zipfile.ZipFile('application/statics/assets.zip', 'w').close()"
    fi
fi

# 3. Build Go backend
echo "[3/3] Building Cloudreve backend with -trimpath..."
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o cloudreve

echo "========================================"
echo "  Build Succeeded: ./cloudreve"
echo "========================================"
