#!/bin/bash

# Start Xvfb
Xvfb :99 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} &
sleep 2

# Start fluxbox window manager
DISPLAY=:99 fluxbox &
sleep 1

# Start x11vnc
x11vnc -display :99 -forever -shared -rfbport ${VNC_PORT} -passwd ${VNC_PASSWORD} -xkb -noxrecord -noxfixes -noxdamage &
sleep 1

# Start noVNC
/usr/share/novnc/utils/novnc_proxy --vnc localhost:${VNC_PORT} --listen ${NOVNC_PORT} &

# Start MCP server with DISPLAY set
export DISPLAY=:99
export HEADLESS=false
node /app/dist/index.js
