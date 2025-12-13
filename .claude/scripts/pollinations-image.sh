#!/bin/bash
# Pollinations Image Generator for Trello Card Covers
# Uses Pollinations AI API (100% FREE, no API key needed!)
# Created: 2025-12-02

# Parameters
PROMPT="${1:-A modern tech illustration}"
OUTPUT_DIR="${2:-/c/Users/User/Desktop/Liftlio/liftlio-react/generated-images}"
WIDTH="${3:-1200}"
HEIGHT="${4:-675}"

# Create output directory if not exists
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/pollinations_${TIMESTAMP}.jpg"

echo "Generating image with Pollinations AI (FREE)..."
echo "Prompt: $PROMPT"
echo "Size: ${WIDTH}x${HEIGHT}"

# URL encode the prompt
ENCODED_PROMPT=$(echo "$PROMPT" | sed 's/ /%20/g' | sed 's/,/%2C/g')

# Call Pollinations API (completely free, no API key)
curl -s -o "$OUTPUT_FILE" "https://image.pollinations.ai/prompt/${ENCODED_PROMPT}?width=${WIDTH}&height=${HEIGHT}&nologo=true"

if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
  SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo "Image saved to: $OUTPUT_FILE"
  echo "Size: $SIZE"
else
  echo "Failed to generate image"
  rm -f "$OUTPUT_FILE"
  exit 1
fi
