-- =============================================
-- Função: analisar_comentarios_com_claude
-- Descrição: Sistema completo de qualificação de leads usando análise PICS via Claude
-- Criado: 2025-01-23
-- Atualizado: Sistema PICS para qualificar leads em comentários do YouTube
-- =============================================

DROP FUNCTION IF EXISTS analisar_comentarios_com_claude(integer, integer);

CREATE OR REPLACE FUNCTION public.analisar_comentarios_com_claude(p_project_id integer, p_video_id integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    prompt_claude TEXT;
    resultado_claude TEXT;
    video_data RECORD;
    project_data RECORD;
    comentarios_json JSONB;
    v_pais TEXT;
    v_idioma TEXT;
BEGIN
    -- Obter dados do projeto, incluindo o país
    SELECT "description service", "Keywords", "País"
    INTO project_data
    FROM public."Projeto"
    WHERE id = p_project_id;

    -- Definir a variável país
    v_pais := COALESCE(project_data."País", 'US');

    -- Determinar o idioma baseado no país
    v_idioma := CASE
        WHEN v_pais = 'BR' OR v_pais = 'PT' OR v_pais LIKE '%Braz%' OR v_pais LIKE '%Port%' THEN 'português'
        ELSE 'inglês'
    END;

    -- Iniciar o prompt para o Claude com o framework de análise PICS
    prompt_claude := '### SISTEMA DE QUALIFICAÇÃO AVANÇADA DE LEADS ###

Você é um ANALISTA ESPECIALIZADO EM QUALIFICAÇÃO DE LEADS com experiência em identificar potenciais clientes. Sua tarefa é avaliar comentários do YouTube para encontrar pessoas com real interesse no produto ou serviço descrito.

## METODOLOGIA DE ANÁLISE PICS ##
Avaliar cada comentário nas seguintes dimensões:

1. PROBLEMA (0-10): O comentário demonstra consciência de um problema que nosso produto resolve?
2. INTENÇÃO (0-10): Há indicações de interesse em compra, preços ou implementação?
3. CONTEXTO (0-10): O comentário menciona um caso de uso compatível com o produto?
4. SINAIS (0-10): O comentário demonstra engajamento profundo com o conteúdo?

## CLASSIFICAÇÃO DE LEADS ##
- Lead Quente (9-10): Interesse direto + perguntas específicas
- Lead Morno (7-8): Expressa problema específico relacionado
- Lead Frio (6-7): Mostra consciência do problema
- Não é Lead (<6): Comentários genéricos sem intenção comercial

IMPORTANTE: Comentários com pontuação inferior a 6 DEVEM ser classificados como "lead": false';

    -- Processamento baseado no vídeo específico ou nos comentários não analisados do projeto
    IF p_video_id IS NOT NULL THEN
        -- Analisar um vídeo específico
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
            FROM
                public."Videos" v
            LEFT JOIN
                public."Scanner de videos do youtube" s ON v.scanner_id = s.id
            LEFT JOIN
                public."Videos_trancricao" vt ON v.transcript = vt.id
            WHERE
                v.id = p_video_id
        ) LOOP
            -- Adicionar contexto do vídeo e projeto
            prompt_claude := prompt_claude || format('

## CONTEXTO DO PRODUTO ##
Descrição do produto/serviço: %s
Keywords/Nicho: %s

## CONTEXTO DO VÍDEO ##
ID do Vídeo: %s
Título: %s
Descrição: %s
Palavra-chave da busca: %s',
                replace(project_data."description service", '"', ''''),
                replace(project_data."Keywords", '"', ''''),
                video_data.video_id,
                replace(video_data.video_title, '"', ''''),
                replace(regexp_replace(left(video_data.video_description, 1000), E'[\n\r\t]+', ' ', 'g'), '"', ''''),
                replace(video_data.scanner_keyword, '"', ''')
            );

            -- Adicionar transcrição se disponível
            IF video_data.video_transcription IS NOT NULL AND LENGTH(video_data.video_transcription) > 0 THEN
                prompt_claude := prompt_claude || format('

## TRANSCRIÇÃO DO VÍDEO (RESUMO) ##
%s',
                    replace(regexp_replace(left(video_data.video_transcription, 2000), E'[\n\r\t]+', ' ', 'g'), '"', ''')
                );
            END IF;

            -- Adicionar comentários para análise
            prompt_claude := prompt_claude || '

## COMENTÁRIOS PARA ANÁLISE ##';

            comentarios_json := video_data.comentarios;
            IF comentarios_json IS NOT NULL THEN
                FOR i IN 0..jsonb_array_length(comentarios_json)-1 LOOP
                    prompt_claude := prompt_claude || format('

Comentário ID: %s
Texto: %s',
                        (comentarios_json->i)->>'comentario_id',
                        replace(regexp_replace(left((comentarios_json->i)->>'text_display', 1000), E'[\n\r\t]+', ' ', 'g'), '"', ''')
                    );
                END LOOP;
            END IF;
        END LOOP;
    ELSE
        -- Buscar vídeos com comentários não analisados deste projeto
        FOR video_data IN (
            WITH videos_do_projeto AS (
                SELECT DISTINCT
                    cp.video_id
                FROM
                    public."Comentarios_Principais" cp
                JOIN
                    public."Videos" v ON cp.video_id = v.id
                JOIN
                    public."Scanner de videos do youtube" s ON v.scanner_id = s.id
                WHERE
                    s."Projeto_id" = p_project_id
                    AND (cp.comentario_analizado IS NULL OR cp.comentario_analizado = FALSE)
                LIMIT 3
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
                    LIMIT 30 -- Limite por vídeo
                ) AS comentarios
            FROM
                videos_do_projeto vdp
            JOIN
                public."Videos" v ON vdp.video_id = v.id
            LEFT JOIN
                public."Scanner de videos do youtube" s ON v.scanner_id = s.id
            LEFT JOIN
                public."Videos_trancricao" vt ON v.transcript = vt.id
        ) LOOP
            -- Adicionar contexto do vídeo
            prompt_claude := prompt_claude || format('

## CONTEXTO DO PRODUTO ##
Descrição do produto/serviço: %s
Keywords/Nicho: %s

## CONTEXTO DO VÍDEO ##
ID do Vídeo: %s
Título: %s
Descrição: %s
Palavra-chave da busca: %s',
                replace(project_data."description service", '"', ''''),
                replace(project_data."Keywords", '"', ''''),
                video_data.video_id,
                replace(video_data.video_title, '"', ''''),
                replace(regexp_replace(left(video_data.video_description, 1000), E'[\n\r\t]+', ' ', 'g'), '"', ''''),
                replace(video_data.scanner_keyword, '"', ''')
            );

            -- Adicionar transcrição se disponível
            IF video_data.video_transcription IS NOT NULL AND LENGTH(video_data.video_transcription) > 0 THEN
                prompt_claude := prompt_claude || format('

## TRANSCRIÇÃO DO VÍDEO (RESUMO) ##
%s',
                    replace(regexp_replace(left(video_data.video_transcription, 2000), E'[\n\r\t]+', ' ', 'g'), '"', ''')
                );
            END IF;

            -- Adicionar comentários para análise
            prompt_claude := prompt_claude || '

## COMENTÁRIOS PARA ANÁLISE ##';

            comentarios_json := video_data.comentarios;
            IF comentarios_json IS NOT NULL THEN
                FOR i IN 0..jsonb_array_length(comentarios_json)-1 LOOP
                    prompt_claude := prompt_claude || format('

Comentário ID: %s
Texto: %s',
                        (comentarios_json->i)->>'comentario_id',
                        replace(regexp_replace(left((comentarios_json->i)->>'text_display', 1000), E'[\n\r\t]+', ' ', 'g'), '"', ''')
                    );
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    -- Instruções finais, incluindo instruções para justificativa
    prompt_claude := prompt_claude || format('

## INSTRUÇÕES PARA JUSTIFICATIVAS ##

Para cada comentário, forneça uma justificativa clara e concisa que explique seu raciocínio para a classificação. A justificativa deve:

1. Explicar por que o comentário foi classificado como lead ou não-lead
2. Mencionar elementos específicos do comentário que indicam interesse ou falta dele
3. Fazer referência ao contexto do vídeo quando relevante
4. Se disponível na transcrição, mencionar timestamps específicos relevantes ao comentário
5. Ser escrita em %s (conforme o país do projeto: %s)
6. Ter entre 100-150 caracteres, sendo direta e informativa

## INSTRUÇÕES FINAIS ##

1. Analise cuidadosamente o contexto do vídeo e o conteúdo de cada comentário
2. Identifique sinais de interesse genuíno pelo produto/serviço descrito
3. Valorize perguntas específicas sobre preço, funcionalidades ou implementação
4. LEMBRE-SE: Comentários com pontuação abaixo de 6 devem ser marcados como lead=false
5. Quando as estatisticas do video tiver menos de 50 comentarios nao cite o produto ou servico mais de uma vez
6. Responda APENAS em formato JSON conforme solicitado',
        v_idioma,
        v_pais
    );

    -- Chamar a função Claude com o template atualizado incluindo justificativa
    SELECT claude_complete(
        prompt_claude,
        format('Você é um ANALISTA DE MARKETING especializado em identificar leads potenciais. Responda em formato JSON com a seguinte estrutura para cada comentário:
[
  {
    "comentario_id": [ID do comentário],
    "video_id": [ID do vídeo],
    "lead": [true ou false],
    "lead_score": [Se for um lead, dê uma nota de 1 a 10. Se não for um lead, coloque 0],
    "justificativa": [Justificativa para a classificação em %s]
  }
]

IMPORTANTE:
- Comentários com pontuação inferior a 6 DEVEM ser marcados como "lead": false
- A justificativa deve explicar o raciocínio, referenciar elementos do contexto e ser concisa (100-150 caracteres)
- Responda somente com o JSON solicitado, sem texto adicional',
            v_idioma
        ),
        4000,
        0.3
    ) INTO resultado_claude;

    RETURN resultado_claude;
END;
$function$