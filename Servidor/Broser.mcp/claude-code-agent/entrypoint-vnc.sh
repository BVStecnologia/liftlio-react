#!/bin/bash
# =============================================================================
# LIFTLIO BROWSER AGENT v4 - Entrypoint with VNC
# =============================================================================

set -e

echo "=============================================="
echo "  LIFTLIO BROWSER AGENT v4"
echo "  Claude Code Max + VNC"
echo "=============================================="
echo ""

# Paths - explicitly use /home/claude (not $HOME which is /root for entrypoint)
CLAUDE_HOME="/home/claude"
CREDS_SOURCE="/opt/claude-credentials/.credentials.json"
CREDS_FILE="${CLAUDE_HOME}/.claude/.credentials.json"
CONFIG_SOURCE="/opt/claude-config/.claude.json"
CONFIG_FILE="${CLAUDE_HOME}/.claude.json"

echo "[1/5] Checking credentials..."

if [ ! -f "$CREDS_SOURCE" ]; then
    echo "ERROR: Credentials not found at $CREDS_SOURCE"
    exit 1
fi

mkdir -p "${CLAUDE_HOME}/.claude"
cp "$CREDS_SOURCE" "$CREDS_FILE"
chmod 600 "$CREDS_FILE"
chown claude:claude "$CREDS_FILE"
chown claude:claude "${CLAUDE_HOME}/.claude"
echo "  - Credentials: OK"

if [ -f "$CONFIG_SOURCE" ]; then
    cp "$CONFIG_SOURCE" "$CONFIG_FILE"
    chown claude:claude "$CONFIG_FILE"
    echo "  - Config: OK"
fi

echo ""
echo "[2/5] Configuring Playwright MCP with CDP connection..."

# Create Claude Code settings with Playwright MCP
# Using CDP to connect to persistent Chrome instance
# Chrome runs independently with user-data-dir for session persistence
cat > "${CLAUDE_HOME}/.claude/settings.json" << EOF
{
  "permissions": {
    "allow": [
      "mcp__playwright__*",
      "Bash(curl:*)",
      "Bash(node:*)",
      "Read",
      "Write"
    ],
    "deny": []
  },
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp",
        "--cdp-endpoint", "http://localhost:9222"
      ],
      "env": {
        "DISPLAY": ":99"
      }
    }
  },
  "env": {
    "DISABLE_AUTOUPDATER": "1"
  }
}
EOF
chown claude:claude "${CLAUDE_HOME}/.claude/settings.json"
echo "  - Playwright MCP: Configured (CDP connection to persistent Chrome)"
echo "  - Chrome user-data-dir: /home/claude/.chrome-persistent"

echo ""
echo "[3/5] Verifying Claude Code..."
CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
echo "  - Version: $CLAUDE_VERSION"

echo ""
echo "[4/5] Setting up display permissions..."
# Allow any user to access X display
if [ -f /tmp/.X11-unix/X99 ]; then
    chmod 777 /tmp/.X11-unix/X99 2>/dev/null || true
fi

echo ""
echo "[5/5] Starting supervisor..."
echo ""

# Note: Playwright MCP will launch Chrome on DISPLAY :99 when needed
# No need to start Chrome here - it will be started by Playwright during tasks

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
