# 🔧 MCP Configuration Backup
> Última atualização: 2025-01-29
> Este arquivo contém todas as configurações de MCP para restauração

## ✅ MCPs Instalados e Funcionando

### 1. 🌐 Context7 MCP (Global)
**Status**: ✅ Instalado globalmente
**Pacote**: `@upstash/context7-mcp`
**Escopo**: User (funciona em todos os projetos)

```bash
# Comando de instalação
claude mcp add context7 -s user -- npx -y @upstash/context7-mcp

# Verificar se está funcionando
claude mcp list | grep context7
```

### 2. 🎭 Playwright MCP (Global)
**Status**: ✅ Instalado globalmente
**Pacote**: `@playwright/mcp@latest`
**Escopo**: User (funciona em todos os projetos)
**Nota**: Usar Playwright ao invés do Chrome MCP para automação de browser

```bash
# Comando de instalação
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest

# Verificar se está funcionando
claude mcp list | grep playwright
```

### 3. 📋 Trello MCP (Global)
**Status**: ✅ Instalado globalmente
**Pacote**: `@welt-studio/trello-mcp-server`
**Escopo**: User (funciona em todos os projetos)
**Credenciais**: Configuradas via variáveis de ambiente

```bash
# Comando de instalação
claude mcp add trello -s user -- npx -y @welt-studio/trello-mcp-server

# Configurar credenciais (já configurado)
# TRELLO_API_KEY e TRELLO_TOKEN no ~/.claude.json

# Verificar se está funcionando
claude mcp list | grep trello

# Board ID principal: 686b43ced8d30f8eb12b9d12
```

### 4. 📝 WordPress MCP (Local - Por Projeto)
**Status**: ✅ Configurado e funcionando
**Pacote**: `@instawp/mcp-wp@latest`
**Escopo**: Local (específico do projeto Liftlio)
**Site**: https://wordpress-1319296-5689133.cloudwaysapps.com

```bash
# IMPORTANTE: Usar @instawp/mcp-wp (NÃO @automattic/mcp-wordpress-remote)
# Este pacote funciona SEM precisar de plugin no WordPress!

# Configuração correta das variáveis (ATENÇÃO aos nomes!):
# WORDPRESS_API_URL (não WP_URL)
# WORDPRESS_USERNAME (não WP_USER)
# WORDPRESS_PASSWORD (não WP_APP_PASSWORD)

# Verificar se está funcionando
claude mcp list | grep wordpress

# Credenciais configuradas:
# URL: https://wordpress-1319296-5689133.cloudwaysapps.com
# Usuário: claude
# Password: oC@5jqZc0Y*V!$Tr
```

### 5. 🗄️ Supabase MCP (Por Projeto)
**Status**: ✅ Configurado para cada projeto
**Pacote**: `@supabase/mcp-server-supabase@latest`
**Escopo**: Local (configurar em cada projeto)

#### Projeto Liftlio
```bash
# Comando de instalação (executar na raiz do projeto)
claude mcp add supabase -s local -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=suqjifkhmekcdflwowiw \
  --access-token=$SUPABASE_ACCESS_TOKEN
```

#### Projeto Secundário (exemplo)
```bash
# Para outro projeto com ID: dbnztwfymxnguuifyyyy
claude mcp add supabase -s local -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=dbnztwfymxnguuifyyyy \
  --access-token=$SUPABASE_ACCESS_TOKEN
```

## 📁 Arquivos de Configuração

### ~/.claude.json (Configuração Global)
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "trello": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@welt-studio/trello-mcp-server"],
      "env": {
        "TRELLO_API_KEY": "3436c02dafd3cedc7015fd5e881a850c",
        "TRELLO_TOKEN": "ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6"
      }
    }
  }
}
```

### .mcp.json (Configuração Local do Projeto)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=suqjifkhmekcdflwowiw",
        "--access-token=sbp_0b8789827f3a2ed426f7b4298923aa00e818c16b"
      ]
    },
    "wordpress": {
      "command": "npx",
      "args": [
        "-y",
        "@instawp/mcp-wp@latest"
      ],
      "env": {
        "WORDPRESS_API_URL": "https://wordpress-1319296-5689133.cloudwaysapps.com",
        "WORDPRESS_USERNAME": "claude",
        "WORDPRESS_PASSWORD": "oC@5jqZc0Y*V!$Tr"
      }
    },
    "trello": {
      "command": "npx",
      "args": [
        "-y",
        "@welt-studio/trello-mcp-server"
      ],
      "env": {
        "TRELLO_API_KEY": "3436c02dafd3cedc7015fd5e881a850c",
        "TRELLO_TOKEN": "ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6"
      }
    }
  }
}
```

## 🔑 Variáveis de Ambiente Necessárias

Criar arquivo `.env` na raiz do projeto (nunca commitar!):

```bash
# Supabase MCP
SUPABASE_ACCESS_TOKEN=sbp_0b8789827f3a2ed426f7b4298923aa00e818c16b
SUPABASE_PROJECT_REF=suqjifkhmekcdflwowiw

# Outros tokens do projeto Liftlio
REACT_APP_SUPABASE_URL=https://suqjifkhmekcdflwowiw.supabase.co
REACT_APP_SUPABASE_ANON_KEY=seu_anon_key_aqui
REACT_APP_GOOGLE_CLIENT_ID=seu_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=seu_google_client_secret
CLAUDE_API_KEY=seu_claude_api_key
OPENAI_API_KEY=seu_openai_api_key
```

## 🚨 Troubleshooting

### MCP não conecta
```bash
# 1. Verificar status
claude mcp list

# 2. Remover e reinstalar
claude mcp remove nome_do_mcp --scope user
claude mcp add nome_do_mcp -s user -- comando_completo

# 3. Reiniciar Claude Code
# Fechar e abrir novamente o VSCode
```

### Restaurar configuração corrompida
```bash
# 1. Backup da configuração atual
cp ~/.claude.json ~/.claude.json.backup

# 2. Limpar configuração
echo '{"mcpServers":{}}' > ~/.claude.json

# 3. Reinstalar MCPs globais
claude mcp add context7 -s user -- npx -y @upstash/context7-mcp
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest

# 4. No projeto, reinstalar MCP local
claude mcp add supabase -s local -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=suqjifkhmekcdflwowiw \
  --access-token=$SUPABASE_ACCESS_TOKEN
```

### Verificar logs de erro
```bash
# Ver logs detalhados do Claude
claude mcp list --verbose

# Ver configuração atual
cat ~/.claude.json | jq .

# Ver configuração local do projeto
cat .mcp.json | jq .
```

## 📝 Notas Importantes

1. **Nunca commitar tokens**: Use variáveis de ambiente
2. **MCPs globais vs locais**:
   - Global (user): Context7, Playwright
   - Local (project): Supabase (por projeto)
3. **Ordem de prioridade**: Local sobrescreve global
4. **Reiniciar após mudanças**: Sempre reinicie o Claude Code

## 🔄 Script de Restauração Completa

Execute este script se precisar restaurar tudo:

```bash
#!/bin/bash
# restore-mcps.sh

echo "🔧 Restaurando MCPs..."

# Instalar MCPs globais
echo "📦 Instalando Context7..."
claude mcp add context7 -s user -- npx -y @upstash/context7-mcp

echo "📦 Instalando Playwright..."
claude mcp add playwright -s user -- npx -y @playwright/mcp@latest

# Instalar Supabase local (executar na raiz do projeto)
echo "📦 Instalando Supabase para o projeto..."
claude mcp add supabase -s local -- npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=${SUPABASE_PROJECT_REF:-suqjifkhmekcdflwowiw} \
  --access-token=${SUPABASE_ACCESS_TOKEN}

echo "✅ MCPs restaurados! Verificando status..."
claude mcp list

echo "🎉 Restauração completa!"
```