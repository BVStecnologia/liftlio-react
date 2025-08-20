#!/bin/bash

# GPT-Image-1 Generator Script for Liftlio
# Generates images using OpenAI DALL-E API

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

echo "Generating image with GPT-Image-1..."
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

# Extract URL from response
IMAGE_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*' | grep -o 'http[^"]*' | head -1)

if [ -z "$IMAGE_URL" ]; then
    echo "Error: Failed to generate image"
    echo "Response: $RESPONSE"
    exit 1
fi

# Download the image
echo "Downloading image..."
curl -s "$IMAGE_URL" -o "$OUTPUT_PATH"

if [ -f "$OUTPUT_PATH" ]; then
    echo "✅ Image saved to: $OUTPUT_PATH"
    echo "Image URL: $IMAGE_URL"
    
    # Return the path for further processing
    echo "PATH:$OUTPUT_PATH"
else
    echo "Error: Failed to download image"
    exit 1
fi