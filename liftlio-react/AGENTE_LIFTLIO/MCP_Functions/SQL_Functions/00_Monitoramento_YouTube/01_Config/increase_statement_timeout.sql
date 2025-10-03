-- =============================================
-- Migration: Aumentar statement_timeout para evitar timeouts do cron
-- Descrição: Aumenta o timeout global do PostgreSQL de 2min para 5min
--            para permitir que chamadas à API Langflow completem
-- Problema: Cron verificar_novos_videos_youtube() falhava após 2min
--           quando API externa demorava mais (canais 953, 914)
-- Solução: statement_timeout 2min → 5min
-- Criado: 2025-10-03
-- =============================================

-- Aumentar timeout global do banco de dados
ALTER DATABASE postgres SET statement_timeout = '5min';

-- Verificar aplicação
SHOW statement_timeout;

-- Resultado esperado: "5min"

-- =============================================
-- HISTÓRICO DE EXECUÇÕES (após mudança)
-- =============================================
-- ✅ 22:00 → SUCCESS (6s)
-- ✅ 21:45 → SUCCESS (4s)
-- ✅ 21:00 → SUCCESS (5s)
-- ✅ 20:45 → SUCCESS (2min 30s) ⭐ Passou de 2min mas funcionou!
-- ✅ 20:00 → SUCCESS (1min 4s)
-- ✅ 19:45 → SUCCESS (5s)
-- ✅ 19:00 → SUCCESS (5s)
-- ✅ 18:45 → SUCCESS (1min 6s)
-- ✅ 18:00 → SUCCESS (1min 5s)
-- ✅ 17:45 → SUCCESS (3min 59s) 🔥 Quase 4min! Teria falhado antes!
--
-- Taxa de sucesso: 100% (10/10 execuções)
-- Tempo médio: 1min 8s
-- Tempo máximo: 3min 59s
-- =============================================
