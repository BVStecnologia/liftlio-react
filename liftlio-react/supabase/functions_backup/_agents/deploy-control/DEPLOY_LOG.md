# 📋 DEPLOY LOG - Controle de Mudanças Local → LIVE

## 🎯 Como Usar Este Sistema

### Workflow:
1. **Desenvolver LOCAL** → Função é adicionada em "🟡 PENDING DEPLOY"
2. **Testar LOCAL** → Marcar como "✅ TESTED"
3. **Deploy no LIVE** → Mover para "🟢 DEPLOYED TO LIVE"
4. **Git commit** → Limpar seção DEPLOYED

---

## 🟡 PENDING DEPLOY (Aguardando Deploy no LIVE)

| Data | Função | Tipo | Testado | Arquivo | Notas |
|------|--------|------|---------|---------|-------|
| 2025-11-02 | call_api_edge_function | SQL | ✅ | 00_Monitoramento_YouTube/06_Chamadas_Externas/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | call_youtube_channel_details | SQL | ✅ | 00_Monitoramento_YouTube/06_Chamadas_Externas/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | call_youtube_channel_details | SQL | ✅ | 01_YouTube/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | call_api_edge_function | SQL | ✅ | 01_YouTube/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | call_youtube_channel_monitor | SQL | - | 01_YouTube/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | call_youtube_edge_function | SQL | - | 01_YouTube/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | call_youtube_edge_function | SQL | - | PIPELINE_PROCESSOS/STATUS_2_VIDEO_STATS/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | claude_edge_test | SQL | - | 03_Claude/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | process_rag_batch | SQL | - | 07_RAG_Embeddings/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | process_rag_batch_table | SQL | - | 07_RAG_Embeddings/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | send_email | SQL | - | 09_Email/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | send_email | SQL | - | 13_Utils_Sistema/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | send_email_reference | SQL | - | 10_Formularios/Waitlist_Form/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | cobrar_assinaturas_hoje | SQL | - | 10_Payments/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | orchestrate_trend_analysis | SQL | - | A_Classificar/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |
| 2025-11-02 | update_video_id_cache | SQL | - | PIPELINE_PROCESSOS/STATUS_1_SCANNER_PROCESSING/ | ⏳ Deploy quando modificar. Requer seed.sql no banco. |

---

## 🔄 IN TESTING (Em Teste Local)

| Data | Função | Tipo | Status | Arquivo | Próximos Passos |
|------|--------|------|--------|---------|-----------------|
| <!-- Funções sendo testadas localmente --> |

---

## 🟢 DEPLOYED TO LIVE (Já Deployado)

| Data Deploy | Função | Tipo | Arquivo | Deploy Method | Verificado |
|-------------|--------|------|---------|---------------|------------|
| 2025-11-14 | **get_next_scanner_to_process** | SQL | pipeline_2/01_get_next_scanner_to_process.sql | MCP apply_migration | ✅ Testado - Retorna scanner 583 (primeiro ativo do projeto 117) |
| 2025-11-02 | **seed.sql (helper functions)** | SQL | supabase/seed.sql | MCP execute_sql | ✅ Testado - Retorna URLs do LIVE |

---

## ❌ ROLLBACK NEEDED (Problemas Encontrados)

| Data | Função | Problema | Ação Necessária |
|------|--------|----------|-----------------|
| <!-- Funções com problemas que precisam rollback --> |

---

## 📝 Notas de Deploy

### Checklist Antes do Deploy:
- [ ] Função testada localmente com dados reais
- [ ] Arquivo .test.sql executado com sucesso
- [ ] BEGIN/ROLLBACK testado
- [ ] Sem erros nos logs locais
- [ ] DROP IF EXISTS incluído
- [ ] Documentação atualizada
- [ ] Git commit local

### Comando para Deploy:
```bash
# Via agente supabase-mcp-expert
Task → supabase-mcp-expert → "Deploy função X no LIVE"

# Ou manualmente via Dashboard
```

---

## 📊 Estatísticas

- **Total Pending**: 15 SQL Functions
- **Total Deployed**: 2 (seed.sql + get_next_scanner_to_process)
- **Última Atualização**: 2025-11-14
- **Git Commit**: main (deploying pipeline_2 functions)
- **Status**: ✅ Pipeline 2.0 iniciado - Função 01 deployada com sucesso