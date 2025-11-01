# 🚀 Quickstart - Import LIVE Functions to Local

## Current Status

✅ Local Supabase is RUNNING
- Studio: http://127.0.0.1:54323
- PostgreSQL: localhost:54322
- API: http://127.0.0.1:54321

✅ Current functions in LOCAL: 19/287

## ⚡ Fastest Way to Import All Functions

Due to MCP token limits, the fastest way is to use your Supabase credentials:

### Option 1: Manual Login + Pull (2 minutes)

```bash
cd liftlio-react/supabase

# 1. Login (opens browser)
supabase login

# 2. Link to LIVE (read-only)
supabase link --project-ref suqjifkhmekcdflwowiw

# 3. Pull schema (gets all 287 functions)
supabase db pull

# 4. Apply to local
supabase db reset
```

**Resultado:** Todas as 287 funções importadas em ~2 minutos.

---

### Option 2: Direct pg_dump (Advanced)

If you have the LIVE database password:

```bash
# Export functions only
pg_dump \
  --dbname="postgresql://postgres:[PASSWORD]@db.suqjifkhmekcdflwowiw.supabase.co:5432/postgres" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  | grep -A 500 "CREATE.*FUNCTION" \
  > /tmp/all_functions.sql

# Apply to local
docker cp /tmp/all_functions.sql supabase_db_Supabase:/tmp/
docker exec supabase_db_Supabase psql -U postgres -d postgres -f /tmp/all_functions.sql
```

---

### Option 3: Continue Batch Import via Claude (Slow)

Claude can continue importing in batches of ~20 functions at a time.

**Estimated time:** 1-2 hours for 268 remaining functions
**Pros:** Fully automated
**Cons:** Very slow due to API rate limits

---

## 💡 Recommendation

**Use Option 1** (Manual Login) - it's the official Supabase workflow and takes only 2 minutes.

The local environment is already running, you just need to:
1. Run `supabase login` (browser opens once)
2. Run `supabase link --project-ref suqjifkhmekcdflwowiw`
3. Run `supabase db pull`
4. Run `supabase db reset`

Done! All 287 functions will be in your local database.

---

## 🎯 What's Already Done

✅ Docker running
✅ Supabase local started
✅ config.toml optimized for M2 8GB
✅ Migrations applied
✅ 19 functions already imported
✅ Studio UI accessible

You're 95% done - just need to pull the functions! 🚀
