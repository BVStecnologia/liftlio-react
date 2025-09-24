#!/bin/bash

# GPT-Image-1 Generator Script for Liftlio
# Generates images using OpenAI API
# IMPORTANT: Always use model "dall-e-3" (this is the actual model name for GPT-Image-1)

# Check if required parameters are provided
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <prompt> [size] [quality]"
    echo "Size options: 1024x1024, 1792x1024, 1024x1792 (default: 1792x1024)"
    echo "Quality options: standard, hd (default: hd)"
    exit 1
fi

PROMPT="$1"
SIZE="${2:-1792x1024}"
QUALITY="${3:-hd}"

# OpenAI API Key (should be set in environment or here)
API_KEY="${OPENAI_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "Error: OPENAI_API_KEY not set"
    exit 1
fi

# Create output directory if it doesn't exist
OUTPUT_DIR="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/generated-images"
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for unique filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME_BASE="gpt_image_1_${TIMESTAMP}"

# Create sanitized filename from prompt (first 50 chars, alphanumeric only)
PROMPT_SLUG=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | cut -c1-50)
FILENAME="${FILENAME_BASE}_${PROMPT_SLUG}.png"
OUTPUT_PATH="$OUTPUT_DIR/$FILENAME"

echo "Generating image with GPT-Image-1 (dall-e-3)..."
echo "Prompt: $PROMPT"
echo "Size: $SIZE"
echo "Quality: $QUALITY"

# Call OpenAI API
RESPONSE=$(curl -s -X POST https://api.openai.com/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"model\": \"dall-e-3\",
    \"prompt\": \"$PROMPT\",
    \"n\": 1,
    \"size\": \"$SIZE\",
    \"quality\": \"$QUALITY\"
  }")

# Check if response contains base64 data (gpt-image-1 format)
B64_JSON=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', [{}])[0].get('b64_json', ''))" 2>/dev/null)

if [ -n "$B64_JSON" ]; then
    # Decode base64 image
    echo "Decoding base64 image..."
    echo "$B64_JSON" | base64 -d > "$OUTPUT_PATH"
else
    # Extract URL from response (fallback for URL-based response)
    IMAGE_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', [{}])[0].get('url', ''))" 2>/dev/null)

    if [ -n "$IMAGE_URL" ]; then
        # Download image from URL
        echo "Downloading image..."
        curl -s "$IMAGE_URL" -o "$OUTPUT_PATH"
    else
        echo "Error: Failed to generate image"
        echo "Response: $RESPONSE" | head -n 5
        exit 1
    fi
fi

if [ -f "$OUTPUT_PATH" ]; then
    echo "✅ Image saved to: $OUTPUT_PATH"
    
    # Return the path for further processing
    echo "PATH:$OUTPUT_PATH"
else
    echo "Error: Failed to download image"
    exit 1
fi