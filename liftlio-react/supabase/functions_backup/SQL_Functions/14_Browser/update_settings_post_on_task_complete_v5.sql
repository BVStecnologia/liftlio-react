-- =============================================
-- Trigger Function: update_settings_post_on_task_complete v5
-- Updated: 2025-12-31
--
-- CHANGES IN v5:
-- - Now handles BOTH 'completed' AND 'failed' task statuses
-- - When status = 'failed', immediately marks SMP as 'failed'
-- - Prevents SMP from getting stuck in 'processing' forever
--
-- CHANGES IN v4:
-- - Added task_type conditional (only youtube_reply)
-- - Future-proof for Reddit platform
--
-- ARCHITECTURE (NO DUPLICATION):
-- This trigger is the SINGLE SOURCE OF TRUTH for:
-- - Settings messages posts.status (youtube_reply only)
-- - Mensagens.respondido (youtube_reply only)
--
-- Edge Function browser-dispatch handles:
-- - browser_logins updates
-- - customers.Mentions decrement
-- - youtube_comment → Mensagens.respondido
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
    -- v5: Process when status changes to 'completed' OR 'failed'
    -- v4: Only youtube_reply uses SMP
    IF NEW.status IN ('completed', 'failed')
       AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'failed'))
       AND NEW.task_type = 'youtube_reply' THEN

        -- Get settings_post_id and mensagem_id from metadata
        v_smp_id := (NEW.metadata->>'settings_post_id')::bigint;
        v_mensagem_id := (NEW.metadata->>'mensagem_id')::bigint;

        IF v_smp_id IS NOT NULL THEN
            -- v5: If task status is 'failed', immediately mark SMP as failed
            IF NEW.status = 'failed' THEN
                UPDATE "Settings messages posts"
                SET status = 'failed'
                WHERE id = v_smp_id;

                RAISE NOTICE '[Trigger v5] Task failed -> SMP % marked as failed', v_smp_id;
                RETURN NEW;
            END IF;

            -- Continue with pattern matching for 'completed' status
            v_response_result := COALESCE(NEW.response->>'result', '');

            -- =============================================
            -- FAILURE PATTERNS - Check FIRST (takes priority)
            -- =============================================
            IF v_response_result ILIKE '%error_max_turns%'
               OR v_response_result ILIKE '%COMMENT_NOT_FOUND%'
               OR v_response_result ILIKE '%VIDEO_NOT_FOUND%'
               OR v_response_result ILIKE '%VIDEO_UNAVAILABLE%'
               OR v_response_result ILIKE '%COMMENTS_DISABLED%'
               OR v_response_result ILIKE '%LOGIN_REQUIRED%'
               OR v_response_result ILIKE '%REPLY_BLOCKED%'
               OR v_response_result ILIKE '%ERROR:%'
               -- Agent asked question instead of acting
               OR v_response_result ILIKE '%Which comment would you like%'
               OR v_response_result ILIKE '%Which comment should I%'
               OR v_response_result ILIKE '%I can see several comments%'
               OR v_response_result ILIKE '%I can see comments from%'
               OR v_response_result ILIKE '%I can see multiple comments%'
               OR v_response_result ILIKE '%Please specify which comment%'
               OR v_response_result ILIKE '%Could you please clarify%'
               -- Network/connectivity errors
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

            -- =============================================
            -- SUCCESS PATTERNS - Only if NOT already marked as failure
            -- =============================================
            IF NOT v_is_failure THEN
                IF v_response_result ILIKE '%REPLY:SUCCESS%'
                   OR v_response_result ILIKE '%successfully posted%'
                   OR v_response_result ILIKE '%successfully replied%'
                   OR v_response_result ILIKE '%posted successfully%'
                   OR v_response_result ILIKE '%reply has been posted%'
                   OR v_response_result ILIKE '%reply has been successfully%'
                   OR v_response_result ILIKE '%reply was posted%'
                   OR v_response_result ILIKE '%reply posted%'
                   OR v_response_result ILIKE '%Task completed%posted%'
                   OR v_response_result ILIKE '%SUCCESS!%reply%posted%'
                   OR v_response_result ILIKE '%há 0 segundo%'
                   OR v_response_result ILIKE '%há 1 segundo%'
                   OR v_response_result ILIKE '%0 seconds ago%'
                   OR v_response_result ILIKE '%1 second ago%'
                   THEN
                    v_is_success := true;
                END IF;
            END IF;

            IF v_is_success THEN
                -- Update Settings messages posts to 'posted'
                UPDATE "Settings messages posts"
                SET
                    status = 'posted',
                    postado = NOW()
                WHERE id = v_smp_id;

                -- Also update Mensagens.respondido
                IF v_mensagem_id IS NOT NULL THEN
                    UPDATE "Mensagens"
                    SET respondido = true
                    WHERE id = v_mensagem_id;
                END IF;

                RAISE NOTICE '[Trigger v5] SMP % -> posted, Mensagem % -> respondido', v_smp_id, v_mensagem_id;
            ELSE
                -- Task completed but reply failed - mark as failed
                UPDATE "Settings messages posts"
                SET status = 'failed'
                WHERE id = v_smp_id;

                RAISE NOTICE '[Trigger v5] SMP % -> failed (pattern: %)', v_smp_id,
                    CASE
                        WHEN v_is_failure THEN 'explicit_failure_detected'
                        ELSE 'no_success_marker'
                    END;
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

COMMENT ON FUNCTION update_settings_post_on_task_complete IS 'v5: Handles both completed AND failed tasks. Prevents SMP from getting stuck in processing.';
