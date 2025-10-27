-- =============================================
-- Função: curate_comments_with_claude
-- Descrição: Usa Claude AI para curar os 100 melhores comentários e selecionar
--            quantidade ADAPTATIVA baseada em lógica anti-spam
-- Criado: 2025-10-27
-- Atualizado: 2025-10-27 - Adicionada lógica anti-spam adaptativa
-- Dependências: get_filtered_comments(), claude_complete()
-- =============================================

DROP FUNCTION IF EXISTS curate_comments_with_claude(bigint);

CREATE OR REPLACE FUNCTION public.curate_comments_with_claude(video_id_param bigint)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_filtered_comments jsonb;
    v_video_data jsonb;
    v_project_data jsonb;
    v_prompt text;
    v_claude_response text;
    v_result jsonb;
    v_total_original integer;
    v_total_filtrados integer;
    v_max_respostas integer;
    v_taxa_resposta numeric;
BEGIN
    -- 1. Buscar dados do vídeo (incluindo comment_count total)
    SELECT jsonb_build_object(
        'video_id', v.id,
        'youtube_id', v."VIDEO",
        'title', v.video_title,
        'description', COALESCE(v.video_description, 'Sem descrição'),
        'view_count', v.view_count,
        'like_count', v.like_count,
        'comment_count', v.comment_count,
        'transcript', COALESCE(
            (SELECT LEFT(vt.trancription, 3000)
             FROM "Videos_trancricao" vt
             WHERE vt.id = v.transcript),
            'Transcrição não disponível'
        )
    ), v.comment_count
    INTO v_video_data, v_total_original
    FROM "Videos" v
    WHERE v.id = video_id_param;

    -- 2. Buscar os 100 comentários já filtrados pela função get_filtered_comments
    SELECT jsonb_agg(
        jsonb_build_object(
            'comment_id', comment_id,
            'youtube_id', comment_youtube_id,
            'text', comment_text,
            'author', comment_author,
            'published_at', comment_published_at,
            'likes', comment_likes,
            'score', comment_relevance_score,
            'age_days', EXTRACT(DAY FROM NOW() - comment_published_at)::integer
        ) ORDER BY comment_relevance_score DESC
    )
    INTO v_filtered_comments
    FROM get_filtered_comments(video_id_param);

    -- Se não houver comentários, retornar NULL
    IF v_filtered_comments IS NULL OR jsonb_array_length(v_filtered_comments) = 0 THEN
        RAISE NOTICE 'Nenhum comentário filtrado encontrado para vídeo %', video_id_param;
        RETURN jsonb_build_object(
            'error', 'no_comments',
            'message', 'Nenhum comentário disponível para curadoria'
        );
    END IF;

    v_total_filtrados := jsonb_array_length(v_filtered_comments);

    -- 3. LÓGICA ANTI-SPAM: Calcular quantidade máxima de respostas baseada no total ORIGINAL
    v_max_respostas := CASE
        -- TIER 1: Vídeos MICRO (<15) - SUPER seletivo (15%)
        WHEN v_total_original < 15 THEN
            GREATEST(1, CEIL(v_total_original * 0.15))

        -- TIER 2: Vídeos PEQUENOS (15-50) - Seletivo (12%)
        WHEN v_total_original BETWEEN 15 AND 50 THEN
            GREATEST(2, CEIL(v_total_original * 0.12))

        -- TIER 3: Vídeos MÉDIOS (51-150) - Normal (10%)
        WHEN v_total_original BETWEEN 51 AND 150 THEN
            GREATEST(5, CEIL(v_total_original * 0.10))

        -- TIER 4: Vídeos GRANDES (151-300) - Seletivo (8%, max 10)
        WHEN v_total_original BETWEEN 151 AND 300 THEN
            LEAST(10, CEIL(v_total_original * 0.08))

        -- TIER 5: Vídeos VIRAIS (301+) - Muito seletivo (5%, max 10)
        ELSE
            LEAST(10, CEIL(v_total_original * 0.05))
    END;

    v_taxa_resposta := ROUND((v_max_respostas::numeric / NULLIF(v_total_original, 0) * 100), 1);

    RAISE NOTICE '📊 Anti-Spam Logic: Vídeo com % comentários totais | % filtrados | Max % respostas (% %% taxa)',
                 v_total_original, v_total_filtrados, v_max_respostas, v_taxa_resposta;

    -- 4. PROTEÇÃO: Se filtrados <= max_respostas, retorna TODOS sem chamar Claude (economia!)
    IF v_total_filtrados <= v_max_respostas THEN
        RAISE NOTICE '✅ Economia: Filtrados (%) <= Max respostas (%), retornando TODOS sem Claude',
                     v_total_filtrados, v_max_respostas;

        -- Retorna todos filtrados formatados como curados (sem gastar com Claude)
        RETURN jsonb_build_object(
            'video_id', video_id_param,
            'video_title', v_video_data->>'title',
            'product_name', NULL,  -- Será preenchido depois se necessário
            'total_comments_original', v_total_original,
            'total_comments_analyzed', v_total_filtrados,
            'top_comments_selected', v_total_filtrados,
            'response_rate_percent', v_taxa_resposta,
            'curation_mode', 'all_filtered_auto_approved',
            'message', format('Vídeo com %s comentários - retornados todos %s filtrados (taxa %s%%) sem curadoria Claude',
                            v_total_original, v_total_filtrados, v_taxa_resposta),
            'curated_at', NOW(),
            'curated_comments', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'comment_id', (elem->>'comment_id')::bigint,
                        'rank', row_number() OVER (ORDER BY (elem->>'score')::float DESC),
                        'score_total', (elem->>'score')::float,
                        'text', elem->>'text',
                        'author', elem->>'author',
                        'published_at', elem->>'published_at',
                        'likes', (elem->>'likes')::integer,
                        'age_days', (elem->>'age_days')::integer,
                        'reasoning', 'Auto-aprovado: Vídeo pequeno com poucos comentários filtrados',
                        'estrategia_sugerida', 'Responder de forma personalizada baseada no contexto',
                        'red_flags', NULL
                    )
                )
                FROM jsonb_array_elements(v_filtered_comments) elem
            )
        );
    END IF;

    RAISE NOTICE '🤖 Chamando Claude: Filtrados (%) > Max respostas (%), selecionando top %',
                 v_total_filtrados, v_max_respostas, v_max_respostas;

    -- 6. Buscar dados do projeto (produto/serviço)
    SELECT jsonb_build_object(
        'project_id', p.id,
        'product_name', COALESCE(
            SUBSTRING(p."description service" FROM 'Company or product name: ([^,]+)'),
            p."Project name",
            'Nome não especificado'
        ),
        'description', COALESCE(p."description service", 'Descrição não disponível'),
        'keywords', COALESCE(p."Keywords", ''),
        'country', COALESCE(p."País", 'Português')
    )
    INTO v_project_data
    FROM "Videos" v
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Projeto" p ON s."Projeto_id" = p.id
    WHERE v.id = video_id_param;

    -- Se não encontrou projeto, usar dados genéricos
    IF v_project_data IS NULL THEN
        v_project_data := jsonb_build_object(
            'project_id', NULL,
            'product_name', 'Produto/Serviço genérico',
            'description', 'Sem descrição disponível',
            'keywords', '',
            'country', 'Português'
        );
    END IF;

    -- 7. Construir prompt para Claude com quantidade ADAPTATIVA
    v_prompt := format(
        'Você é um especialista em curadoria de comentários do YouTube para estratégias de marketing e engajamento.

CONTEXTO DO VÍDEO:
Título: %s
Descrição: %s
Visualizações: %s | Likes: %s | Comentários totais: %s
Transcrição (primeiros 3000 caracteres): %s

CONTEXTO DO PRODUTO/SERVIÇO:
Nome: %s
Descrição: %s
Palavras-chave: %s

COMENTÁRIOS FILTRADOS (já passou por filtro SQL):
Total disponível: %s comentários
%s

🎯 LÓGICA ANTI-SPAM ATIVADA:
- Vídeo tem %s comentários no total
- Você está analisando %s comentários pré-filtrados
- Selecione APENAS %s comentários (taxa de resposta %s%%)
- Esta taxa mantém comportamento natural e evita detecção de spam

SUA MISSÃO:
Analise os comentários acima e selecione os TOP %s comentários mais estratégicos para responder.

CRITÉRIOS DE SELEÇÃO (em ordem de prioridade):

1. **ALINHAMENTO COM PRODUTO** (40 pontos):
   - Comentário demonstra necessidade/problema que o produto resolve?
   - Há conexão genuína com as keywords do produto?
   - Pessoa está buscando solução ativa?

2. **TIMING E VISIBILIDADE** (30 pontos):
   - Comentários de 14-30 dias têm prioridade (sweet spot)
   - Órfãos (sem respostas) são ouro (visibilidade 100%%)
   - Comentários muito recentes (<7 dias) ou muito velhos (>60 dias) são menos prioritários

3. **QUALIDADE DO CONTEXTO** (20 pontos):
   - Comentário é específico e detalhado?
   - Permite resposta personalizada e de valor?
   - Tom receptivo a sugestões?

4. **POTENCIAL DE CONVERSÃO** (10 pontos):
   - Sinais de intenção de compra ("onde compro", "quanto custa", "preciso urgente")?
   - Pessoa parece ter orçamento/autoridade?
   - Urgência alta, média ou baixa?

REGRAS IMPORTANTES:
- Priorize QUALIDADE sobre quantidade
- Evite comentários genéricos ("legal", "bom vídeo")
- Evite comentários sobre outros produtos/concorrentes
- Selecione EXATAMENTE %s comentários (não mais, não menos)
- Se não houver %s comentários realmente bons, selecione os melhores disponíveis

OUTPUT:
Retorne JSON array com top %s comentários no formato:
[
  {
    "comment_id": "id do comentário",
    "rank": 1,
    "score_total": 95,
    "scores": {
      "alinhamento": 38,
      "timing_visibilidade": 28,
      "qualidade_contexto": 19,
      "potencial_conversao": 10
    },
    "reasoning": "Explicação detalhada em português do por quê esse comentário foi selecionado",
    "estrategia_sugerida": "Sugestão de como responder (ex: ''Oferecer case study + trial gratuito'')",
    "red_flags": "Avisos se houver (ex: ''Pessoa pode estar comparando com concorrente X'')"
  }
]

Responda APENAS com o JSON array, sem texto adicional.',
        -- Dados do vídeo
        v_video_data->>'title',
        v_video_data->>'description',
        v_video_data->>'view_count',
        v_video_data->>'like_count',
        v_video_data->>'comment_count',
        v_video_data->>'transcript',
        -- Dados do produto
        v_project_data->>'product_name',
        v_project_data->>'description',
        v_project_data->>'keywords',
        -- Dados dos comentários
        jsonb_array_length(v_filtered_comments),
        (SELECT string_agg(
            format(
                E'---\nComment ID: %s\nAuthor: %s\nAge: %s days\nLikes: %s\nSQL Score: %s\nText: %s',
                c->>'comment_id',
                c->>'author',
                c->>'age_days',
                c->>'likes',
                c->>'score',
                c->>'text'
            ),
            E'\n\n'
        ) FROM jsonb_array_elements(v_filtered_comments) c),
        -- Dados anti-spam
        v_total_original,
        v_total_filtrados,
        v_max_respostas,
        v_taxa_resposta,
        v_max_respostas,
        -- Repetir v_max_respostas para as 3 menções no prompt
        v_max_respostas,
        v_max_respostas,
        v_max_respostas
    );

    -- 8. Chamar Claude
    SELECT claude_complete(
        v_prompt,
        format('You are an expert in YouTube comment curation for marketing strategies.

CRITICAL RULES:
1. You MUST return a valid JSON array
2. Select EXACTLY %s most strategic comments (anti-spam logic)
3. Prioritize quality over quantity
4. Each comment must have detailed reasoning
5. Scores must be realistic and justified
6. Return exactly %s comments, no more, no less

Language: %s

Always respond exactly in this structure:
[
  {
    "comment_id": "ID",
    "rank": 1,
    "score_total": 95,
    "scores": {
      "alinhamento": 38,
      "timing_visibilidade": 28,
      "qualidade_contexto": 19,
      "potencial_conversao": 10
    },
    "reasoning": "Detailed explanation in Portuguese",
    "estrategia_sugerida": "Response strategy suggestion",
    "red_flags": "Warnings if any"
  }
]

Respond only with the requested JSON array.',
               v_max_respostas,
               v_max_respostas,
               v_project_data->>'country'),
        8000,  -- max_tokens (análise detalhada)
        0.3    -- temperature (mais focado)
    ) INTO v_claude_response;

    -- 6. Validar resposta do Claude
    IF v_claude_response IS NULL THEN
        RAISE NOTICE 'Claude retornou NULL';
        RETURN jsonb_build_object(
            'error', 'claude_null',
            'message', 'Claude não retornou resposta'
        );
    END IF;

    -- 7. Converter resposta para JSONB (limpar markdown se necessário)
    BEGIN
        v_claude_response := regexp_replace(v_claude_response, '^\s*```json\s*', '', 'i');
        v_claude_response := regexp_replace(v_claude_response, '\s*```\s*$', '');
        v_claude_response := trim(v_claude_response);
        v_result := v_claude_response::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao converter resposta do Claude: %', SQLERRM;
        RETURN jsonb_build_object(
            'error', 'invalid_json',
            'message', 'Resposta do Claude não é JSON válido',
            'raw_response', v_claude_response
        );
    END;

    -- 9. Enriquecer resultado com metadados (incluindo dados anti-spam)
    v_result := jsonb_build_object(
        'video_id', video_id_param,
        'video_title', v_video_data->>'title',
        'product_name', v_project_data->>'product_name',
        'total_comments_original', v_total_original,
        'total_comments_analyzed', v_total_filtrados,
        'top_comments_selected', jsonb_array_length(v_result),
        'response_rate_percent', v_taxa_resposta,
        'max_safe_responses', v_max_respostas,
        'curation_mode', 'claude_adaptive',
        'curated_at', NOW(),
        'curated_comments', v_result
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro na função curate_comments_with_claude: % %', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$function$;

-- =============================================
-- EXEMPLO DE USO:
-- =============================================
-- SELECT curate_comments_with_claude(28591);
--
-- Retorna JSON com comentários curados (quantidade adaptativa anti-spam):
-- {
--   "video_id": 28591,
--   "video_title": "Como fazer...",
--   "product_name": "MinhaFerramenta",
--   "total_comments_original": 50,
--   "total_comments_analyzed": 30,
--   "top_comments_selected": 6,
--   "response_rate_percent": 12.0,
--   "max_safe_responses": 6,
--   "curation_mode": "claude_adaptive",
--   "curated_at": "2025-10-27T...",
--   "curated_comments": [
--     {
--       "comment_id": "abc123",
--       "rank": 1,
--       "score_total": 95,
--       "scores": {...},
--       "reasoning": "...",
--       "estrategia_sugerida": "...",
--       "red_flags": null
--     },
--     ...
--   ]
-- }
--
-- LÓGICA ANTI-SPAM:
-- - Vídeo 10 comentários → max 2 respostas (20%)
-- - Vídeo 50 comentários → max 6 respostas (12%)
-- - Vídeo 100 comentários → max 10 respostas (10%)
-- - Vídeo 500 comentários → max 10 respostas (2%)
-- =============================================
