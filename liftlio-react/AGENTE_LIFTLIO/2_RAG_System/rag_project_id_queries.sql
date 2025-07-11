-- RAG: Queries para identificar project_id em cada tabela
-- Projeto: Liftlio
-- Data: 2025-07-11
-- Objetivo: Documentar queries SQL para obter project_id em todas as tabelas usadas no RAG

-- ========================================
-- 1. Tabela: Videos
-- ========================================
-- Tem: scanner_id → Scanner tem Projeto_id
-- Query para obter project_id:
SELECT 
    v.*,
    s."Projeto_id" as project_id
FROM "Videos" v
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE v.id = $1; -- $1 = id do vídeo

-- ========================================
-- 2. Tabela: Videos_trancricao  
-- ========================================
-- Tem: table video (video_id) → Videos → Scanner → Projeto_id
-- Query para obter project_id:
SELECT 
    vt.*,
    s."Projeto_id" as project_id
FROM "Videos_trancricao" vt
LEFT JOIN "Videos" v ON vt."table video" = v.id
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE vt.id = $1; -- $1 = id da transcrição

-- ========================================
-- 3. Tabela: Comentarios_Principais
-- ========================================
-- Tem: project_id DIRETO!
-- Query para obter project_id:
SELECT 
    cp.*,
    cp.project_id
FROM "Comentarios_Principais" cp
WHERE cp.id = $1; -- $1 = id do comentário

-- Alternativa usando video_id (campo video_id é o ID do YouTube):
SELECT 
    cp.*,
    COALESCE(cp.project_id, s."Projeto_id") as project_id
FROM "Comentarios_Principais" cp
LEFT JOIN "Videos" v ON v."VIDEO" = cp.video_id::text
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE cp.id = $1; -- $1 = id do comentário

-- ========================================
-- 4. Tabela: Mensagens
-- ========================================
-- Tem: project_id DIRETO!
-- Query para obter project_id:
SELECT 
    m.*,
    m.project_id
FROM "Mensagens" m
WHERE m.id = $1; -- $1 = id da mensagem

-- ========================================
-- 5. Tabela: Projeto
-- ========================================
-- É a própria tabela de projetos
-- Query para obter project_id:
SELECT 
    p.*,
    p.id as project_id
FROM "Projeto" p
WHERE p.id = $1; -- $1 = id do projeto

-- ========================================
-- 6. Tabela: Scanner de videos do youtube
-- ========================================
-- Tem: Projeto_id DIRETO!
-- Query para obter project_id:
SELECT 
    s.*,
    s."Projeto_id" as project_id
FROM "Scanner de videos do youtube" s
WHERE s.id = $1; -- $1 = id do scanner

-- ========================================
-- 7. Tabela: Canais do youtube
-- ========================================
-- Tem: Projeto (campo que referencia projeto)
-- Query para obter project_id:
SELECT 
    c.*,
    c."Projeto" as project_id
FROM "Canais do youtube" c
WHERE c.id = $1; -- $1 = id do canal

-- ========================================
-- 8. Tabela: Respostas_Comentarios
-- ========================================
-- Tem: video_id → Videos → Scanner → Projeto_id
-- Query para obter project_id:
SELECT 
    rc.*,
    s."Projeto_id" as project_id
FROM "Respostas_Comentarios" rc
LEFT JOIN "Videos" v ON rc.video_id = v.id
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE rc.id = $1; -- $1 = id da resposta

-- ========================================
-- 9. Tabela: Integrações
-- ========================================
-- Tem: PROJETO id
-- Query para obter project_id:
SELECT 
    i.*,
    i."PROJETO id" as project_id
FROM "Integrações" i
WHERE i.id = $1; -- $1 = id da integração

-- ========================================
-- 10. Tabela: Notificacoes
-- ========================================
-- Tem: projeto_id DIRETO!
-- Query para obter project_id:
SELECT 
    n.*,
    n.projeto_id as project_id
FROM "Notificacoes" n
WHERE n.id = $1; -- $1 = id da notificação

-- ========================================
-- RESUMO DAS TABELAS
-- ========================================
/*
Tabelas com project_id DIRETO:
- Comentarios_Principais (project_id)
- Mensagens (project_id)
- Scanner de videos do youtube (Projeto_id)
- Notificacoes (projeto_id)
- Integrações (PROJETO id)
- Canais do youtube (Projeto)

Tabelas que precisam JOIN:
- Videos → scanner_id → Scanner → Projeto_id
- Videos_trancricao → table video → Videos → Scanner → Projeto_id
- Respostas_Comentarios → video_id → Videos → Scanner → Projeto_id

Tabela especial:
- Projeto (é a própria tabela de projetos, id = project_id)
*/

-- ========================================
-- QUERY GENÉRICA PARA FILTRAR POR PROJECT_ID
-- ========================================
-- Para cada tabela, adicionar WHERE project_id = $1 ou fazer JOIN apropriado

-- Exemplo para Videos (com JOIN):
SELECT v.* 
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = $1; -- $1 = project_id para filtrar

-- Exemplo para Comentarios_Principais (direto):
SELECT * 
FROM "Comentarios_Principais" 
WHERE project_id = $1; -- $1 = project_id para filtrar