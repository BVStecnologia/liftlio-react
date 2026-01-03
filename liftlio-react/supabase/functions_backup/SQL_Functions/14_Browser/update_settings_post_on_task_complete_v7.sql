-- =============================================
-- Trigger Function: update_settings_post_on_task_complete v7
-- Updated: 2026-01-03
--
-- CHANGES IN v7:
-- - Added support for youtube_comment task type
-- - youtube_comment only needs to update Mensagens.respondido (no SMP)
-- - Pattern matching for comment success
--
-- CHANGES IN v6:
-- - Added youtube_presence support
--
-- CHANGES IN v5:
-- - Handles both 'completed' AND 'failed' task statuses
--
-- ARCHITECTURE:
-- This trigger is the SINGLE SOURCE OF TRUTH for:
-- - Settings messages posts.status (youtube_reply/youtube_presence)
-- - Mensagens.respondido (ALL task types)
-- =============================================

DROP FUNCTION IF EXISTS public.update_settings_post_on_task_complete() CASCADE;

CREATE OR REPLACE FUNCTION public.update_settings_post_on_task_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_smp_id bigint;
    v_mensagem_id bigint;
    v_response_result text;
    v_is_success boolean := false;
    v_is_failure boolean := false;
BEGIN
    -- v7: Now also handles youtube_comment
    -- Process when status changes to 'completed' OR 'failed'
    IF NEW.status IN ('completed', 'failed')
       AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'failed'))
       AND NEW.task_type IN ('youtube_reply', 'youtube_presence', 'youtube_comment') THEN

        -- Get mensagem_id from metadata (all task types have this)
        v_mensagem_id := (NEW.metadata->>'mensagem_id')::bigint;

        -- Get settings_post_id from metadata (only youtube_reply/youtube_presence)
        v_smp_id := (NEW.metadata->>'settings_post_id')::bigint;

        -- Get response result for pattern matching
        v_response_result := COALESCE(NEW.response->>'result', '');

        -- =============================================
        -- YOUTUBE_COMMENT: Simple logic - just update Mensagens
        -- =============================================
        IF NEW.task_type = 'youtube_comment' THEN
            -- Check for permanent errors
            IF v_response_result ILIKE '%VIDEO_NOT_FOUND%'
               OR v_response_result ILIKE '%VIDEO_UNAVAILABLE%'
               OR v_response_result ILIKE '%COMMENTS_DISABLED%'
               OR v_response_result ILIKE '%LOGIN_REQUIRED%'
               OR v_response_result ILIKE '%não está mais disponível%'
               OR v_response_result ILIKE '%does not exist%'
               OR v_response_result ILIKE '%error_max_turns%'
               THEN
                v_is_failure := true;
                RAISE NOTICE '[Trigger v7] youtube_comment % -> FAILED (permanent error)', NEW.id;
            -- Check for success patterns
            ELSIF v_response_result ILIKE '%COMMENT:SUCCESS%'
               OR v_response_result ILIKE '%comment has been posted%'
               OR v_response_result ILIKE '%comment was posted%'
               OR v_response_result ILIKE '%successfully posted%'
               OR v_response_result ILIKE '%posted successfully%'
               OR v_response_result ILIKE '%há 0 segundo%'
               OR v_response_result ILIKE '%há 1 segundo%'
               OR v_response_result ILIKE '%0 seconds ago%'
               OR v_response_result ILIKE '%1 second ago%'
               THEN
                v_is_success := true;
            END IF;

            -- Update Mensagens.respondido if success
            IF v_is_success AND v_mensagem_id IS NOT NULL THEN
                UPDATE "Mensagens"
                SET respondido = true
                WHERE id = v_mensagem_id;

                RAISE NOTICE '[Trigger v7] youtube_comment % -> SUCCESS, Mensagem % -> respondido=true', NEW.id, v_mensagem_id;
            ELSIF NOT v_is_success AND NOT v_is_failure THEN
                RAISE NOTICE '[Trigger v7] youtube_comment % -> no match (result: %)', NEW.id, LEFT(v_response_result, 100);
            END IF;

            RETURN NEW;
        END IF;

        -- =============================================
        -- YOUTUBE_REPLY and YOUTUBE_PRESENCE: Original logic with SMP
        -- =============================================
        IF v_smp_id IS NOT NULL THEN
            -- If task status is 'failed', immediately mark SMP as failed
            IF NEW.status = 'failed' THEN
                UPDATE "Settings messages posts"
                SET status = 'failed'
                WHERE id = v_smp_id;

                RAISE NOTICE '[Trigger v7] Task failed -> SMP % marked as failed', v_smp_id;
                RETURN NEW;
            END IF;

            -- FAILURE PATTERNS
            IF v_response_result ILIKE '%error_max_turns%'
               OR v_response_result ILIKE '%COMMENT_NOT_FOUND%'
               OR v_response_result ILIKE '%VIDEO_NOT_FOUND%'
               OR v_response_result ILIKE '%VIDEO_UNAVAILABLE%'
               OR v_response_result ILIKE '%COMMENTS_DISABLED%'
               OR v_response_result ILIKE '%LOGIN_REQUIRED%'
               OR v_response_result ILIKE '%REPLY_BLOCKED%'
               OR v_response_result ILIKE '%ERROR:%'
               OR v_response_result ILIKE '%Which comment would you like%'
               OR v_response_result ILIKE '%Which comment should I%'
               OR v_response_result ILIKE '%I can see several comments%'
               OR v_response_result ILIKE '%I can see comments from%'
               OR v_response_result ILIKE '%I can see multiple comments%'
               OR v_response_result ILIKE '%Please specify which comment%'
               OR v_response_result ILIKE '%Could you please clarify%'
               OR v_response_result ILIKE '%ERR_TUNNEL%'
               OR v_response_result ILIKE '%ERR_CONNECTION%'
               OR v_response_result ILIKE '%ERR_NETWORK%'
               OR v_response_result ILIKE '%Sem conexão%'
               OR v_response_result ILIKE '%No Internet%'
               OR v_response_result ILIKE '%connectivity%issue%'
               OR v_response_result ILIKE '%Network connectivity%'
               THEN
                v_is_failure := true;
            END IF;

            -- SUCCESS PATTERNS
            IF NOT v_is_failure THEN
                IF v_response_result ILIKE '%REPLY:SUCCESS%'
                   OR v_response_result ILIKE '%successfully posted%'
                   OR v_response_result ILIKE '%successfully replied%'
                   OR v_response_result ILIKE '%successfully completed%'
                   OR v_response_result ILIKE '%posted successfully%'
                   OR v_response_result ILIKE '%reply has been posted%'
                   OR v_response_result ILIKE '%reply has been successfully%'
                   OR v_response_result ILIKE '%reply was posted%'
                   OR v_response_result ILIKE '%reply posted%'
                   OR v_response_result ILIKE '%comment has been posted%'
                   OR v_response_result ILIKE '%comment was posted%'
                   OR v_response_result ILIKE '%Task completed%posted%'
                   OR v_response_result ILIKE '%Task Completed Successfully%'
                   OR v_response_result ILIKE '%SUCCESS!%'
                   OR v_response_result ILIKE '%há 0 segundo%'
                   OR v_response_result ILIKE '%há 1 segundo%'
                   OR v_response_result ILIKE '%0 seconds ago%'
                   OR v_response_result ILIKE '%1 second ago%'
                   THEN
                    v_is_success := true;
                END IF;
            END IF;

            IF v_is_success THEN
                UPDATE "Settings messages posts"
                SET status = 'posted', postado = NOW()
                WHERE id = v_smp_id;

                IF v_mensagem_id IS NOT NULL THEN
                    UPDATE "Mensagens"
                    SET respondido = true
                    WHERE id = v_mensagem_id;
                END IF;

                RAISE NOTICE '[Trigger v7] SMP % -> posted, Mensagem % -> respondido', v_smp_id, v_mensagem_id;
            ELSE
                UPDATE "Settings messages posts"
                SET status = 'failed'
                WHERE id = v_smp_id;

                RAISE NOTICE '[Trigger v7] SMP % -> failed (pattern: %)', v_smp_id,
                    CASE WHEN v_is_failure THEN 'explicit_failure' ELSE 'no_success_marker' END;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_smp_on_task_complete ON browser_tasks;

CREATE TRIGGER trigger_update_smp_on_task_complete
    AFTER UPDATE ON browser_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_post_on_task_complete();

COMMENT ON FUNCTION update_settings_post_on_task_complete IS 'v7: Added youtube_comment support. Updates Mensagens.respondido when comment is posted successfully.';
