#!/bin/bash

# Start only the named Cloudflare tunnel for the Expense Tracker app.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CLOUDFLARED_BIN_URL="${CLOUDFLARED_BIN_URL:-https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64}"
CLOUDFLARED_INSTALL_DIR="${CLOUDFLARED_INSTALL_DIR:-$PREFIX/bin}"
CLOUDFLARED_BIN="${CLOUDFLARED_INSTALL_DIR}/cloudflared"
TUNNEL_NAME="${CLOUDFLARED_TUNNEL_NAME:-expensetrack}"

ensure_cloudflared_installed() {
    if command -v cloudflared >/dev/null 2>&1; then
        return 0
    fi

    echo "cloudflared not found. Installing ARM64 binary into ${CLOUDFLARED_INSTALL_DIR}..."
    mkdir -p "$CLOUDFLARED_INSTALL_DIR"
    wget -O "$CLOUDFLARED_BIN" "$CLOUDFLARED_BIN_URL"
    chmod 755 "$CLOUDFLARED_BIN"

    if ! command -v cloudflared >/dev/null 2>&1; then
        export PATH="$CLOUDFLARED_INSTALL_DIR:$PATH"
    fi

    cloudflared --version
}

ensure_cloudflared_installed

echo "Starting Cloudflare tunnel only..."
cloudflared tunnel run "$TUNNEL_NAME"
