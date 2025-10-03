# 🟢 ETAPA 1: Controle Básico de Frequência

**Status**: ⏳ Pendente
**Duração Estimada**: 2 horas
**Risco**: 🟢 ZERO
**Objetivo**: Impedir comentar 2x seguidas no mesmo canal

---

## 📋 O QUE VAI SER FEITO

1. Criar função `get_last_comment_date_on_channel()`
2. Modificar `process_monitored_videos()` para verificar antes de comentar
3. Testar com logs e queries
4. Commit no GitHub

---

## 🛠️ ARQUIVOS A CRIAR

### FUNCOES/01_get_last_comment_date_on_channel.sql

```sql
-- Ver código completo no README.md principal
```

### MODIFICAR: ../02_Descoberta/process_monitored_videos.sql

Adicionar ANTES da linha que cria comentário:

```sql
-- Verificar última vez que comentou neste canal
v_last_comment := get_last_comment_date_on_channel(v_canal_id, v_project_id);

IF v_last_comment IS NOT NULL
   AND (NOW() - v_last_comment) < INTERVAL '7 days' THEN
    RAISE NOTICE 'Canal % pulado - comentou há % dias',
        v_canal_id,
        EXTRACT(EPOCH FROM (NOW() - v_last_comment)) / 86400;
    CONTINUE;
END IF;
```

---

## ✅ TESTES

### Criar arquivo: TESTES/test_etapa_1.sql

```sql
-- Teste 1: Ver último comentário por canal
-- Teste 2: Processar vídeos e ver logs
-- Teste 3: Verificar que não há duplicatas
```

Ver testes completos no README.md principal, seção ETAPA 1.

---

## 📊 RESULTADO ESPERADO

```
✅ Sistema para de comentar no mesmo canal em < 7 dias
✅ Logs mostram: "Canal X pulado - comentou há Y dias"
✅ Zero duplicatas nos últimos 7 dias
✅ 60% do problema resolvido
```

---

## 🔄 SE DER ERRADO

Reverter é simples:
1. Remover o bloco IF adicionado
2. Nenhum dado foi modificado
3. Nada quebra

---

## ➡️ PRÓXIMO PASSO

Após testar e confirmar que funciona:
- Commit no GitHub
- Monitorar por 2-3 dias
- Se tudo OK, partir para ETAPA 2
