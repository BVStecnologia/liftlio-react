-- =============================================
-- Script: Habilitar Realtime na tabela Projeto
-- Descrição: Garante que mudanças na tabela Projeto sejam transmitidas via Realtime
-- Criado: 2025-10-16
-- =============================================

-- PASSO 1: Verificar se a tabela está na publicação atual
SELECT
  schemaname,
  tablename,
  (
    SELECT COUNT(*)
    FROM pg_publication_tables
    WHERE schemaname = 'public'
    AND tablename = 'Projeto'
    AND pubname = 'supabase_realtime'
  ) AS "is_published"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'Projeto';

-- PASSO 2: Se não estiver publicada (is_published = 0), executar este comando:
-- IMPORTANTE: Só execute se is_published = 0 no resultado acima!

-- ALTER PUBLICATION supabase_realtime ADD TABLE "Projeto";

-- PASSO 3: Verificar novamente após executar o comando
SELECT
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE tablename = 'Projeto';

-- PASSO 4: Verificar políticas RLS (Row Level Security)
-- Para que o Realtime funcione, o usuário precisa ter permissão SELECT
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'Projeto'
AND cmd = 'SELECT';

-- RESULTADO ESPERADO:
-- Deve haver pelo menos UMA política que permita SELECT para o usuário autenticado
-- Exemplo: (roles = '{authenticated}' ou roles = '{public}') AND cmd = 'SELECT'

-- =============================================
-- NOTAS IMPORTANTES:
-- =============================================
-- 1. A tabela precisa estar na publicação "supabase_realtime"
-- 2. O usuário precisa ter permissão SELECT via RLS
-- 3. O Realtime precisa estar habilitado no projeto (Settings > API > Realtime)
-- 4. O canal Supabase Realtime usa WebSocket (porta 443)
-- =============================================
