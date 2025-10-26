-- =============================================
-- FUNÇÃO: atualizar_canais_ativos
-- =============================================
-- Criado: 2025-01-23
-- Atualizado: 2025-10-26 (documentação expandida)
--
-- DESCRIÇÃO:
-- Sistema automático de ranking de canais do YouTube que mantém ativos apenas os TOP N canais
-- mais produtivos de cada projeto, baseado na quantidade de vídeos aprovados.
--
-- COMO FUNCIONA:
-- 1. Recalcula qtd_videos para TODOS os canais do projeto (COUNT de vídeos aprovados)
-- 2. Ordena canais por qtd_videos DESC (mais produtivos primeiro)
-- 3. Ativa apenas os TOP N canais (N = Projeto.qtdmonitoramento, padrão 30)
-- 4. Desativa o resto automaticamente
--
-- CAMPOS ATUALIZADOS:
-- - qtd_videos (text) → Recontado via COUNT(*) de vídeos na tabela Videos
-- - is_active (boolean) → TRUE para TOP N, FALSE para resto
--
-- QUANDO É CHAMADA:
-- ✅ AUTOMÁTICO via trigger: trigger_atualizar_canais_ativos()
--    - Dispara em: AFTER INSERT OR UPDATE OR DELETE ON "Videos"
--    - Ou seja: sempre que um vídeo é adicionado/atualizado/removido
--
-- ✅ MANUAL: SELECT atualizar_canais_ativos(117); -- projeto específico
-- ✅ MANUAL: SELECT atualizar_canais_ativos(); -- todos projetos
--
-- VALIDAÇÕES (3 camadas):
-- 1. Customer tem Mentions > 0 (senão pula projeto)
-- 2. Youtube Active = TRUE no projeto (senão desativa todos canais)
-- 3. Canal não está desativado_pelo_user = true (canais desativados manualmente são ignorados)
--
-- EXEMPLO PRÁTICO:
-- Projeto 117 com qtdmonitoramento = 30
--
-- Estado inicial:
--   Canal A: 100 vídeos → is_active = TRUE  (rank #1)
--   Canal B: 95 vídeos  → is_active = TRUE  (rank #2)
--   ...
--   Canal Z: 50 vídeos  → is_active = TRUE  (rank #30)
--   Canal AA: 45 vídeos → is_active = FALSE (rank #31) ❌
--
-- Novo vídeo aprovado no Canal AA:
--   INSERT INTO "Videos" (channel_id_yotube = 'Canal AA')
--     ↓
--   TRIGGER dispara atualizar_canais_ativos(117)
--     ↓
--   Recalcula: Canal AA agora tem 46 vídeos
--     ↓
--   Reordena: Canal AA sobe para rank #28
--     ↓
--   Atualiza: Canal AA → is_active = TRUE ✅
--             Canal X (era #30) → is_active = FALSE ❌
--
-- COMO TESTAR:
-- 1. Ver estado atual:
--    SELECT channel_title, qtd_videos, is_active
--    FROM "Canais do youtube"
--    WHERE "Projeto" = 117
--    ORDER BY qtd_videos::integer DESC;
--
-- 2. Executar função:
--    SELECT atualizar_canais_ativos(117);
--
-- 3. Verificar mudanças (compara com step 1)
--
-- TROUBLESHOOTING:
-- ❓ "Adicionei canal mas não apareceu no ranking"
--    → Canal novo tem qtd_videos = 0 até receber primeiro vídeo aprovado
--    → Trigger só dispara quando vídeos são inseridos, não quando canal é criado
--
-- ❓ "Frontend não mostra mudanças"
--    → Backend atualiza instantaneamente via trigger
--    → Frontend não tem live reload: fazer refresh (Cmd+Shift+R)
--
-- ❓ "Canal com muitos vídeos está inativo"
--    → Verificar desativado_pelo_user = true (desativação manual)
--    → Verificar Youtube Active = false no projeto
--    → Verificar Mentions <= 0 no customer
--
-- NOTAS IMPORTANTES:
-- - Função é idempotente (pode rodar múltiplas vezes sem problemas)
-- - Não modifica ranking_score (atualizado por processar_novos_canais_youtube)
-- - Não modifica youtube_active (campo manual do usuário)
-- - Respeita desativado_pelo_user (usuário tem controle final)
-- =============================================

DROP FUNCTION IF EXISTS atualizar_canais_ativos(BIGINT);

CREATE OR REPLACE FUNCTION atualizar_canais_ativos(projeto_id_param bigint DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    projeto_record RECORD;
    qtd_monitoramento INTEGER;
    youtube_active BOOLEAN;
    v_mentions_disponiveis INTEGER;
BEGIN
    -- Se projeto_id_param for fornecido, processa apenas esse projeto
    -- Caso contrário, processa todos os projetos
    FOR projeto_record IN
        SELECT id, qtdmonitoramento, "Youtube Active"
        FROM public."Projeto"
        WHERE id = COALESCE(projeto_id_param, id)
    LOOP
        -- ⭐ Verificar se customer tem Mentions disponíveis
        SELECT COALESCE(c."Mentions", 0)
        INTO v_mentions_disponiveis
        FROM customers c
        JOIN "Projeto" p ON p."User id" = c.user_id
        WHERE p.id = projeto_record.id;

        -- Se não tem Mentions, pula este projeto (não processa canais)
        IF v_mentions_disponiveis <= 0 THEN
            RAISE NOTICE 'Projeto % sem Mentions - pulando processamento', projeto_record.id;
            CONTINUE;
        END IF;

        -- Verifica se YouTube está ativo para este projeto
        youtube_active := COALESCE(projeto_record."Youtube Active", false);

        -- Obtém a quantidade de canais a serem monitorados para este projeto
        qtd_monitoramento := COALESCE(projeto_record.qtdmonitoramento, 30);  -- Usa 30 como padrão se for NULL

        -- Primeiro, atualize o campo qtd_videos para todos os canais do projeto
        UPDATE public."Canais do youtube" c
        SET qtd_videos = subquery.num_videos::text
        FROM (
            SELECT
                c_inner.id as canal_id,
                COUNT(v.id) as num_videos
            FROM
                public."Canais do youtube" c_inner
            LEFT JOIN
                public."Videos" v ON v.channel_id_yotube = c_inner.channel_id
            WHERE
                c_inner."Projeto" = projeto_record.id
            GROUP BY
                c_inner.id
        ) AS subquery
        WHERE c.id = subquery.canal_id;

        IF NOT youtube_active THEN
            -- Se YouTube não estiver ativo, desativa todos os canais deste projeto
            UPDATE public."Canais do youtube" c
            SET is_active = false
            WHERE c."Projeto" = projeto_record.id
            AND c.desativado_pelo_user = false
            AND c.is_active = true;
        ELSE
            -- YouTube está ativo, aplica a lógica normal
            WITH canais_ordenados AS (
                SELECT
                    c.id as canal_id,
                    c.is_active as atual_is_active,
                    -- Convertendo qtd_videos para integer para ordenação correta
                    ROW_NUMBER() OVER (ORDER BY COALESCE(c.qtd_videos::integer, 0) DESC) as posicao
                FROM
                    public."Canais do youtube" c
                WHERE
                    c."Projeto" = projeto_record.id
                    AND c.desativado_pelo_user = false  -- Ignorar canais desativados pelo usuário
            )
            UPDATE public."Canais do youtube" c
            SET is_active = (co.posicao <= qtd_monitoramento)
            FROM canais_ordenados co
            WHERE c.id = co.canal_id
            AND (c.is_active != (co.posicao <= qtd_monitoramento))  -- Atualiza apenas se o status for diferente
            AND c.desativado_pelo_user = false;  -- Segurança adicional
        END IF;
    END LOOP;
END;
$$;