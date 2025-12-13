#!/bin/bash
# Start browser on google.com at container startup

sleep 5

# Find Playwright Chrome dynamically
CHROME_PATH=$(find /ms-playwright -name "chrome" -type f -path "*/chrome-linux/*" 2>/dev/null | head -1)

if [ -n "$CHROME_PATH" ]; then
    DISPLAY=:99 "$CHROME_PATH" \
        --no-sandbox \
        --disable-dev-shm-usage \
        --disable-gpu \
        --start-maximized \
        --disable-infobars \
        --disable-session-crashed-bubble \
        --disable-features=TranslateUI \
        --no-first-run \
        --no-default-browser-check \
        "https://www.google.com" &
    echo "Browser started with google.com"
else
    echo "Chrome not found in /ms-playwright"
fi
