# 🗺️ Roadmap - Agente Liftlio

## 📅 Janeiro 2025

### ✅ Concluído
- [x] Implementar Camada 1 (Claude AI)
- [x] Deploy Edge Function agente-liftlio
- [x] Integração com FloatingAgent.tsx
- [x] Preparar infraestrutura RAG (tabelas, campos)
- [x] Criar funções SQL de busca
- [x] Organizar documentação

### 🔄 Em Andamento
- [ ] Processar embeddings das 14 tabelas
- [ ] Integrar busca vetorial com agente
- [ ] Implementar triggers para novos dados

### 📋 Próximos Passos

#### Fase 1: Completar RAG (Prioridade Alta)
1. **Processar embeddings existentes**
   - [ ] Videos_trancricao (211 registros)
   - [ ] Comentarios_Principais (690 registros)
   - [ ] Mensagens (688 registros)
   - [ ] Outras 11 tabelas

2. **Integrar RAG com agente**
   - [ ] Modificar edge function para consultar RAG
   - [ ] Implementar fallback Claude → RAG
   - [ ] Testar qualidade das respostas

3. **Automatizar processamento**
   - [ ] Criar triggers para novos registros
   - [ ] Edge function para processar fila
   - [ ] Cron job no Supabase

#### Fase 2: Sistema de Tickets (Prioridade Média)
1. **Criar estrutura do banco**
   - [ ] Tabela support_tickets
   - [ ] Tabela ticket_messages
   - [ ] Tabela ticket_notifications
   - [ ] Configurar RLS

2. **Implementar no agente**
   - [ ] Detectar quando não consegue resolver
   - [ ] Botão "Request Human Support"
   - [ ] Capturar contexto da conversa

3. **Painel administrativo**
   - [ ] Criar rota /admin/tickets
   - [ ] Interface para responder tickets
   - [ ] Sistema de notificações

#### Fase 3: Melhorias UX (Prioridade Baixa)
- [ ] Histórico de conversas
- [ ] Sugestões preditivas
- [ ] Atalhos de teclado
- [ ] Temas dark/light
- [ ] Internacionalização

## 🎯 Metas por Trimestre

### Q1 2025 (Jan-Mar)
- ✅ Agente básico funcionando
- 🎯 RAG completo e integrado
- 🎯 Sistema de tickets implementado

### Q2 2025 (Abr-Jun)
- 🎯 Analytics do agente
- 🎯 Integração com mais fontes
- 🎯 Auto-aprendizado

### Q3 2025 (Jul-Set)
- 🎯 Agente proativo
- 🎯 Integração por voz
- 🎯 Mobile app

### Q4 2025 (Out-Dez)
- 🎯 Multi-idiomas
- 🎯 White-label
- 🎯 API pública

## 📊 KPIs para Acompanhar

1. **Taxa de Resolução**
   - Meta: 80% na Camada 1
   - Meta: 95% com Camada 1+2

2. **Tempo de Resposta**
   - Meta: < 3 segundos
   - P95: < 5 segundos

3. **Satisfação do Usuário**
   - Meta: > 4.5/5
   - NPS: > 50

4. **Custo por Interação**
   - Meta: < $0.05
   - Otimizar uso de tokens

## 🐛 Bugs Conhecidos
- [ ] Busca vetorial retornando vazio (temporariamente usando keywords)
- [ ] Timeout ocasional em respostas longas

## 💡 Ideias Futuras
- Integração com WhatsApp
- Modo offline básico
- Exportar conversas
- Treinamento customizado
- Webhooks para eventos

---

*Atualizado semanalmente. Última revisão: 10/01/2025*