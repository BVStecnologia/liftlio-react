# Daily YouTube Presence System

## Overview

The Daily Presence feature automatically creates one YouTube engagement task per day for each project that has the feature enabled. The Browser Agent autonomously searches for relevant videos and leaves helpful, genuine comments to build brand authority.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY PRESENCE FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐ │
│  │   Cron Job   │───▶│ create_daily_   │───▶│ browser_tasks  │ │
│  │  6:00 AM UTC │    │ presence_tasks()│    │ (pending)      │ │
│  └──────────────┘    └─────────────────┘    └───────┬────────┘ │
│                                                      │          │
│                      ┌───────────────────────────────┘          │
│                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  browser-dispatch                        │   │
│  │  (checks scheduled_for before dispatching)               │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Browser Agent (VPS)                        │   │
│  │  1. Search YouTube for relevant videos                   │   │
│  │  2. Find video with comments enabled                     │   │
│  │  3. Watch and understand content                         │   │
│  │  4. Leave helpful, genuine comment                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database Schema

**Projeto table** (new column):
- `daily_presence_active` (BOOLEAN, default false): Toggle to enable/disable the feature

**browser_tasks table** (new column):
- `scheduled_for` (TIMESTAMPTZ): When set, task won't be dispatched until this time

### 2. SQL Function

`create_daily_presence_tasks()`:
- Runs daily at 6:00 AM UTC via cron
- Creates one task per project with `daily_presence_active = true`
- Calculates random timing based on last task's creation time
- Uses project's `description service` and `País` for context

### 3. Edge Function Update

`browser-dispatch` (v19+):
- Filters tasks by `scheduled_for` - only dispatches when time is reached
- Query: `.or('scheduled_for.is.null,scheduled_for.lte.${now}')`

### 4. Frontend

Settings page → YouTube platform section:
- Toggle "Enable Daily Presence"
- Description explains the feature

## Task Timing Algorithm

The system creates variation in posting times to appear more natural:

1. **First task ever**: Random delay 30-180 minutes from midnight
2. **Subsequent tasks**: Based on previous task's creation time ± 2 hours
3. **Clamped range**: Always between 30 minutes and 23 hours from midnight

```sql
-- Example: Last task was at 14:30 UTC
v_base_delay = 14 * 60 + 30 = 870 minutes
v_random_offset = random between -120 and +120
v_final_delay = GREATEST(30, LEAST(1380, 870 + offset))
-- Result: Task scheduled between ~12:30 and ~16:30 UTC
```

## Task Type

Uses `task_type = 'youtube_presence'` to distinguish from:
- `youtube_reply`: Reply to comments on monitored videos
- Regular monitoring tasks

## Key Rules for Comments

1. **NO product mentions** - Pure value, no self-promotion
2. **Relevant to video content** - Watch before commenting
3. **Genuine and helpful** - Add real value to discussion
4. **Appropriate language** - Based on project's `País` field
5. **Fallback** - If comments disabled, find another video

## Files

1. `01_add_daily_presence_active_to_projeto.sql` - Adds toggle column
2. `02_add_scheduled_for_to_browser_tasks.sql` - Adds scheduling column
3. `03_create_daily_presence_tasks.sql` - Main function
4. `04_create_daily_presence_cron.sql` - Cron job setup

## Enabling for a Project

1. Go to Settings → Select project
2. Ensure YouTube is active
3. Enable "Daily Presence" toggle
4. Save

## Monitoring

Check cron execution:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-presence-tasks')
ORDER BY start_time DESC
LIMIT 10;
```

Check pending presence tasks:
```sql
SELECT id, project_id, scheduled_for, status, created_at
FROM browser_tasks
WHERE task_type = 'youtube_presence'
ORDER BY created_at DESC
LIMIT 20;
```

## Created

- **Date**: 2026-01-01
- **Author**: Claude Code
- **Version**: 1.0
