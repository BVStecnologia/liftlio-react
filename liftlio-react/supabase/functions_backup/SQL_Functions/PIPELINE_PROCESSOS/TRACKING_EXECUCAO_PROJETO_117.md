# 🎯 TRACKING - UNIFIED PYTHON PIPELINE (0→4)
**Data**: 2025-10-29
**Projeto**: 117 (Liftlio Test)
**Objetivo**: Substituir Status 0→3 por chamada Python única
**Environment**: LIVE (suqjifkhmekcdflwowiw)

---

## 📊 ESTADO INICIAL

### Scanners Ativos
- **Scanner 583**: "increase shopify sales"
- **Scanner 584**: "get more customers"
- **Scanner 585**: "grow online business fast"

### Base Limpa
- ✅ **161 comentários analisados** (preservados)
- ✅ **61 mensagens geradas** (preservadas)
- ❌ **520 comentários não analisados** (DELETADOS)
- ❌ **Vídeos não verificados** (DELETADOS)

---

## 🚀 UNIFIED PIPELINE (Status 0 → 4)
**Função**: Python `process_project_unified(117)`
**Tempo Esperado**: <1 minuto (vs 3-6h no SQL)

### Etapas Executadas em Paralelo:

#### 1. BUSCA DE VÍDEOS (YouTube API)
- [ ] 3 scanners processados simultaneamente
- [ ] Queries semânticas geradas (3-15 por scanner)
- [ ] Vídeos retornados:
- [ ] Timestamp:

#### 2. BUSCA DE STATS + COMENTÁRIOS (YouTube API)
- [ ] Stats buscados para todos vídeos
- [ ] Comentários buscados (paginação paralela)
- [ ] Total comentários coletados:
- [ ] Timestamp:

#### 3. FILTRAGEM PYTHON (get_filtered_comments)
**Score**: Likes (0.2) + Tamanho (30) + Timing (30) + Órfãos (35) + Keywords (100)
- [ ] Comentários filtrados (top 100 por vídeo):
- [ ] Comentários descartados:
- [ ] Timestamp:

#### 4. ANÁLISE HAIKU (Vídeos)
**Substitui Status 3 - 10x mais barato que Claude**
- [ ] Vídeos analisados:
- [ ] Vídeos aprovados (relevantes):
- [ ] Vídeos rejeitados:
- [ ] Custo Haiku: $
- [ ] Tempo execução:
- [ ] Campos populados:
  - [ ] `is_relevant`, `relevance_score`, `relevance_reason`
  - [ ] `content_category`, `key_topics`
  - [ ] `engagement_potential`, `lead_potential`
  - [ ] `ai_analysis_summary`

#### 5. CURADORIA CLAUDE (Comentários)
**Mantém lógica anti-spam adaptativa**
- [ ] Vídeos curados:
- [ ] Comentários analisados pelo Claude:
- [ ] Comentários selecionados (top 5-15%):
- [ ] Taxa de resposta média: %
- [ ] Custo Claude: $
- [ ] Tempo execução:

#### 6. INSERÇÃO NO BANCO
- [ ] Vídeos inseridos (APENAS aprovados):
- [ ] Comentários inseridos (APENAS curados):
- [ ] Scanners atualizados ("ID Verificado"):
- [ ] Status projeto mudou para '4':
- [ ] Timestamp final:

---

## 📊 RESULTADO FINAL

### Performance
- **Tempo Total**: minutos (meta: <1min)
- **Vídeos Descobertos**:
- **Vídeos Inseridos**:
- **Comentários Coletados**:
- **Comentários Inseridos**:
- **Taxa de Aprovação Vídeos**: %
- **Taxa de Aprovação Comentários**: %

### Custos
- **Haiku (vídeos)**: $
- **Claude (comentários)**: $
- **Total**: $ (vs $ no SQL puro)

### Comparação SQL vs Python
| Métrica | SQL Antigo | Python Novo | Melhoria |
|---------|-----------|-------------|----------|
| Tempo | 3-6h | <1min | 98% |
| Status 0→3 | Sequencial | Paralelo | - |
| Análise Vídeos | Claude | Haiku | 90% custo |
| Curadoria | Claude | Claude | Mantido |

---

## ✅ VALIDAÇÕES

### Qualidade dos Dados
- [ ] Vídeos têm todos campos obrigatórios
- [ ] Comentários têm score + reasoning do Claude
- [ ] "ID Verificado" atualizado corretamente
- [ ] Nenhum vídeo duplicado

### Compatibilidade Status 4
- [ ] Status 4 (PICS) pode processar normalmente
- [ ] Comentários têm campos necessários:
  - [ ] `video_id`, `text_display`, `author_name`
  - [ ] `like_count`, `published_at`
  - [ ] `comentario_analizado = FALSE` (para PICS processar)

---

## 🚨 PROBLEMAS ENCONTRADOS

1. **[REGISTRAR AQUI]**
   - Descrição:
   - Solução:
   - Timestamp:

2. **[REGISTRAR AQUI]**
   - Descrição:
   - Solução:
   - Timestamp:

---

## 🔄 PRÓXIMOS PASSOS

- [ ] Se sucesso → Testar em projeto 118, 119
- [ ] Se falha → Analisar logs e corrigir
- [ ] Comparar leads gerados (Status 4-5) com SQL antigo
- [ ] Documentar lições aprendidas
- [ ] Remover funções SQL antigas (Status 0-3)

---

**Última Atualização**: 2025-10-29 (refatorado para Python unificado)
