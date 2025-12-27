#!/bin/bash
# =============================================================================
# LIFTLIO CLAUDE CODE API - Entrypoint
# =============================================================================

set -e

echo "[ENTRYPOINT] Starting Claude Code API..."

# Create necessary directories
mkdir -p /home/claude/.claude/debug
mkdir -p /home/claude/.claude/statsig
mkdir -p /home/claude/.claude/telemetry
mkdir -p /home/claude/.claude/projects
mkdir -p /home/claude/.claude/ide
mkdir -p /home/claude/.claude/chrome
mkdir -p /home/claude/.config

# Copy credentials from mounted volume (read-only source)
if [ -f "/credentials/.credentials.json" ]; then
    echo "[ENTRYPOINT] Copying credentials from /credentials/"
    cp /credentials/.credentials.json /home/claude/.claude/.credentials.json
    chmod 600 /home/claude/.claude/.credentials.json
    echo "[ENTRYPOINT] Credentials copied successfully"
else
    echo "[ENTRYPOINT] WARNING: No credentials found at /credentials/.credentials.json"
    echo "[ENTRYPOINT] Claude CLI may not work without credentials"
fi

# Copy config if exists
if [ -f "/credentials/.claude.json" ]; then
    cp /credentials/.claude.json /home/claude/.claude.json
    echo "[ENTRYPOINT] Config copied"
fi

# Verify credentials
if [ -f "/home/claude/.claude/.credentials.json" ]; then
    echo "[ENTRYPOINT] Credentials ready at /home/claude/.claude/.credentials.json"
else
    echo "[ENTRYPOINT] ERROR: Credentials not available!"
fi

# Start the API server
echo "[ENTRYPOINT] Starting API server on port ${PORT:-10100}..."
exec node /app/server.js
