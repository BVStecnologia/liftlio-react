# Fix: Login Redirecting to Local Supabase Instead of Live

## Problem
When clicking "Continue with Google" on login page, the application was redirecting to:
```
http://127.0.0.1:54321/auth/v1/authorize?provider=google&redirect_to=http://localhost:3000/auth/callback
```

Instead of the correct live Supabase URL:
```
https://suqjifkhmekcdflwowiw.supabase.co/auth/v1/authorize?...
```

## Root Cause
The `.env.local` file in `liftlio-react/` was configured to use local Supabase (http://127.0.0.1:54321).

In React, environment file priority is:
1. **`.env.local`** ← Highest priority (was overriding everything)
2. `.env.development` (symlink to `.env.development.main`)
3. `.env`

## Solution
Rename `.env.local` to prevent it from overriding the correct Supabase configuration:

```bash
cd liftlio-react
mv .env.local .env.local.backup
npm start  # Restart server
```

## Verification
After applying the fix, check the console log on startup:

**Before:**
```
🌿 Supabase connected to: MAIN 🔵 (http://127.0.0.1:54321) ❌
```

**After:**
```
🌿 Supabase connected to: MAIN 🔵 (https://suqjifkhmekcdflwowiw.supabase.co) ✅
```

## To Apply on Another Computer
1. Pull the latest code from GitHub
2. Navigate to `liftlio-react/`
3. Check if `.env.local` exists:
   ```bash
   ls -la .env.local
   ```
4. If it exists and points to local Supabase, rename it:
   ```bash
   mv .env.local .env.local.backup
   ```
5. Restart the React server:
   ```bash
   npm start
   ```

## Current Environment Files
After this fix, the active configuration is:
- **Active:** `.env.development` → `.env.development.main` (points to LIVE Supabase)
- **Backup:** `.env.local.backup` (local Supabase config, not in use)
- **Available:** `.env.development.dev` (DEV branch Supabase)

## To Switch Back to Local Supabase (if needed)
```bash
mv .env.local.backup .env.local
npm start
```

---
**Fixed on:** 2025-11-11
**Affected:** Login flow, Google OAuth redirects
**Environment:** Development (localhost:3000)
