# Estratégias para Identificação de project_id no RAG

## Visão Geral

Este documento detalha as estratégias para identificar o `project_id` em cada tabela do Supabase usada no sistema RAG do Liftlio.

## Tabelas e Estratégias

### 1. **Videos**
- **Campo de ligação**: `scanner_id`
- **Estratégia**: JOIN com `Scanner de videos do youtube`
- **Query**:
```sql
SELECT v.*, s."Projeto_id" as project_id
FROM "Videos" v
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
```

### 2. **Videos_trancricao**
- **Campos de ligação**: 
  - `table video` (pode estar NULL)
  - `video_id` (ID do YouTube)
- **Estratégia**: 
  1. Tentar usar `table video` primeiro
  2. Se NULL, tentar encontrar o vídeo pelo YouTube ID
- **Query**:
```sql
-- Opção 1: Usando table video
SELECT vt.*, s."Projeto_id" as project_id
FROM "Videos_trancricao" vt
LEFT JOIN "Videos" v ON vt."table video" = v.id
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id

-- Opção 2: Usando video_id (YouTube ID)
SELECT vt.*, s."Projeto_id" as project_id
FROM "Videos_trancricao" vt
LEFT JOIN "Videos" v ON v."VIDEO" = vt.video_id
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
```

### 3. **Comentarios_Principais**
- **Campo direto**: `project_id`
- **Estratégia**: Usar campo direto
- **Query**:
```sql
SELECT cp.*, cp.project_id
FROM "Comentarios_Principais" cp
```

### 4. **Mensagens**
- **Campo direto**: `project_id`
- **Estratégia**: Usar campo direto
- **Query**:
```sql
SELECT m.*, m.project_id
FROM "Mensagens" m
```

### 5. **Projeto**
- **Campo**: `id` (é o próprio project_id)
- **Estratégia**: A tabela em si representa os projetos
- **Query**:
```sql
SELECT p.*, p.id as project_id
FROM "Projeto" p
```

### 6. **Scanner de videos do youtube**
- **Campo direto**: `Projeto_id`
- **Estratégia**: Usar campo direto
- **Query**:
```sql
SELECT s.*, s."Projeto_id" as project_id
FROM "Scanner de videos do youtube" s
```

### 7. **Canais do youtube**
- **Campo direto**: `Projeto`
- **Estratégia**: Usar campo direto
- **Query**:
```sql
SELECT c.*, c."Projeto" as project_id
FROM "Canais do youtube" c
```

### 8. **Respostas_Comentarios**
- **Campo de ligação**: `video_id`
- **Estratégia**: JOIN com Videos e Scanner
- **Query**:
```sql
SELECT rc.*, s."Projeto_id" as project_id
FROM "Respostas_Comentarios" rc
LEFT JOIN "Videos" v ON rc.video_id = v.id
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
```

### 9. **Integrações**
- **Campo direto**: `PROJETO id`
- **Estratégia**: Usar campo direto
- **Query**:
```sql
SELECT i.*, i."PROJETO id" as project_id
FROM "Integrações" i
```

### 10. **Notificacoes**
- **Campo direto**: `projeto_id`
- **Estratégia**: Usar campo direto
- **Query**:
```sql
SELECT n.*, n.projeto_id as project_id
FROM "Notificacoes" n
```

## Resumo por Tipo de Estratégia

### Tabelas com project_id Direto (6 tabelas)
1. `Comentarios_Principais` - campo: `project_id`
2. `Mensagens` - campo: `project_id`
3. `Scanner de videos do youtube` - campo: `Projeto_id`
4. `Notificacoes` - campo: `projeto_id`
5. `Integrações` - campo: `PROJETO id`
6. `Canais do youtube` - campo: `Projeto`

### Tabelas que Precisam JOIN (3 tabelas)
1. `Videos` → `scanner_id` → `Scanner` → `Projeto_id`
2. `Videos_trancricao` → `table video` ou `video_id` → `Videos` → `Scanner` → `Projeto_id`
3. `Respostas_Comentarios` → `video_id` → `Videos` → `Scanner` → `Projeto_id`

### Tabela Especial (1 tabela)
1. `Projeto` - o próprio `id` é o `project_id`

## Considerações Importantes

1. **Dados Órfãos**: Alguns registros em `Videos_trancricao` podem não ter `table video` preenchido. Nesses casos, tentar usar o `video_id` (YouTube ID) para encontrar o vídeo correspondente.

2. **Performance**: Para queries em larga escala, considerar criar índices nos campos de JOIN:
   - `Videos.scanner_id`
   - `Videos.VIDEO` (para busca por YouTube ID)
   - `Videos_trancricao.table video`
   - `Respostas_Comentarios.video_id`

3. **Filtragem por Projeto**: Ao implementar o RAG, sempre filtrar os dados pelo `project_id` do usuário atual para garantir isolamento de dados entre projetos.

4. **Campos NULL**: Sempre usar LEFT JOIN para não perder registros que possam ter referências NULL.

## Exemplo de Uso no RAG

Para implementar a filtragem por projeto no RAG:

```sql
-- Buscar todos os vídeos de um projeto específico
SELECT v.* 
FROM "Videos" v
JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = $1 -- $1 = project_id do usuário

-- Buscar todos os comentários de um projeto
SELECT * 
FROM "Comentarios_Principais" 
WHERE project_id = $1 -- $1 = project_id do usuário

-- Buscar todas as transcrições de um projeto
SELECT vt.*
FROM "Videos_trancricao" vt
LEFT JOIN "Videos" v ON vt."table video" = v.id
LEFT JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
WHERE s."Projeto_id" = $1 -- $1 = project_id do usuário
```