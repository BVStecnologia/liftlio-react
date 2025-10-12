-- =============================================
-- Funcao: analisar_comentarios_com_claude
-- Descricao: Sistema completo de qualificacao de leads usando analise PICS via Claude
-- Criado: 2025-01-23
-- Atualizado: 2025-10-12 - Refatorado para concatenação de strings (evita problemas de encoding)
-- =============================================

DROP FUNCTION IF EXISTS analisar_comentarios_com_claude(integer, integer);

CREATE OR REPLACE FUNCTION public.analisar_comentarios_com_claude(
    p_project_id INTEGER,
    p_video_id INTEGER DEFAULT NULL
)
RETURNS TEXT AS $
DECLARE
    prompt_claude TEXT;
    resultado_claude TEXT;
    video_data RECORD;
    project_data RECORD;
    comentarios_json JSONB;
    v_pais TEXT;
    v_idioma TEXT;
BEGIN
    SELECT "description service", "Keywords", "País"
    INTO project_data
    FROM public."Projeto"
    WHERE id = p_project_id;

    v_pais := COALESCE(project_data."País", 'US');

    v_idioma := CASE
        WHEN v_pais = 'BR' OR v_pais = 'PT' OR v_pais LIKE '%Braz%' OR v_pais LIKE '%Port%' THEN 'portugues'
        ELSE 'ingles'
    END;

    prompt_claude := '### SISTEMA DE QUALIFICACAO AVANCADA DE LEADS ### ' ||
    'Voce e um ANALISTA ESPECIALIZADO EM QUALIFICACAO DE LEADS com experiencia em identificar potenciais clientes. ' ||
    'Sua tarefa e avaliar comentarios do YouTube para encontrar pessoas com real interesse no produto ou servico descrito. ' ||
    '## METODOLOGIA DE ANALISE PICS ## ' ||
    'Avaliar cada comentario nas seguintes dimensoes: ' ||
    '1. PROBLEMA (0-10): O comentario demonstra consciencia de um problema que nosso produto resolve? ' ||
    '2. INTENCAO (0-10): Ha indicacoes de interesse em compra, precos ou implementacao? ' ||
    '3. CONTEXTO (0-10): O comentario menciona um caso de uso compativel com o produto? ' ||
    '4. SINAIS (0-10): O comentario demonstra engajamento profundo com o conteudo? ' ||
    '## CLASSIFICACAO DE LEADS ## ' ||
    '- Lead Quente (9-10): Interesse direto + perguntas especificas ' ||
    '- Lead Morno (7-8): Expressa problema especifico relacionado ' ||
    '- Lead Frio (6-7): Mostra consciencia do problema ' ||
    '- Nao e Lead (<6): Comentarios genericos sem intencao comercial ' ||
    'IMPORTANTE: Comentarios com pontuacao inferior a 6 DEVEM ser classificados como "lead": false';

    IF p_video_id IS NOT NULL THEN
        FOR video_data IN (
            SELECT
                v.id AS video_id,
                v.video_title,
                v.video_description,
                s."Keyword" AS scanner_keyword,
                vt.trancription AS video_transcription,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'comentario_id', cp.id,
                            'text_display', cp.text_display
                        )
                    )
                    FROM public."Comentarios_Principais" cp
                    WHERE cp.video_id = v.id
                    AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE)
                    LIMIT 100
                ) AS comentarios
            FROM public."Videos" v
            LEFT JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
            LEFT JOIN public."Videos_trancricao" vt ON v.transcript = vt.id
            WHERE v.id = p_video_id
        ) LOOP
            prompt_claude := prompt_claude || ' ## CONTEXTO DO PRODUTO ## ' ||
                'Descricao do produto/servico: ' || replace(project_data."description service", '"', '''') || ' ' ||
                'Keywords/Nicho: ' || replace(project_data."Keywords", '"', '''') || ' ' ||
                '## CONTEXTO DO VIDEO ## ' ||
                'ID do Video: ' || video_data.video_id || ' ' ||
                'Titulo: ' || replace(video_data.video_title, '"', '''') || ' ' ||
                'Descricao: ' || replace(regexp_replace(left(video_data.video_description, 1000), E'[\n\r\t]+', ' ', 'g'), '"', '''') || ' ' ||
                'Palavra-chave da busca: ' || replace(video_data.scanner_keyword, '"', '''');

            IF video_data.video_transcription IS NOT NULL AND LENGTH(video_data.video_transcription) > 0 THEN
                prompt_claude := prompt_claude || ' ## TRANSCRICAO DO VIDEO (RESUMO) ## ' ||
                    replace(regexp_replace(left(video_data.video_transcription, 5000), E'[\n\r\t]+', ' ', 'g'), '"', '''');
            END IF;

            prompt_claude := prompt_claude || ' ## COMENTARIOS PARA ANALISE ## ';

            comentarios_json := video_data.comentarios;
            IF comentarios_json IS NOT NULL THEN
                FOR i IN 0..jsonb_array_length(comentarios_json)-1 LOOP
                    prompt_claude := prompt_claude ||
                        ' Comentario ID: ' || ((comentarios_json->i)::jsonb->>'comentario_id') || ' ' ||
                        'Texto: ' || replace(regexp_replace(left((comentarios_json->i)::jsonb->>'text_display', 1000), E'[\n\r\t]+', ' ', 'g'), '"', '''');
                END LOOP;
            END IF;
        END LOOP;
    ELSE
        FOR video_data IN (
            WITH videos_do_projeto AS (
                SELECT DISTINCT cp.video_id
                FROM public."Comentarios_Principais" cp
                JOIN public."Videos" v ON cp.video_id = v.id
                JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
                WHERE s."Projeto_id" = p_project_id
                AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE)
                LIMIT 1
            )
            SELECT
                v.id AS video_id,
                v.video_title,
                v.video_description,
                s."Keyword" AS scanner_keyword,
                vt.trancription AS video_transcription,
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'comentario_id', cp.id,
                            'text_display', cp.text_display
                        )
                    )
                    FROM public."Comentarios_Principais" cp
                    WHERE cp.video_id = v.id
                    AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE)
                    LIMIT 10
                ) AS comentarios
            FROM videos_do_projeto vdp
            JOIN public."Videos" v ON vdp.video_id = v.id
            LEFT JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
            LEFT JOIN public."Videos_trancricao" vt ON v.transcript = vt.id
        ) LOOP
            prompt_claude := prompt_claude || ' ## CONTEXTO DO PRODUTO ## ' ||
                'Descricao do produto/servico: ' || replace(project_data."description service", '"', '''') || ' ' ||
                'Keywords/Nicho: ' || replace(project_data."Keywords", '"', '''') || ' ' ||
                '## CONTEXTO DO VIDEO ## ' ||
                'ID do Video: ' || video_data.video_id || ' ' ||
                'Titulo: ' || replace(video_data.video_title, '"', '''') || ' ' ||
                'Descricao: ' || replace(regexp_replace(left(video_data.video_description, 1000), E'[\n\r\t]+', ' ', 'g'), '"', '''') || ' ' ||
                'Palavra-chave da busca: ' || replace(video_data.scanner_keyword, '"', '''');

            IF video_data.video_transcription IS NOT NULL AND LENGTH(video_data.video_transcription) > 0 THEN
                prompt_claude := prompt_claude || ' ## TRANSCRICAO DO VIDEO (RESUMO) ## ' ||
                    replace(regexp_replace(left(video_data.video_transcription, 4000), E'[\n\r\t]+', ' ', 'g'), '"', '''');
            END IF;

            prompt_claude := prompt_claude || ' ## COMENTARIOS PARA ANALISE ## ';

            comentarios_json := video_data.comentarios;
            IF comentarios_json IS NOT NULL THEN
                FOR i IN 0..jsonb_array_length(comentarios_json)-1 LOOP
                    prompt_claude := prompt_claude ||
                        ' Comentario ID: ' || ((comentarios_json->i)::jsonb->>'comentario_id') || ' ' ||
                        'Texto: ' || replace(regexp_replace(left((comentarios_json->i)::jsonb->>'text_display', 1000), E'[\n\r\t]+', ' ', 'g'), '"', '''');
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    prompt_claude := prompt_claude || ' ## INSTRUCOES PARA JUSTIFICATIVAS ## ' ||
        'Para cada comentario, forneca uma justificativa clara e concisa que explique seu raciocinio para a classificacao. ' ||
        'A justificativa deve: ' ||
        '1. Explicar por que o comentario foi classificado como lead ou nao-lead ' ||
        '2. Mencionar elementos especificos do comentario que indicam interesse ou falta dele ' ||
        '3. Fazer referencia ao contexto do video quando relevante ' ||
        '4. Se disponivel na transcricao, mencionar timestamps especificos relevantes ao comentario ' ||
        '5. Ser escrita em ' || v_idioma || ' (conforme o pais do projeto: ' || v_pais || ') ' ||
        '6. Ter entre 100-150 caracteres, sendo direta e informativa ' ||
        '## INSTRUCOES FINAIS ## ' ||
        '1. Analise cuidadosamente o contexto do video e o conteudo de cada comentario ' ||
        '2. Identifique sinais de interesse genuino pelo produto/servico descrito ' ||
        '3. Valorize perguntas especificas sobre preco, funcionalidades ou implementacao ' ||
        '4. LEMBRE-SE: Comentarios com pontuacao abaixo de 6 devem ser marcados como lead=false ' ||
        '5. Quando as estatisticas do video tiver menos de 50 comentarios nao cite o produto ou servico mais de uma vez ' ||
        '6. Responda APENAS em formato JSON conforme solicitado';

    SELECT claude_complete(
        prompt_claude,
        'Voce e um ANALISTA DE MARKETING especializado em identificar leads potenciais. ' ||
        'Responda em formato JSON com a seguinte estrutura para cada comentario: ' ||
        '[{"comentario_id": [ID do comentario], "video_id": [ID do video], "lead": [true ou false], ' ||
        '"lead_score": [Se for um lead, de uma nota de 1 a 10. Se nao for um lead, coloque 0], ' ||
        '"justificativa": [Justificativa para a classificacao em ' || v_idioma || ']}] ' ||
        'IMPORTANTE: Comentarios com pontuacao inferior a 6 DEVEM ser marcados como "lead": false. ' ||
        'A justificativa deve explicar o raciocinio, referenciar elementos do contexto e ser concisa (100-150 caracteres). ' ||
        'Responda somente com o JSON solicitado, sem texto adicional',
        4000,
        0.3,
        90000
    ) INTO resultado_claude;

    RETURN resultado_claude;
END;
$ LANGUAGE plpgsql;
