-- =============================================
-- Função: browser_reply_to_comment
-- Descrição: Envia reply para browser_tasks (Sistema 2 via Browser Agent)
-- Criado: 2025-12-27
--
-- FLUXO:
-- 1. Cria task em browser_tasks com task_type='youtube_reply'
-- 2. Dispara Edge Function browser-reply-executor (fire-and-forget)
-- 3. Retorna task_id imediatamente
-- 4. Quando agente completa, Edge Function atualiza:
--    - browser_tasks.response
--    - Settings messages posts.status = 'posted'
--    - Mensagens.respondido = true
--    - customers.Mentions-- (se tipo='produto')
-- =============================================

DROP FUNCTION IF EXISTS browser_reply_to_comment(bigint, text, text, text, bigint, bigint, text);

CREATE OR REPLACE FUNCTION browser_reply_to_comment(
    p_project_id bigint,
    p_video_id text,           -- YouTube video ID
    p_parent_comment_id text,  -- ID do comentário pai para responder
    p_reply_text text,         -- Texto da resposta
    p_mensagem_id bigint,      -- ID na tabela Mensagens
    p_settings_post_id bigint, -- ID na tabela Settings messages posts
    p_tipo_resposta text DEFAULT 'produto'  -- Tipo para saber se decrementa Mentions
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task_id uuid;
    v_browser_url text;
    v_reply_prompt text;
    v_parent_comment_preview text;
    v_supabase_url text := 'https://suqjifkhmekcdflwowiw.supabase.co';
    v_supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MDkzNDQsImV4cCI6MjA0MjA4NTM0NH0.ajtUy21ib_z5O6jWaAYwZ78_D5Om_cWra5zFq-0X-3I';
BEGIN
    -- 1. Buscar browser_mcp_url do projeto
    SELECT browser_mcp_url INTO v_browser_url
    FROM "Projeto"
    WHERE id = p_project_id;

    IF v_browser_url IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Projeto não tem browser_mcp_url configurado'
        );
    END IF;

    -- 2. Buscar reply_prompt do browser_platforms (plataforma youtube)
    SELECT reply_prompt INTO v_reply_prompt
    FROM browser_platforms
    WHERE platform_name = 'youtube' AND is_active = true;

    IF v_reply_prompt IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'reply_prompt não encontrado para plataforma youtube'
        );
    END IF;

    -- 3. Buscar preview do comentário pai (primeiros 50 chars)
    SELECT LEFT(cp.texto_do_comentario, 50) INTO v_parent_comment_preview
    FROM "Comentarios_Principais" cp
    JOIN "Settings messages posts" smp ON smp."Comentarios_Principal" = cp.id
    WHERE smp.id = p_settings_post_id;

    -- 4. Criar task em browser_tasks
    INSERT INTO browser_tasks (
        project_id,
        task,
        task_type,
        status,
        priority,
        metadata
    )
    VALUES (
        p_project_id,
        format('Reply to comment on video %s', p_video_id),
        'youtube_reply',
        'pending',
        2,  -- Prioridade média (login é 1)
        jsonb_build_object(
            'video_id', p_video_id,
            'parent_comment_id', p_parent_comment_id,
            'parent_comment_preview', COALESCE(v_parent_comment_preview, ''),
            'reply_text', p_reply_text,
            'mensagem_id', p_mensagem_id,
            'settings_post_id', p_settings_post_id,
            'tipo_resposta', p_tipo_resposta
        )
    )
    RETURNING id INTO v_task_id;

    -- 5. Substituir placeholders no prompt
    v_reply_prompt := REPLACE(v_reply_prompt, '{{video_id}}', p_video_id);
    v_reply_prompt := REPLACE(v_reply_prompt, '{{parent_comment_id}}', p_parent_comment_id);
    v_reply_prompt := REPLACE(v_reply_prompt, '{{parent_comment_preview}}', COALESCE(v_parent_comment_preview, ''));
    v_reply_prompt := REPLACE(v_reply_prompt, '{{reply_text}}', p_reply_text);

    -- 6. Disparar Edge Function (fire-and-forget)
    PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/browser-reply-executor',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_supabase_anon_key
        ),
        body := jsonb_build_object(
            'task_id', v_task_id::text,
            'project_id', p_project_id,
            'video_id', p_video_id,
            'parent_comment_id', p_parent_comment_id,
            'reply_text', p_reply_text,
            'mensagem_id', p_mensagem_id,
            'settings_post_id', p_settings_post_id,
            'tipo_resposta', p_tipo_resposta,
            'browser_url', v_browser_url,
            'reply_prompt', v_reply_prompt
        ),
        timeout_milliseconds := 5000
    );

    -- 7. Retornar imediatamente
    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task_id,
        'message', 'Reply task created. Browser agent will process it.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant para serviço (CRON)
GRANT EXECUTE ON FUNCTION browser_reply_to_comment(bigint, text, text, text, bigint, bigint, text) TO service_role;

COMMENT ON FUNCTION browser_reply_to_comment IS 'Envia reply para browser_tasks (Sistema 2 via Browser Agent). Retorna task_id imediatamente. O agente executa de forma humanizada: assiste vídeo em 2x, curte comentário, responde.';
