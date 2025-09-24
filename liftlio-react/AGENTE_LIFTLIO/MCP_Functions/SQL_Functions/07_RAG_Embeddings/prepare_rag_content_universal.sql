-- =============================================
-- Função: prepare_rag_content_universal
-- Descrição: Prepara conteúdo para o sistema RAG de forma universal
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.prepare_rag_content_universal(text, bigint, integer);

CREATE OR REPLACE FUNCTION public.prepare_rag_content_universal(
    p_table_name text,
    p_record_id bigint,
    p_project_id integer DEFAULT NULL
)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_content text;
BEGIN
    CASE p_table_name
    WHEN 'Mensagens' THEN
        SELECT format('Mensagem: %s | Tipo: %s | Aprovada: %s',
            COALESCE(mensagem, 'Sem conteúdo'),
            CASE tipo_msg 
                WHEN 1 THEN 'Resposta'
                WHEN 2 THEN 'Postagem'
                ELSE 'Outro'
            END,
            CASE WHEN aprove THEN 'Sim' ELSE 'Não' END
        ) INTO v_content
        FROM "Mensagens"
        WHERE id = p_record_id;
        
    WHEN 'Comentarios_Principais' THEN
        SELECT format('Comentário de %s: %s | Likes: %s | Respostas: %s',
            COALESCE(author_name, 'Anônimo'),
            COALESCE(text_display, text_original),
            COALESCE(like_count::text, '0'),
            COALESCE(total_reply_count::text, '0')
        ) INTO v_content
        FROM "Comentarios_Principais"
        WHERE id = p_record_id;
        
    WHEN 'Videos' THEN
        SELECT format('Vídeo: %s | Canal: %s | Views: %s | Likes: %s',
            COALESCE(video_title, "VIDEO"),
            COALESCE("Channel", 'Desconhecido'),
            COALESCE(view_count::text, '0'),
            COALESCE(like_count::text, '0')
        ) INTO v_content
        FROM "Videos"
        WHERE id = p_record_id;
        
    WHEN 'Settings messages posts' THEN
        SELECT format('Mensagem agendada | Status: %s | Data: %s | Postada: %s | Conteúdo: %s',
            COALESCE(smp.status, 'pending'),
            CASE 
                WHEN smp.proxima_postagem IS NULL THEN 'Sem data'
                WHEN smp.proxima_postagem > NOW() THEN 'FUTURA: ' || TO_CHAR(smp.proxima_postagem AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
                ELSE 'PASSADA: ' || TO_CHAR(smp.proxima_postagem AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
            END,
            CASE 
                WHEN smp.postado IS NOT NULL THEN 'Sim em ' || TO_CHAR(smp.postado AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
                ELSE 'Não'
            END,
            COALESCE(LEFT(m.mensagem, 100), 'Sem conteúdo')
        ) INTO v_content
        FROM "Settings messages posts" smp
        LEFT JOIN "Mensagens" m ON smp."Mensagens" = m.id
        WHERE smp.id = p_record_id;
        
    WHEN 'Respostas_Comentarios' THEN
        SELECT p_record_id::text INTO v_content;
        
    WHEN 'Videos_trancricao' THEN
        SELECT format('Transcrição do vídeo %s: %s',
            COALESCE(video_id, 'ID desconhecido'),
            LEFT(COALESCE(trancription, 'Sem transcrição'), 500)
        ) INTO v_content
        FROM "Videos_trancricao"
        WHERE id = p_record_id;
        
    WHEN 'Canais do youtube' THEN
        SELECT format('Canal: %s | Inscritos: %s | Views: %s | Vídeos: %s | Ativo: %s',
            COALESCE("Nome", 'Sem nome'),
            COALESCE(subscriber_count::text, '0'),
            COALESCE(view_count::text, '0'),
            COALESCE(video_count::text, '0'),
            CASE WHEN is_active THEN 'Sim' ELSE 'Não' END
        ) INTO v_content
        FROM "Canais do youtube"
        WHERE id = p_record_id;
        
    WHEN 'Scanner de videos do youtube' THEN
        SELECT format('Scanner: %s | Ativo: %s | Rodada: %s',
            COALESCE("Keyword", 'Sem keyword'),
            CASE WHEN "Ativa?" THEN 'Sim' ELSE 'Não' END,
            COALESCE(rodada::text, '0')
        ) INTO v_content
        FROM "Scanner de videos do youtube"
        WHERE id = p_record_id;
        
    WHEN 'Notificacoes' THEN
        SELECT format('Notificação: %s | Lida: %s',
            COALESCE("Mensagem", 'Sem mensagem'),
            CASE WHEN lido THEN 'Sim' ELSE 'Não' END
        ) INTO v_content
        FROM "Notificacoes"
        WHERE id = p_record_id;
        
    WHEN 'Integrações' THEN
        SELECT format('Integração: %s | Ativa: %s',
            COALESCE("Tipo de integração", 'youtube'),
            CASE WHEN ativo THEN 'Sim' ELSE 'Não' END
        ) INTO v_content
        FROM "Integrações"
        WHERE id = p_record_id;
        
    WHEN 'Projeto' THEN
        SELECT format('Projeto: %s | Keywords: %s | País: %s | Ativo: %s',
            COALESCE("Project name", 'Sem nome'),
            COALESCE("Keywords", 'Sem keywords'),
            COALESCE("País", 'BR'),
            CASE WHEN "Youtube Active" THEN 'Sim' ELSE 'Não' END
        ) INTO v_content
        FROM "Projeto"
        WHERE id = p_record_id;
        
    WHEN 'agent_conversations' THEN
        SELECT format('Conversa: %s | Tipo: %s',
            COALESCE(message, 'Sem mensagem'),
            COALESCE(message_type, 'user')
        ) INTO v_content
        FROM agent_conversations
        WHERE id = p_record_id::uuid;
        
    ELSE
        v_content := format('Registro %s da tabela %s', p_record_id, p_table_name);
    END CASE;
    
    RETURN COALESCE(v_content, format('Registro %s não encontrado em %s', p_record_id, p_table_name));
END;
$function$;