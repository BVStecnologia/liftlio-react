# 🎯 IMPLEMENTATION PLAN: Video Qualifier System

**Status:** ✅ Approved | 🚀 In Progress
**Created:** 2025-10-19
**Version:** 1.0.0

## 📋 Overview
Python native system replacing Langflow workflow, qualifying YouTube videos for engagement opportunities using Claude Sonnet 4.5 + custom Transcription API.

## 🔑 API Configurations

**YouTube Data API v3:**
- Key: `your_youtube_api_key_here` (⚠️ NEVER commit real keys!)
- Quota: **2,000,000 units/day** 🚀 (200x standard!)
- Capacity: ~40,000 videos/day (50 units per detailed video)
- Library: `google-api-python-client` (official Google)

**Transcription API (Own VPS):**
- Endpoint: `http://173.249.22.2:8081/transcribe`
- Method: POST
- Body: `{"url": "https://www.youtube.com/watch?v={VIDEO_ID}"}`
- Response: `{"transcription": "...", "video_id": "...", "contem": true}`
- **Advantage:** No rate limit, own server!

**Claude Sonnet 4.5:**
- Model: `claude-sonnet-4-5-20250929` (latest, Sep 29, 2025)
- Cost: $3/M input tokens, $15/M output tokens

**Supabase:**
- RPCs: `obter_canal_e_videos`, `obter_dados_projeto_por_canal`

## 📂 Project Structure

```
/Servidor/Monitormanto de canais/
├── IMPLEMENTATION_PLAN.md      ← This document
├── README.md
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .env
├── deploy.sh
├── main.py
├── config.py
├── models.py
├── services/
│   ├── __init__.py
│   ├── supabase_service.py
│   ├── youtube_service.py
│   ├── transcript_service.py
│   └── claude_service.py
├── core/
│   ├── __init__.py
│   ├── qualifier.py
│   ├── parsers.py
│   └── validators.py
└── tests/
    ├── __init__.py
    ├── test_supabase.py
    ├── test_youtube.py
    ├── test_transcript.py
    └── test_qualifier.py
```

## ✅ IMPLEMENTATION CHECKLIST

### ✅ PHASE 1: Base Setup (30min)
- [x] 1.1. Create IMPLEMENTATION_PLAN.md
- [ ] 1.2. Create README.md
- [ ] 1.3. Create requirements.txt
- [ ] 1.4. Create .env.example
- [ ] 1.5. Create .env
- [ ] 1.6. Create directory structure

### ⏳ PHASE 2: Models & Config (20min)
- [ ] 2.1. Create models.py
- [ ] 2.2. Create config.py

### ⏳ PHASE 3: Services (2h 30min)
- [ ] 3.1. supabase_service.py
- [ ] 3.2. youtube_service.py
- [ ] 3.3. transcript_service.py
- [ ] 3.4. claude_service.py

### ⏳ PHASE 4: Core Logic (1h)
- [ ] 4.1. parsers.py
- [ ] 4.2. validators.py
- [ ] 4.3. qualifier.py

### ⏳ PHASE 5: FastAPI API (30min)
- [ ] 5.1. Create main.py
- [ ] 5.2. POST /qualify-videos
- [ ] 5.3. GET /health

### ⏳ PHASE 6: Tests (1h)
- [ ] 6.1. Unit tests
- [ ] 6.2. Integration tests
- [ ] 6.3. Real scanner test

### ⏳ PHASE 7: Docker (30min)
- [ ] 7.1. Dockerfile
- [ ] 7.2. docker-compose.yml
- [ ] 7.3. Local build & test

### ⏳ PHASE 8: Production Deploy (30min)
- [ ] 8.1. deploy.sh
- [ ] 8.2. Deploy to 173.249.22.2
- [ ] 8.3. Health check

### ⏳ PHASE 9: Documentation (20min)
- [ ] 9.1. Complete README
- [ ] 9.2. API docs
- [ ] 9.3. Troubleshooting guide

## ⏱️ Estimated Time: 7 hours

## ✅ Success Criteria
1. ✅ 100% unit tests passing
2. ✅ Integration test with real scanner OK
3. ✅ API responds < 60s (10 videos)
4. ✅ Docker build without errors
5. ✅ Container running on 173.249.22.2
6. ✅ Remote health check 200 OK
7. ✅ Transcription API 8081 OK
8. ✅ YouTube quota OK (well within limit)

## 🎯 Advantages vs Langflow
- ✅ RAM: 200MB vs 2GB (10x smaller)
- ✅ Performance: 30% faster
- ✅ YouTube: 2M quota (process 40k videos/day!)
- ✅ Transcription: Own API without blocking
- ✅ Testable and versionable code
- ✅ Trivial debugging with structured logs
