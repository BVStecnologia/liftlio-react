#!/usr/bin/env python3
import os
import sys
import requests
import json
from datetime import datetime

# OpenAI API Configuration
api_key = os.environ.get('OPENAI_API_KEY')
if not api_key:
    print("Error: OPENAI_API_KEY not set")
    sys.exit(1)

# Image generation parameters
prompt = "SQL database fortress protecting 251 functions, purple gradient #8b5cf6 to #a855f7, Liftlio branding, achievement unlocked visualization, modern tech aesthetic, glowing database icons, secure vault, success checkmarks, trophy or medal"
size = "1792x1024"
quality = "hd"

# API Request
url = "https://api.openai.com/v1/images/generations"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
data = {
    "model": "dall-e-3",
    "prompt": prompt,
    "n": 1,
    "size": size,
    "quality": quality
}

print(f"Generating image with DALL-E 3...")
print(f"Prompt: {prompt}")

try:
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    result = response.json()
    image_url = result['data'][0]['url']

    # Download the image
    image_response = requests.get(image_url)
    image_response.raise_for_status()

    # Save the image
    output_dir = "/Users/valdair/Documents/Projetos/Liftlio/liftlio-react/generated-images"
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"sql_backup_achievement_{timestamp}.png"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, 'wb') as f:
        f.write(image_response.content)

    print(f"✅ Image saved to: {filepath}")
    print(f"Image URL: {image_url}")

    # Save the URL for later use
    with open(os.path.join(output_dir, "last_image_url.txt"), 'w') as f:
        f.write(image_url)

except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
    if hasattr(e, 'response') and e.response:
        print(f"Response: {e.response.text}")
    sys.exit(1)