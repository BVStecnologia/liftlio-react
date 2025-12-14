#!/bin/bash
# =============================================================================
# PERSISTENT CHROME WITH CDP - Liftlio Browser Agent
# =============================================================================
# Chrome stays alive between tasks, Playwright MCP connects via CDP
# Session persists in user-data-dir
# =============================================================================

set -e

CHROME_USER_DATA_DIR="/home/claude/.chrome-persistent"
CDP_PORT=9222
DISPLAY_NUM=":99"

echo "[CHROME] Starting persistent Chrome with CDP on port $CDP_PORT..."

# Wait for X display to be ready
for i in {1..30}; do
    if xdpyinfo -display $DISPLAY_NUM >/dev/null 2>&1; then
        echo "[CHROME] X display $DISPLAY_NUM is ready"
        break
    fi
    echo "[CHROME] Waiting for X display... ($i/30)"
    sleep 1
done

# Create user data directory if not exists
mkdir -p "$CHROME_USER_DATA_DIR"
chown -R claude:claude "$CHROME_USER_DATA_DIR" 2>/dev/null || true

# Find Chrome - prefer Google Chrome, fallback to Playwright Chrome
if [ -x "/usr/bin/google-chrome" ]; then
    CHROME_PATH="/usr/bin/google-chrome"
    echo "[CHROME] Using Google Chrome: $CHROME_PATH"
else
    CHROME_PATH=$(find /ms-playwright -name "chrome" -type f -path "*/chrome-linux/*" 2>/dev/null | head -1)
    if [ -z "$CHROME_PATH" ]; then
        echo "[CHROME] ERROR: No Chrome found!"
        exit 1
    fi
    echo "[CHROME] Using Playwright Chrome: $CHROME_PATH"
fi

# Build proxy args if configured
PROXY_ARGS=""
if [ -n "$PROXY_URL" ]; then
    echo "[CHROME] Proxy URL detected: $PROXY_URL"

    # Start local proxy server to handle authentication
    # Chrome doesn't support auth in --proxy-server flag
    echo "[CHROME] Starting local proxy server..."
    node /app/proxy-server.js &
    PROXY_PID=$!
    sleep 2

    # Check if proxy server is running
    if kill -0 $PROXY_PID 2>/dev/null; then
        echo "[CHROME] Local proxy server running on port 8888"
        PROXY_ARGS="--proxy-server=http://127.0.0.1:8888"
    else
        echo "[CHROME] WARNING: Local proxy server failed to start, running without proxy"
    fi
fi

# Kill any existing Chrome instances
pkill -f "remote-debugging-port=$CDP_PORT" 2>/dev/null || true
sleep 2

# Remove Chrome lock files (important for container restart)
rm -f "$CHROME_USER_DATA_DIR/SingletonLock" \
      "$CHROME_USER_DATA_DIR/SingletonSocket" \
      "$CHROME_USER_DATA_DIR/SingletonCookie" 2>/dev/null || true
echo "[CHROME] Lock files cleaned"

# CRITICAL: Export DISPLAY for Chrome to show on VNC
export DISPLAY=$DISPLAY_NUM
echo "[CHROME] Using DISPLAY=$DISPLAY"

# Launch Chrome in background first
echo "[CHROME] Starting Chrome..."
"$CHROME_PATH" \
    --user-data-dir="$CHROME_USER_DATA_DIR" \
    --remote-debugging-port=$CDP_PORT \
    --remote-debugging-address=0.0.0.0 \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-software-rasterizer \
    --disable-gpu-compositing \
    --disable-gpu-sandbox \
    --use-gl=swiftshader \
    --enable-unsafe-swiftshader \
    --disable-accelerated-2d-canvas \
    --disable-accelerated-video-decode \
    --start-maximized \
    --window-size=1920,1080 \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-blink-features=AutomationControlled \
    --no-first-run \
    --no-default-browser-check \
    --disable-background-networking \
    --disable-sync \
    --disable-default-apps \
    --mute-audio \
    --force-device-scale-factor=1 \
    --disable-notifications \
    --deny-permission-prompts \
    --disable-popup-blocking \
    --disable-prompt-on-repost \
    --disable-hang-monitor \
    --disable-domain-reliability \
    --disable-component-update \
    --autoplay-policy=no-user-gesture-required \
    --disable-features=TranslateUI,VizDisplayCompositor,InfiniteSessionRestore,PermissionsPolicyHeader \
    $PROXY_ARGS \
    "https://www.google.com" &

CHROME_PID=$!
echo "[CHROME] Chrome started with PID $CHROME_PID"

# Wait for Chrome window to appear (search by name containing "Chrome")
echo "[CHROME] Waiting for Chrome window..."
for i in {1..30}; do
    # Search for window with "Chrome" in title (the actual browser window)
    WINDOW_ID=$(xdotool search --name "Chrome" 2>/dev/null | head -1)
    if [ -n "$WINDOW_ID" ]; then
        echo "[CHROME] Found Chrome window: $WINDOW_ID"
        break
    fi
    echo "[CHROME] Waiting... ($i/30)"
    sleep 1
done

# Maximize Chrome window
if [ -n "$WINDOW_ID" ]; then
    echo "[CHROME] Maximizing Chrome to 1900x1060..."
    xdotool windowactivate --sync "$WINDOW_ID" windowsize 1900 1060 windowmove 0 0 2>/dev/null || true
    echo "[CHROME] Chrome window maximized"
else
    echo "[CHROME] Warning: Could not find Chrome window to maximize"
fi

# Wait for Chrome process (keep script running)
echo "[CHROME] Waiting for Chrome process..."
wait $CHROME_PID
