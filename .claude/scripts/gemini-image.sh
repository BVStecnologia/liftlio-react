#!/bin/bash
# Gemini Image Generator for Trello Card Covers
# Uses Google Gemini API (FREE tier) - Imagen 3 model
# Created: 2025-12-02

# Load API Key from secure env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../secrets/gemini-api.env"

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "Error: Gemini API credentials not found at $ENV_FILE"
  exit 1
fi

# Parameters
PROMPT="${1:-A modern tech illustration}"
OUTPUT_DIR="${2:-/c/Users/User/Desktop/Liftlio/liftlio-react/generated-images}"

# Create output directory if not exists
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/gemini_${TIMESTAMP}.png"

echo "🎨 Generating image with Gemini Imagen 3..."
echo "📝 Prompt: $PROMPT"

# Call Gemini API for image generation
# Note: Gemini uses imagen-3.0-generate-002 for image generation
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"instances\": [{
      \"prompt\": \"$PROMPT\"
    }],
    \"parameters\": {
      \"sampleCount\": 1,
      \"aspectRatio\": \"16:9\",
      \"personGeneration\": \"dont_allow\"
    }
  }")

# Check for errors
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ Error from API:"
  echo "$RESPONSE" | jq .
  exit 1
fi

# Extract base64 image and save
IMAGE_DATA=$(echo "$RESPONSE" | jq -r '.predictions[0].bytesBase64Encoded // empty')

if [ -z "$IMAGE_DATA" ]; then
  echo "❌ No image data in response"
  echo "Response: $RESPONSE"
  exit 1
fi

# Decode and save image
echo "$IMAGE_DATA" | base64 -d > "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
  echo "✅ Image saved to: $OUTPUT_FILE"
  echo "📏 Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
else
  echo "❌ Failed to save image"
  exit 1
fi
