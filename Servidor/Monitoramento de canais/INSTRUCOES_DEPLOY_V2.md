# 📋 INSTRUÇÕES DE DEPLOY - Sistema Bilíngue V2

## 🎯 RESUMO
Sistema agora salva análises em **PT e EN** com campos adicionais (score, tags, timestamp).

---

## 1️⃣ DEPLOY DO SERVIDOR PYTHON (VPS 173.249.22.2)

### Arquivos para copiar:
```bash
# No seu local, copiar arquivos V2:
cd "/Users/valdair/Documents/Projetos/Liftlio/Servidor/Monitormanto de canais"

# Fazer backup dos arquivos atuais no servidor
ssh root@173.249.22.2
cd /opt/liftlio-video-qualifier
cp models.py models_backup.py
cp services/claude_service.py services/claude_service_backup.py
cp core/qualifier.py core/qualifier_backup.py
```

### Atualizar arquivos:
```bash
# Copiar novos arquivos (do local para servidor)
scp models_v2.py root@173.249.22.2:/opt/liftlio-video-qualifier/models_v2.py
scp services/claude_service_v2.py root@173.249.22.2:/opt/liftlio-video-qualifier/services/claude_service_v2.py
scp core/qualifier_v2.py root@173.249.22.2:/opt/liftlio-video-qualifier/core/qualifier_v2.py
```

### Modificar main.py para usar V2:
```bash
ssh root@173.249.22.2
cd /opt/liftlio-video-qualifier

# Editar main.py
nano main.py

# Mudar linha 11:
# DE: from models import QualifyRequest, QualificationResult, HealthResponse
# PARA: from models_v2 import QualifyRequest, QualificationResult, HealthResponse

# Mudar linha 13:
# DE: from core.qualifier import get_video_qualifier
# PARA: from core.qualifier_v2 import get_video_qualifier

# Salvar e sair (Ctrl+X, Y, Enter)
```

### Reiniciar serviço:
```bash
# Verificar se está rodando
docker ps | grep liftlio-video-qualifier

# Reiniciar
docker-compose down
docker-compose up -d --build

# Ver logs para confirmar
docker logs liftlio-video-qualifier-prod -f --tail 50

# Deve aparecer: "✅ VideoQualifierV2 initialized with bilingual support"
```

### Testar servidor:
```bash
# Testar endpoint health
curl http://173.249.22.2:8001/health

# Resposta esperada:
# {"status":"ok","service":"video-qualifier","version":"2.0.0"}
```

---

## 2️⃣ DEPLOY DA EDGE FUNCTION (Supabase)

### Copiar função para pasta de deploy:
```bash
cd /Users/valdair/Documents/Projetos/Liftlio/liftlio-react

# Criar pasta se não existir
mkdir -p supabase/functions/video-qualifier-wrapper

# Copiar novo arquivo
cp supabase/functions_backup/Edge_Functions/video-qualifier-wrapper-v2.ts \
   supabase/functions/video-qualifier-wrapper/index.ts
```

### Deploy via Supabase CLI:
```bash
# Fazer deploy
npx supabase functions deploy video-qualifier-wrapper \
  --project-ref suqjifkhmekcdflwowiw

# Se pedir, fazer login primeiro:
npx supabase login
```

### Verificar deploy:
```bash
# Listar funções deployadas
npx supabase functions list --project-ref suqjifkhmekcdflwowiw

# Deve aparecer: video-qualifier-wrapper (com timestamp recente)
```

---

## 3️⃣ TESTAR PIPELINE COMPLETO

### Testar via SQL Editor do Supabase:
```sql
-- 1. Verificar se há canais na fila
SELECT COUNT(*) as canais_na_fila
FROM "Canais do youtube"
WHERE videos_para_scann IS NOT NULL AND videos_para_scann != '';

-- 2. Se tiver, processar um canal
SELECT processar_fila_videos();

-- 3. Verificar resultado (deve ter campos bilíngues)
SELECT
    id,
    "Nome",
    videos_scanreados::jsonb->0 as primeiro_video
FROM "Canais do youtube"
WHERE videos_scanreados IS NOT NULL
  AND videos_scanreados != '[]'
ORDER BY last_canal_check DESC
LIMIT 1;
```

### Resultado esperado:
```json
{
  "id": "abc123",
  "status": "APPROVED",
  "motivo": "Vídeo sobre AI marketing B2B",
  "reason": "Video about B2B AI marketing",  // NOVO!
  "analyzed_at": "2025-01-24T12:00:00Z",     // NOVO!
  "score": 0.92,                             // NOVO!
  "tags": ["b2b", "marketing", "ai"]         // NOVO!
}
```

---

## 4️⃣ VALIDAR DADOS BILÍNGUES

### Query para verificar novos campos:
```sql
SELECT
    c."Nome" as canal,
    jsonb_array_length(c.videos_scanreados::jsonb) as total_videos,
    c.videos_scanreados::jsonb->0->>'id' as video_id,
    c.videos_scanreados::jsonb->0->>'status' as status,
    c.videos_scanreados::jsonb->0->>'motivo' as motivo_pt,
    c.videos_scanreados::jsonb->0->>'reason' as reason_en,  -- NOVO
    c.videos_scanreados::jsonb->0->>'score' as score,       -- NOVO
    c.videos_scanreados::jsonb->0->>'tags' as tags,         -- NOVO
    c.videos_scanreados::jsonb->0->>'analyzed_at' as analyzed_at  -- NOVO
FROM "Canais do youtube" c
WHERE c.videos_scanreados IS NOT NULL
  AND c.videos_scanreados != '[]'
  AND c.last_canal_check > NOW() - INTERVAL '1 hour'
LIMIT 5;
```

---

## ⚠️ ROLLBACK (Se necessário)

### Reverter Python:
```bash
ssh root@173.249.22.2
cd /opt/liftlio-video-qualifier

# Restaurar backups
cp models_backup.py models.py
cp services/claude_service_backup.py services/claude_service.py
cp core/qualifier_backup.py core/qualifier.py

# Reverter main.py para imports originais
nano main.py
# Mudar de volta para: from models import ...
# Mudar de volta para: from core.qualifier import ...

# Reiniciar
docker-compose down && docker-compose up -d --build
```

### Reverter Edge Function:
```bash
# Re-deployar versão antiga
cd /Users/valdair/Documents/Projetos/Liftlio/liftlio-react
cp supabase/functions_backup/Edge_Functions/video-qualifier-wrapper.ts \
   supabase/functions/video-qualifier-wrapper/index.ts

npx supabase functions deploy video-qualifier-wrapper \
  --project-ref suqjifkhmekcdflwowiw
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Python V2 deployado e rodando (version: "2.0.0")
- [ ] Edge Function V2 deployada
- [ ] Pipeline processando com novos campos
- [ ] Campo `reason` (inglês) sendo salvo
- [ ] Campo `analyzed_at` com timestamp
- [ ] Campo `score` com valor 0.0-1.0
- [ ] Campo `tags` com array de strings
- [ ] Função SQL anterior ainda compatível

---

## 📞 SUPORTE

Se houver problemas:
1. Verificar logs do Python: `docker logs liftlio-video-qualifier-prod -f`
2. Verificar logs da Edge Function no Dashboard Supabase
3. Verificar tabela `debug_processar_fila` para debug SQL

---

**NOTA:** Sistema é retrocompatível. Dados antigos continuam funcionando, novos dados terão campos bilíngues.