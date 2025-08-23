-- Função para buscar dados COMPLETOS do projeto incluindo descrição
-- Esta função deve ser criada no Supabase

CREATE OR REPLACE FUNCTION get_projeto_data_completo(scanner_id bigint)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'scanner_id', s.id,
        'palavra_chave', s."Palavra chave",
        'projeto_id', s."Projeto",
        'nome_empresa', p."Nome da Empresa",
        'descricao_projeto', p."Descricao",
        'regiao', COALESCE(p."pais", 'BR'),
        'videos_excluidos', (
            -- Concatena todos os IDs de vídeos já processados em todos os scanners do projeto
            SELECT string_agg(DISTINCT video_id, ',')
            FROM (
                SELECT unnest(string_to_array(s2."ID cache videos", ',')) as video_id
                FROM public."Scanner de videos do youtube" s2
                WHERE s2."Projeto" = s."Projeto"
                AND s2."ID cache videos" IS NOT NULL
                AND s2."ID cache videos" != ''
            ) AS all_videos
            WHERE video_id IS NOT NULL AND video_id != ''
        )
    ) INTO result
    FROM public."Scanner de videos do youtube" s
    LEFT JOIN public."Projeto" p ON s."Projeto" = p.id
    WHERE s.id = scanner_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso:
-- SELECT get_projeto_data_completo(469);