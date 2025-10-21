#!/bin/bash

# =============================================
# Upload Image to Trello and Set as Cover
# Direct API call - No Supabase needed!
# =============================================

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <card_id> <image_path>"
    echo "Example: $0 abc123 /path/to/image.png"
    exit 1
fi

CARD_ID="$1"
IMAGE_PATH="$2"

# Check if image exists
if [ ! -f "$IMAGE_PATH" ]; then
    echo "❌ Error: Image file not found: $IMAGE_PATH"
    exit 1
fi

# Get Trello credentials from .env
ENV_FILE="/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

TRELLO_KEY=$(grep "^TRELLO_API_KEY=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
TRELLO_TOKEN=$(grep "^TRELLO_TOKEN=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$TRELLO_KEY" ] || [ -z "$TRELLO_TOKEN" ]; then
    echo "❌ Error: Trello credentials not found in .env"
    echo "Add these lines to $ENV_FILE:"
    echo "TRELLO_API_KEY=your_key"
    echo "TRELLO_API_TOKEN=your_token"
    exit 1
fi

echo "📤 Uploading cover image to Trello card: $CARD_ID"
echo "📁 Image: $IMAGE_PATH"

# Upload image and set as cover in ONE API call
RESPONSE=$(curl -s -X POST \
  "https://api.trello.com/1/cards/${CARD_ID}/attachments?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}&setCover=true" \
  -F "file=@${IMAGE_PATH}")

# Check for errors
if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ Error uploading to Trello:"
    echo "$RESPONSE"
    exit 1
fi

# Check if attachment was created successfully
if echo "$RESPONSE" | grep -q '"id"'; then
    ATTACHMENT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Cover image uploaded successfully!"
    echo "📎 Attachment ID: $ATTACHMENT_ID"
    echo "🎨 Cover automatically set!"
    exit 0
else
    echo "⚠️  Upload completed but couldn't verify attachment ID"
    echo "$RESPONSE"
    exit 0
fi
