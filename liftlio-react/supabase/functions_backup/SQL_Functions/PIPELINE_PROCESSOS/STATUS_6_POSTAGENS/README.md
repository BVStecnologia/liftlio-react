# STATUS 6 - Sistema de Agendamento e Postagens

## 📋 Visão Geral

Conjunto de funções responsáveis pelo **agendamento e postagem automática** de mensagens de engagement no YouTube.

## 🔄 Fluxo do STATUS 6

```
Comentários processados (STATUS 5)
    ↓
01_agendar_postagens_todos_projetos → Agenda postagens para todos projetos
    ↓
02_agendar_postagens_diarias → Distribui postagens ao longo do dia
    ↓
03_cron_processar_todas_postagens_pendentes → Job cron que processa pendentes
    ↓
04_processar_postagens_pendentes → Posta mensagens no YouTube
    ↓
Mensagens publicadas no YouTube ✅
```

## 📁 Arquivos

### 01_agendar_postagens_todos_projetos.sql
**Tipo:** Agendador principal
**Descrição:** Agenda postagens para todos os projetos que completaram o STATUS 5
**Chamada por:** process_engagement_messages_batch (quando status → 6)
**Saída:** Cria agendamentos na tabela de postagens

### 02_agendar_postagens_diarias.sql
**Tipo:** Distribuidor de horários
**Descrição:** Distribui postagens ao longo do dia respeitando limites diários
**Entrada:** project_id, quantidade de postagens
**Saída:** Horários agendados para cada postagem

### 03_cron_processar_todas_postagens_pendentes.sql
**Tipo:** Job Cron
**Descrição:** Executa periodicamente para processar postagens agendadas
**Schedule:** Definido no cron
**Chama:** 04_processar_postagens_pendentes

### 04_processar_postagens_pendentes.sql
**Tipo:** Executor de postagens
**Descrição:** Posta mensagens agendadas no YouTube via API
**Entrada:** Busca postagens pendentes
**Saída:** Atualiza status das mensagens postadas

## 🛡️ Proteções

- ✅ Limite de postagens por dia
- ✅ Distribuição uniforme de horários
- ✅ Retry em caso de falha na API do YouTube
- ✅ Validação de quota da API
- ✅ Logs de sucesso/erro

## 🔗 Conexão com STATUS 5

Quando o STATUS_5 termina de processar todos os comentários:
1. Atualiza status do projeto → 6
2. Chama `agendar_postagens_todos_projetos()`
3. Sistema de postagens assume controle

## 📊 Monitoramento

```sql
-- Ver postagens agendadas
SELECT * FROM "Postagens_Agendadas"
WHERE status = 'pendente'
ORDER BY horario_agendado;

-- Ver últimas postagens realizadas
SELECT * FROM "Mensagens"
WHERE respondido = true
ORDER BY data_postagem DESC
LIMIT 10;
```

---

**Criado:** 17/10/2025
**Última atualização:** 17/10/2025
**Responsável:** Pipeline de Engagement Liftlio
