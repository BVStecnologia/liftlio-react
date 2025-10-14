-- =============================================
-- Função: limpar_dados_projeto
-- Descrição: Remove todos os dados associados a um projeto
-- Criado: 2025-01-24
-- Atualizado: Limpeza cascata completa de dados do projeto
-- =============================================

CREATE OR REPLACE FUNCTION public.limpar_dados_projeto(projeto_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Primeiro exclui os registros da tabela Settings messages posts
    DELETE FROM public."Settings messages posts" smp
    WHERE "Comentarios_Principal" IN (
        SELECT cp.id
        FROM public."Comentarios_Principais" cp
        JOIN public."Videos" v ON cp.video_id = v.id
        JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = projeto_id
    );
    
    RAISE NOTICE 'Registros da tabela Settings excluídos para o projeto %', projeto_id;

    -- Exclui as respostas dos comentários
    DELETE FROM public."Respostas_Comentarios" rc
    USING public."Comentarios_Principais" cp, public."Videos" v, public."Scanner de videos do youtube" s
    WHERE rc.parent_comment_id = cp.id_do_comentario
    AND cp.video_id = v.id
    AND v.scanner_id = s.id
    AND s."Projeto_id" = projeto_id;
    
    RAISE NOTICE 'Respostas dos comentários excluídas para o projeto %', projeto_id;

    -- Exclui os comentários principais
    DELETE FROM public."Comentarios_Principais" cp
    USING public."Videos" v, public."Scanner de videos do youtube" s
    WHERE cp.video_id = v.id
    AND v.scanner_id = s.id
    AND s."Projeto_id" = projeto_id;
    
    RAISE NOTICE 'Comentários principais excluídos para o projeto %', projeto_id;

    -- Exclui os vídeos
    DELETE FROM public."Videos" v
    USING public."Scanner de videos do youtube" s
    WHERE v.scanner_id = s.id
    AND s."Projeto_id" = projeto_id;
    
    RAISE NOTICE 'Vídeos excluídos para o projeto %', projeto_id;

    -- Exclui os scanners
    DELETE FROM public."Scanner de videos do youtube"
    WHERE "Projeto_id" = projeto_id;
    
    RAISE NOTICE 'Scanners excluídos para o projeto %', projeto_id;

    RAISE NOTICE 'Limpeza de dados concluída para o projeto %', projeto_id;
END;
$function$
