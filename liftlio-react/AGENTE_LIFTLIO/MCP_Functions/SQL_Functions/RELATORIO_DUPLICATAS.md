# 🧹 RELATÓRIO DE DUPLICATAS - Liftlio SQL Functions

**Data**: 29/09/2025
**Análise**: Funções duplicadas no Supabase e arquivos locais

---

## 📊 RESUMO EXECUTIVO

### Supabase
- **Total de duplicatas**: 11 funções com múltiplas versões
- **Total de registros duplicados**: 23+ funções extras

### Local
- **Arquivos versionados encontrados**: 19 arquivos `_v1`, `_v2`, `_v3`, `_v4`
- **Arquivos duplicados em pastas diferentes**: 3 casos

---

## 🗑️ LIMPEZA RECOMENDADA

### 1️⃣ `fetch_and_store_comments_for_video`

**Supabase:**
- ❌ Deletar: OID 748137 `(p_video_id text, project_id bigint)` - versão obsoleta
- ✅ Manter: OID 748134 `(p_video_id text, project_id integer)` - EM USO

**Local:**
- ❌ Deletar: `/04_Mensagens/fetch_and_store_comments_for_video_v1.sql`
- ❌ Deletar: `/04_Mensagens/fetch_and_store_comments_for_video_v2.sql`
- ✅ Manter: `/PIPELINE_PROCESSOS/STATUS_4_COMMENT_ANALYSIS/fetch_and_store_comments_for_video.sql`

---

### 2️⃣ `atualizar_keywords_projeto`

**Supabase:**
- ❌ Deletar: OID 748067 `()` - SEM parâmetros
- ✅ Manter: OID 748068 `(projeto_id bigint)` - usada por trigger

**Local:**
- ❌ Deletar: `/06_Projetos/atualizar_keywords_projeto_v1.sql`
- ❌ Deletar: `/06_Projetos/atualizar_keywords_projeto_v2.sql`
- ✅ Manter: `/12_Keywords/atualizar_keywords_projeto.sql`

---

### 3️⃣ `check_project_display_state`

**Supabase:**
- ⚠️ Decidir: OID 764239 `(p_project_id bigint)` - simples
- ⚠️ Decidir: OID 764430 `(p_user_email text, p_project_id bigint DEFAULT NULL)` - completa
- **Nota**: Nenhuma função chama essa! Avaliar se é necessária.

**Local:**
- ❌ Deletar: `/06_Projetos/check_project_display_state.sql`
- ✅ Manter: `/13_Utils_Sistema/check_project_display_state.sql`

---

### 4️⃣ `create_youtube_scanners_for_project`

**Supabase:**
- ❌ Deletar: OID 748122 `(project_id integer)` - versão antiga
- ✅ Manter: OID 748123 `(project_id bigint)` - versão atual

**Local:**
- ❌ Deletar: `/01_YouTube/create_youtube_scanners_for_project_v1.sql`
- ❌ Deletar: `/01_YouTube/create_youtube_scanners_for_project_v2.sql`
- ✅ Manter: `/01_YouTube/create_youtube_scanners_for_project.sql` (se existir)

---

### 5️⃣ `edit_youtube_comment`

**Supabase:**
- ❌ Deletar: OID 748129 `(comment_id text, new_comment_text text)` - sem project_id
- ✅ Manter: OID 748130 `(project_id integer, comment_id text, new_comment_text text)` - completa

**Local:**
- ❌ Deletar: `/01_YouTube/edit_youtube_comment_v1.sql`
- ❌ Deletar: `/01_YouTube/edit_youtube_comment_v2.sql`
- ✅ Manter: `/01_YouTube/edit_youtube_comment.sql` (versão sem sufixo)

---

### 6️⃣ `get_youtube_videos` ⚠️ TRIPLICADA!

**Supabase:**
- ❌ Deletar: OID 748196 `(search_term text, max_results integer)` - básica
- ❌ Deletar: OID 748197 `(search_term text, max_results, published_after...)` - sem project_id
- ✅ Manter: OID 748198 `(project_id integer, search_term text, max_results...)` - completa com project_id

**Local:**
- ❌ Deletar: `/02_Videos/get_youtube_videos_v1.sql`
- ❌ Deletar: `/02_Videos/get_youtube_videos_v2.sql`
- ❌ Deletar: `/02_Videos/get_youtube_videos_v3.sql`
- ✅ Manter: `/02_Videos/get_youtube_videos.sql` (se existir)

---

### 7️⃣ `search_youtube_channels`

**Supabase:**
- ❌ Deletar: OID 748287 `(search_term text, max_results, page_token)` - sem project_id
- ✅ Manter: OID 748288 `(project_id integer, search_term text...)` - com project_id

**Local:**
- ❌ Deletar: `/01_YouTube/search_youtube_channels_v1.sql`
- ❌ Deletar: `/01_YouTube/search_youtube_channels_v2.sql`
- ✅ Manter: `/01_YouTube/search_youtube_channels.sql` (se existir)

---

### 8️⃣ `set_project_index`

**Supabase:**
- ❌ Deletar: OID 764783 `(p_user_email text, p_project_id integer)` - integer
- ✅ Manter: OID 764994 `(p_user_email text, p_project_id bigint)` - bigint (padrão atual)

**Local:** Não tem versões, OK ✅

---

### 9️⃣ `update_project_keywords`

**Supabase:**
- ❌ Deletar: OID 748327 `()` - SEM parâmetros
- ✅ Manter: OID 748328 `(project_id bigint)` - com parâmetro

**Local:** Não tem versões, OK ✅

---

### 🔟 `update_youtube_scanners`

**Supabase:**
- ❌ Deletar: OID 748343 `(project_id bigint)` - só project_id
- ✅ Manter: OID 748344 `(project_id bigint, keywords text[])` - com keywords

**Local:**
- ❌ Deletar: `/01_YouTube/update_youtube_scanners_v1.sql`
- ❌ Deletar: `/01_YouTube/update_youtube_scanners_v2.sql`
- ✅ Manter: `/01_YouTube/update_youtube_scanners.sql` (se existir)

---

### 1️⃣1️⃣ `update_youtube_videos` ⚠️ QUADRUPLICADA!

**Supabase:**
- ❌ Deletar: OID 748346 `()` - SEM parâmetros
- ❌ Deletar: OID 748347 `(project_id_param integer)` - nome estranho
- ❌ Deletar: OID 748348 `(scanner_id bigint)` - só scanner_id
- ✅ Manter: OID 748349 `(project_id_param integer, scanner_id_param bigint)` - completa

**Local:**
- ❌ Deletar: `/01_YouTube/update_youtube_videos_v1.sql`
- ❌ Deletar: `/01_YouTube/update_youtube_videos_v2.sql`
- ❌ Deletar: `/01_YouTube/update_youtube_videos_v3.sql`
- ❌ Deletar: `/01_YouTube/update_youtube_videos_v4.sql`
- ✅ Manter: `/01_YouTube/update_youtube_videos.sql` (se existir)

---

## 🔥 COMANDOS SQL DE LIMPEZA (Supabase)

```sql
-- ⚠️ BACKUP ANTES DE EXECUTAR!
-- Execute um comando por vez e verifique se não há erros

-- 1. fetch_and_store_comments_for_video
DROP FUNCTION IF EXISTS fetch_and_store_comments_for_video(text, bigint);

-- 2. atualizar_keywords_projeto
DROP FUNCTION IF EXISTS atualizar_keywords_projeto();

-- 3. check_project_display_state (escolher uma)
DROP FUNCTION IF EXISTS check_project_display_state(bigint); -- ou a outra

-- 4. create_youtube_scanners_for_project
DROP FUNCTION IF EXISTS create_youtube_scanners_for_project(integer);

-- 5. edit_youtube_comment
DROP FUNCTION IF EXISTS edit_youtube_comment(text, text);

-- 6. get_youtube_videos
DROP FUNCTION IF EXISTS get_youtube_videos(text, integer);
DROP FUNCTION IF EXISTS get_youtube_videos(text, integer, timestamp, text, text, text);

-- 7. search_youtube_channels
DROP FUNCTION IF EXISTS search_youtube_channels(text, integer, text);

-- 8. set_project_index
DROP FUNCTION IF EXISTS set_project_index(text, integer);

-- 9. update_project_keywords
DROP FUNCTION IF EXISTS update_project_keywords();

-- 10. update_youtube_scanners
DROP FUNCTION IF EXISTS update_youtube_scanners(bigint);

-- 11. update_youtube_videos
DROP FUNCTION IF EXISTS update_youtube_videos();
DROP FUNCTION IF EXISTS update_youtube_videos(integer);
DROP FUNCTION IF EXISTS update_youtube_videos(bigint);
```

---

## 🗂️ COMANDOS DE LIMPEZA LOCAL

```bash
# Execute no terminal do projeto

# Deletar todos os arquivos versionados (_v1, _v2, etc)
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/01_YouTube/create_youtube_scanners_for_project_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/01_YouTube/edit_youtube_comment_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/01_YouTube/search_youtube_channels_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/01_YouTube/update_youtube_scanners_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/01_YouTube/update_youtube_videos_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/02_Videos/get_youtube_videos_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/04_Mensagens/fetch_and_store_comments_for_video_v*.sql
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/06_Projetos/atualizar_keywords_projeto_v*.sql

# Deletar duplicatas em pastas erradas
rm /Users/valdair/Documents/Projetos/Liftlio/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/06_Projetos/check_project_display_state.sql
```

---

## 📈 IMPACTO DA LIMPEZA

### Antes:
- Supabase: ~245 funções customizadas (com 23+ duplicatas)
- Local: 265 arquivos (com 19 versionados)

### Depois:
- Supabase: ~222 funções (sem duplicatas)
- Local: ~246 arquivos (sem versões)

### Benefícios:
✅ Menos confusão sobre qual função usar
✅ Queries mais rápidas (menos sobrecarga no pg_proc)
✅ Manutenção mais fácil
✅ Sincronização clara entre local ↔ Supabase

---

## ⚠️ AVISOS IMPORTANTES

1. **SEMPRE faça backup antes de deletar funções no Supabase**
2. **Teste cada função antes de deletar** para garantir que não está em uso
3. **Execute um comando DROP por vez** e verifique se não há erros
4. **Arquivos locais**: só delete após confirmar que a versão sem sufixo existe

---

## 📝 PRÓXIMOS PASSOS

1. [ ] Revisar este relatório
2. [ ] Fazer backup do Supabase
3. [ ] Executar comandos SQL de limpeza (um por vez)
4. [ ] Executar comandos bash de limpeza local
5. [ ] Verificar se não há erros no sistema
6. [ ] Atualizar documentação

---

**Gerado por**: Claude Code
**Projeto**: Liftlio
**Objetivo**: Organização e limpeza de funções SQL