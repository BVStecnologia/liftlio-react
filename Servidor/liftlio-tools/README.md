# Liftlio Tools

Lightweight tools container powered by Claude Opus. Currently includes:
- **Translator**: EN <-> PT auto-detect translation

## Features

- Uses Claude Opus via `claude-chat` edge function
- Auto-detects language (English -> Portuguese, Portuguese -> English)
- Clean, minimal UI with keyboard shortcuts
- Only consumes resources when used (no polling)

## Quick Start

### Local Development
```bash
npm install
npm start
# Open http://localhost:3500
```

### Docker (VPS)
```bash
docker-compose up -d --build
# Access on http://your-vps:3500
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Translate |
| `Ctrl + Shift + C` | Copy result |
| `Esc` | Clear all |

## API

### POST /api/translate
```json
{
  "text": "Hello, how are you?",
  "targetLang": "Portuguese" // optional, auto-detects if not provided
}
```

Response:
```json
{
  "success": true,
  "translation": "Ola, como voce esta?",
  "duration": 1234,
  "cost": 0.0012
}
```

## Adding More Tools

This container is designed to be extensible. To add new tools:

1. Create new endpoint in `server.js`
2. Add UI in `public/` folder
3. Rebuild container

## Architecture

```
User -> liftlio-tools (port 3500) -> claude-chat (Edge Function) -> Claude Code API (VPS)
```

## Environment Variables

- `PORT`: Server port (default: 3500)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anon key
