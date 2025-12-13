#!/bin/bash
# =============================================================================
# WINDOW WATCHDOG - Auto-maximize Chrome windows
# =============================================================================
# Monitors Chrome windows and maximizes any that aren't fullscreen
# This ensures Playwright MCP windows are visible in VNC
# =============================================================================

export DISPLAY=:99

SCREEN_W=${SCREEN_WIDTH:-1920}
SCREEN_H=${SCREEN_HEIGHT:-1080}

# Window size (slightly smaller than screen to account for decorations)
WIN_W=$((SCREEN_W - 20))
WIN_H=$((SCREEN_H - 20))

echo "[WATCHDOG] Starting window watchdog (${WIN_W}x${WIN_H})"

# Keep track of windows we've already processed
declare -A processed_windows

while true; do
    # Find all Chrome windows
    WINDOWS=$(xdotool search --name "Chrome" 2>/dev/null || true)

    for WIN_ID in $WINDOWS; do
        # Skip if already processed this window
        if [[ -n "${processed_windows[$WIN_ID]}" ]]; then
            continue
        fi

        # Get current window geometry
        GEOM=$(xdotool getwindowgeometry "$WIN_ID" 2>/dev/null || continue)

        # Extract width and height from geometry
        CURRENT_W=$(echo "$GEOM" | grep "Geometry:" | sed 's/.*Geometry: \([0-9]*\)x.*/\1/')
        CURRENT_H=$(echo "$GEOM" | grep "Geometry:" | sed 's/.*Geometry: [0-9]*x\([0-9]*\).*/\1/')

        # Check if window is too small (less than 80% of target)
        MIN_W=$((WIN_W * 80 / 100))
        MIN_H=$((WIN_H * 80 / 100))

        if [[ "$CURRENT_W" -lt "$MIN_W" ]] || [[ "$CURRENT_H" -lt "$MIN_H" ]]; then
            echo "[WATCHDOG] Found small Chrome window $WIN_ID (${CURRENT_W}x${CURRENT_H}), maximizing..."

            # Activate and resize
            xdotool windowactivate --sync "$WIN_ID" 2>/dev/null || true
            sleep 0.2
            xdotool windowsize "$WIN_ID" "$WIN_W" "$WIN_H" 2>/dev/null || true
            xdotool windowmove "$WIN_ID" 10 10 2>/dev/null || true

            echo "[WATCHDOG] Maximized window $WIN_ID to ${WIN_W}x${WIN_H}"
        fi

        # Mark as processed
        processed_windows[$WIN_ID]=1
    done

    # Clean up old window IDs (windows that no longer exist)
    for WIN_ID in "${!processed_windows[@]}"; do
        if ! xdotool getwindowgeometry "$WIN_ID" &>/dev/null; then
            unset processed_windows[$WIN_ID]
        fi
    done

    # Sleep before next check
    sleep 2
done
