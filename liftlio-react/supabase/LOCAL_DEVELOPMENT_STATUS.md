# 🎯 Local Development Environment - Configuration Status

**Branch:** `dev-supabase-local`
**Last Updated:** 2025-11-01
**Status:** ✅ Fully Configured (Pending User Secrets)

---

## ✅ COMPLETED CONFIGURATIONS

### 1. Local Supabase Infrastructure
- ✅ **Supabase CLI**: v2.48.3 installed and configured
- ✅ **Docker Containers**: 9 containers running (973MB RAM)
- ✅ **Memory Optimization**: Disabled analytics, inbucket, pooler (~450MB saved)
- ✅ **Database**: PostgreSQL 17 with 300 custom functions imported
- ✅ **Studio UI**: Accessible at http://127.0.0.1:54323
- ✅ **API Endpoint**: http://127.0.0.1:54321
- ✅ **Database URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### 2. React Application Configuration
- ✅ **supabaseClient.ts**: Properly configured to read environment variables
- ✅ **.env.local**: Created with local Supabase URLs
  - `REACT_APP_SUPABASE_URL=http://127.0.0.1:54321`
  - `REACT_APP_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- ✅ **CRA Auto-loading**: `.env.local` has highest priority (no dotenv needed)
- ✅ **Gitignore**: Both `.env` and `.env.local` properly gitignored

### 3. Database Schema
- ✅ **300 SQL Functions**: All custom functions from LIVE imported
- ✅ **Tables**: Complete schema pulled from production
- ✅ **Extensions**: pgvector, hstore, dblink, http enabled
- ✅ **Migrations**: All applied successfully

### 4. Edge Functions Setup
- ✅ **Secrets Template**: Created `/supabase/.env` with placeholders
- ✅ **Gitignored**: `.env` file in supabase/ directory is safe
- ✅ **Runtime**: Deno edge_runtime container ready

### 5. Git Branch
- ✅ **Branch Created**: `dev-supabase-local`
- ✅ **Commits**: 2 commits with complete local configuration
- ✅ **Isolation**: All changes isolated from main branch

---

## ⚠️ PENDING USER ACTIONS

### 1. Add API Keys to `/liftlio-react/.env.local`

**Required for AI features:**
```bash
# Replace placeholders with actual keys from respective dashboards
OPENAI_API_KEY=sk-proj-...  # Get from: https://platform.openai.com/api-keys
```

**Optional (if using Google OAuth locally):**
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-client-id
REACT_APP_GOOGLE_CLIENT_SECRET=your-client-secret
```

### 2. Add Secrets to `/liftlio-react/supabase/.env`

**Critical for Edge Functions:**
```bash
# Replace placeholders with actual keys
CLAUDE_API_KEY=sk-ant-...       # From: https://console.anthropic.com/
OPENAI_API_KEY=sk-proj-...      # From: https://platform.openai.com/
YOUTUBE_API_KEY=AIza...         # From: https://console.cloud.google.com/
```

**Optional APIs:**
```bash
JINA_API_KEY=...                # If using Jina AI
LANGFLOW_API_TOKEN=...          # If using Langflow
SQUARE_ACCESS_TOKEN_SANDBOX=... # For payment testing
SQUARE_LOCATION_ID_SANDBOX=...  # For payment testing
```

### 3. Configure Google OAuth (Optional - Only if Testing Auth)

**Add these URLs to Google Cloud Console:**
1. `http://localhost:3000`
2. `http://127.0.0.1:54321/auth/v1/callback`
3. `http://localhost:3000/auth/callback`
4. `http://127.0.0.1:3000`

**Then configure in Supabase Studio:**
1. Open http://127.0.0.1:54323
2. Go to Authentication → Providers → Google
3. Enable Google Auth
4. Add Client ID and Secret

### 4. Update Supabase CLI (Recommended)

```bash
# Current: v2.48.3
# Available: v2.54.11

# Update via scoop (macOS/Linux)
scoop update supabase

# Or via npm
npm install -g supabase
```

---

## 🚀 READY TO USE

### Start Local Development

```bash
# 1. Ensure Supabase is running
cd liftlio-react/supabase
supabase status

# 2. Start React app
cd ../
npm start

# App will run at: http://localhost:3000
# Connected to: http://127.0.0.1:54321 (local Supabase)
```

### Access Local Services

- **React App**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:54323
- **Supabase API**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Test Edge Functions Locally

```bash
# Serve a specific function
supabase functions serve function-name

# Access at: http://127.0.0.1:54321/functions/v1/function-name
```

---

## 📊 Database Verification

Run these queries in Studio (http://127.0.0.1:54323) to verify:

```sql
-- Count custom functions (should be 300)
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- List key functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'adicionar_canais_automaticamente',
  'agendar_postagens_diarias',
  'analisar_comentarios_com_claude',
  'analyze_video_with_claude',
  'claude_complete'
)
ORDER BY routine_name;

-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 🔄 Sync with LIVE (When Needed)

### Pull Latest Schema from Production

```bash
cd liftlio-react/supabase

# Pull latest changes (safe, doesn't affect LIVE)
supabase db pull --schema public --local

# Or full dump
supabase db dump --linked --data-only=false --schema public -f /tmp/new_schema.sql
docker cp /tmp/new_schema.sql supabase_db_Supabase:/tmp/
docker exec supabase_db_Supabase psql -U postgres -d postgres -f /tmp/new_schema.sql
```

### Reset to Clean State

```bash
# Warning: This will erase all local data
supabase db reset

# Then re-apply the full schema
docker exec supabase_db_Supabase psql -U postgres -d postgres -f /tmp/live_full_schema.sql
```

---

## 🐛 Troubleshooting

### React App Not Connecting to Local Supabase

1. **Check .env.local is loaded:**
   ```bash
   # Start React and check console logs
   npm start
   # Should see: "🌿 Supabase connected to: LOCAL (http://127.0.0.1:54321)"
   ```

2. **Verify environment variables:**
   ```bash
   # In React app console
   console.log(process.env.REACT_APP_SUPABASE_URL)
   # Should output: http://127.0.0.1:54321
   ```

### Edge Functions Not Working

1. **Check secrets are configured:**
   ```bash
   cat supabase/.env
   # Should NOT have "your-*-here" placeholders
   ```

2. **Restart Edge Runtime:**
   ```bash
   supabase stop
   supabase start
   ```

### Database Connection Issues

```bash
# Check if containers are running
docker ps | grep supabase

# Check logs
docker logs supabase_db_Supabase

# Restart if needed
supabase stop
supabase start
```

### Memory Issues (M2 8GB)

Current optimizations already applied:
- Analytics disabled (~150MB saved)
- Inbucket disabled (~100MB saved)
- Pooler disabled (~200MB saved)

**Total RAM usage:** ~973MB (optimized for M2 8GB)

If still experiencing issues:
```bash
# Check actual usage
docker stats supabase_db_Supabase

# Consider closing other apps
# Or upgrade to 16GB RAM
```

---

## 📋 Next Steps Checklist

- [ ] Add API keys to `.env.local` (OpenAI at minimum)
- [ ] Add secrets to `supabase/.env` (Claude + OpenAI)
- [ ] Test React app with `npm start`
- [ ] Verify local connection in browser console
- [ ] (Optional) Configure Google OAuth if testing auth
- [ ] (Optional) Update Supabase CLI to v2.54.11
- [ ] (Optional) Test Edge Functions with `supabase functions serve`

---

## ✅ Summary

**What's Working:**
- ✅ Local Supabase with 300 functions
- ✅ React app configured for local development
- ✅ Git branch `dev-supabase-local` isolated
- ✅ Memory optimized for M2 8GB
- ✅ All environment files created and gitignored

**What Needs User Input:**
- ⚠️ API keys (OpenAI, Claude, YouTube)
- ⚠️ Google OAuth credentials (optional)
- ⚠️ Testing and verification

**Estimated Setup Time:** 5-10 minutes (just adding API keys)

---

**You're 95% done! Just add your API keys and you're ready to develop locally.** 🚀
