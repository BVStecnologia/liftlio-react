# 14_Browser - Funções SQL para Browser Integrations

> **Criado:** 2025-12-25
> **Autor:** Claude Code
> **Status:** Em desenvolvimento

## Arquitetura

```
Frontend (BrowserIntegrations.tsx)
    │
    ├── supabase.rpc('browser_execute_login', {...})
    │
    v
SQL Function (browser_execute_login)
    │
    ├── UPSERT em browser_logins
    ├── INSERT em browser_tasks
    ├── Busca browser_mcp_url de Projeto
    │
    └── net.http_post → Edge Function (fire-and-forget)
                            │
                            v
                    browser-login-executor
                            │
                            ├── Chama agente via browser_mcp_url
                            │   (agente atualiza browser_tasks)
                            │
                            └── Atualiza browser_logins.is_connected
                                        │
                                        v
                                    Realtime
                                        │
                                        v
                            Frontend atualiza UI automaticamente
```

## Funções

### browser_execute_login(project_id, platform, email, password)

**Propósito:** Dispara login em background (fire-and-forget)

**Parâmetros:**
- `p_project_id` (bigint): ID do projeto
- `p_platform_name` (text): 'google', 'youtube', 'reddit', etc
- `p_email` (text): Email do usuário
- `p_password` (text): Senha do usuário

**Retorno:**
```json
{
  "success": true,
  "task_id": "uuid-da-task",
  "login_id": 123,
  "message": "Login iniciado em background"
}
```

**Comportamento:**
1. Salva credenciais em `browser_logins`
2. Cria task em `browser_tasks` (status = 'pending')
3. Busca `browser_mcp_url` do projeto
4. Dispara Edge Function via `net.http_post` (não-bloqueante)
5. Retorna IMEDIATAMENTE (usuário pode sair da página)

### browser_execute_logout (PENDENTE)

Similar ao login, mas executa logout_prompt.

### browser_check_2fa (PENDENTE)

Para quando usuário aprovar 2FA no telefone.

## Tabelas Relacionadas

- `browser_logins`: Credenciais e status de conexão
- `browser_tasks`: Histórico de tarefas
- `browser_platforms`: Prompts de login/logout por plataforma
- `Projeto`: Contém `browser_mcp_url` (URL do agente)

## Edge Function Relacionada

`browser-login-executor` em `/Edge_Functions/browser-login-executor.ts`

## Realtime

A tabela `browser_logins` está na publicação `supabase_realtime`.
Quando `is_connected` muda, o frontend recebe evento automático.

## Testes

```sql
-- Testar login do Google
SELECT browser_execute_login(
    117,                      -- project_id
    'google',                 -- platform
    'teste@gmail.com',        -- email
    'senha123'                -- password
);

-- Verificar task criada
SELECT * FROM browser_tasks
WHERE project_id = 117
ORDER BY created_at DESC
LIMIT 1;

-- Verificar status de login
SELECT * FROM browser_logins
WHERE projeto_id = 117;
```
