-- =============================================
-- Function: create_daily_presence_tasks
-- Description: Creates one youtube_presence task per project with Daily Presence enabled
-- Created: 2026-01-01
-- Updated: 2026-01-02 (synced from LIVE)
-- Schedule: Runs daily at 6:00 AM UTC via cron
-- =============================================

DROP FUNCTION IF EXISTS create_daily_presence_tasks();

CREATE OR REPLACE FUNCTION public.create_daily_presence_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_project RECORD;
    v_last_task_time TIMESTAMPTZ;
    v_base_delay INT;
    v_random_offset INT;
    v_final_delay INT;
    v_task_id UUID;
    v_count INT := 0;
    v_prompt TEXT;
BEGIN
    -- Loop through all projects with daily presence enabled
    FOR v_project IN
        SELECT
            p.id,
            p."Project name",
            p."description service",
            p."País"
        FROM "Projeto" p
        WHERE p."Youtube Active" = true
          AND p.daily_presence_active = true
          AND p."description service" IS NOT NULL
          AND p."País" IS NOT NULL
    LOOP
        -- Get the last task creation time for this project
        SELECT created_at INTO v_last_task_time
        FROM browser_tasks
        WHERE project_id = v_project.id
          AND task_type = 'youtube_presence'
        ORDER BY created_at DESC
        LIMIT 1;

        -- Calculate delay based on last task
        IF v_last_task_time IS NULL THEN
            -- First task ever: random 30-180 minutes from now
            v_final_delay := 30 + floor(random() * 150)::INT;
        ELSE
            -- Extract hour from last task (0-23)
            v_base_delay := EXTRACT(HOUR FROM v_last_task_time)::INT * 60
                          + EXTRACT(MINUTE FROM v_last_task_time)::INT;

            -- Add random offset of -120 to +120 minutes (2 hours variance)
            v_random_offset := floor(random() * 240)::INT - 120;

            -- Final delay is base + offset, clamped to 30-1380 (30min to 23h)
            v_final_delay := GREATEST(30, LEAST(1380, v_base_delay + v_random_offset));
        END IF;

        -- Build the prompt with project context
        v_prompt := format(
            E'# DAILY PRESENCE TASK - YouTube Engagement\n\n'
            '## Your Mission\n'
            'Find a relevant YouTube video, engage naturally, and leave a helpful comment to build authority.\n\n'
            '## Product/Service Context (for finding relevant videos)\n'
            '```\n%s\n```\n\n'
            '## Target Country & Language\n'
            '**Country:** %s\n'
            '**Comment Language:** Use the primary language of %s\n\n'
            '## Step-by-Step Instructions\n'
            '1. **Search YouTube** for videos where the audience might be interested in topics related to the context above\n'
            '2. **Find a video** with comments enabled that you have NOT interacted with before\n'
            '3. **Watch the video** at 2x speed for at least 2 minutes to understand the content\n'
            '4. **Like the video** if the content is good\n'
            '5. **Read existing comments** and like 2-3 relevant ones\n'
            '6. **Write a helpful comment** (2-3 sentences):\n'
            '   - Add genuine value or insight related to the video content\n'
            '   - Share a relevant tip, experience, or perspective\n'
            '   - Be conversational and authentic\n'
            '   - **DO NOT mention any product, service, or brand**\n'
            '   - **DO NOT include links or promotional content**\n'
            '7. **If comments are disabled**, find another video and repeat from step 2\n\n'
            '## Important Notes\n'
            '- This is about building presence and authority, NOT promotion\n'
            '- Quality over quantity - one thoughtful comment is better than many generic ones\n'
            '- Engage with the community naturally\n'
            '- Report back with the video URL and your comment text',
            LEFT(COALESCE(v_project."description service", ''), 1000),
            COALESCE(v_project."País", 'Brasil'),
            COALESCE(v_project."País", 'Brasil')
        );

        -- Insert the task with calculated delay
        INSERT INTO browser_tasks (
            id,
            project_id,
            task_type,
            task,
            status,
            priority,
            created_at,
            scheduled_for
        ) VALUES (
            gen_random_uuid(),
            v_project.id,
            'youtube_presence',
            v_prompt,
            'pending',
            5,  -- Lower priority than monitoring tasks
            NOW(),
            NOW() + (v_final_delay || ' minutes')::INTERVAL
        )
        RETURNING id INTO v_task_id;

        v_count := v_count + 1;

        RAISE NOTICE 'Created presence task % for project % (delay: % min)',
            v_task_id, v_project."Project name", v_final_delay;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'tasks_created', v_count,
        'timestamp', NOW()
    );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_daily_presence_tasks() TO service_role;
