# YouTube Transcribe API

## Project Overview
This is a YouTube video transcription service built with FastAPI and deployed on Fly.io. The service extracts and formats transcriptions from YouTube videos with support for multiple languages.

## Key Features
- Extracts transcriptions from YouTube videos via URL
- Multi-language support (prioritizes Portuguese and English)
- Retry mechanism with exponential backoff
- Concurrent processing (up to 5 simultaneous requests)
- Formatted output with timestamps

## API Endpoints

### POST /transcribe
Returns transcription data in a simplified format.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "transcription": "formatted transcription text with timestamps",
  "video_id": "VIDEO_ID",
  "contem": true/false
}
```

### POST /process
Returns full transcription data with metadata.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

## Deployment
- Platform: Fly.io
- App name: youtube-transcribe
- Region: GRU (São Paulo)
- Resources: 2 shared CPUs, 1GB RAM
- Auto-scaling: Scales to zero when idle

## Dependencies
- fastapi - Web framework
- uvicorn - ASGI server
- youtube-transcript-api==1.1.0 - Core library for fetching YouTube transcriptions
- protonvpn-cli - Listed but not currently used

## Common Commands

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn api:app --reload
```

### Deployment
```bash
# Deploy to Fly.io
flyctl deploy

# Check app status
flyctl status

# View logs
flyctl logs
```

### Testing
```bash
# Test the API endpoint
curl -X POST "https://youtube-transcribe.fly.dev/transcribe" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

## Troubleshooting

### Issue: Empty transcriptions returned
**Solution:** Update youtube-transcript-api to version 1.1.0 or higher. Older versions (like 0.6.2) may encounter XML parsing errors with YouTube's current API.

### Issue: Connection refused errors
**Cause:** The app may take a few seconds to start up after deployment.
**Solution:** Wait a moment and retry the request.

## Recent Updates
- **2025-06-12**: Updated youtube-transcript-api from 0.6.2 to 1.1.0 to fix XML parsing errors
- Previously integrated with Supabase for storing transcriptions (currently stubbed out)

## Architecture Notes
- Uses ThreadPoolExecutor for concurrent request handling
- Implements multiple fallback strategies for fetching transcriptions
- Robust error handling and logging throughout
- Containerized with Docker for Fly.io deployment