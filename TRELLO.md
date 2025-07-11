# TRELLO.md - Teste de Integração MCP Trello

## Status da Configuração
- **Data do teste**: 11/01/2025
- **MCP Trello configurado**: ✅ Sim
- **Arquivo de configuração**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Servidor MCP**: `@delorenj/mcp-server-trello` (versão mais confiável)
- **Caminho do servidor**: `/Users/valdair/.npm-global/lib/node_modules/@delorenj/mcp-server-trello/build/index.js`
- **Board ID**: `ZrgSrOmx`
- **Nome do Board**: Liftlio

## Resultados do Primeiro Teste

### ✅ Configurações Verificadas
```json
{
  "command": "/usr/local/bin/node",
  "args": ["/Users/valdair/.npm-global/lib/node_modules/@delorenj/mcp-server-trello/build/index.js"],
  "env": {
    "TRELLO_API_KEY": "3436c02dafd3cedc7015fd5e881a850c",
    "TRELLO_TOKEN": "ATTA082e00f4ffc4f35a4b753c8c955d106a21a01c91c2213bc5c9fb3c128a0a8a9f0551C6F6"
  }
}
```

### 🔄 Mudança de Servidor MCP (11/01/2025)
- **Servidor anterior**: `hrs-asano/claude-mcp-trello` (7 stars)
- **Novo servidor**: `@delorenj/mcp-server-trello` (80 stars, mais confiável)
- **Instalação**: `npm install -g @delorenj/mcp-server-trello`
- **Nota**: TRELLO_BOARD_ID removido do env (não é necessário neste servidor)

### ✅ API Trello Funcionando
- Conexão estabelecida com sucesso
- Board "Liftlio" acessível
- Card de teste criado: https://trello.com/c/8WBh2jgh/34-teste-mcp-trello-card-criado-via-api

### ❌ Ferramentas MCP não disponíveis
- As ferramentas `mcp__trello__*` não apareceram na sessão
- Necessário reiniciar o Claude Desktop

## Estrutura do Board Liftlio

### Listas e Cards (Total: 33 cards)
1. **Steve To Do Items** (3 cards)
   - Tasks pendentes para Steve

2. **Steve is Working On it** (1 card)
   - Tasks em progresso por Steve

3. **Valdair** (2 cards)
   - Tasks pendentes para Valdair

4. **Valdair Is Working On it** (2 cards)
   - Tasks em progresso por Valdair

5. **Completed** (21 cards)
   - Tasks concluídas

6. **Research laboratory items** (4 cards)
   - Items de pesquisa e desenvolvimento
   - Incluindo o card de teste criado

## Próximos Testes Após Reiniciar

### 1. Verificar disponibilidade das ferramentas MCP
Espera-se que as seguintes ferramentas estejam disponíveis:
- `mcp__trello__list_boards`
- `mcp__trello__list_lists`
- `mcp__trello__list_cards`
- `mcp__trello__create_card`
- `mcp__trello__update_card`
- `mcp__trello__move_card`
- `mcp__trello__delete_card`

### 2. Testes a realizar
1. **Listar boards** usando `mcp__trello__list_boards`
2. **Listar listas** do board Liftlio
3. **Criar card** com descrição completa
4. **Mover card** entre listas
5. **Atualizar card** (adicionar comentário, mudar nome)
6. **Deletar card** de teste

### 3. Comando para reiniciar testes
Após reiniciar o Claude, execute:
```
Continuar testes do MCP Trello conforme documentado em TRELLO.md
```

## Configuração de Atualização de Tarefas

### Identificação
- **Usuário atual**: Valdair
- **Listas de trabalho**: "Valdair" (to-do) e "Valdair Is Working On it" (em progresso)

### Regras de Idioma
- **VS Code / Documentação local**: Sempre em português
- **Trello (cards, comentários, labels)**: Sempre em inglês

### Fluxo de Trabalho do Valdair
1. **Ao iniciar tarefa**: Mover card de "Valdair" → "Valdair Is Working On it"
2. **Durante o trabalho**: Adicionar comentários em inglês com progresso
3. **Ao completar**: Mover card → "Completed" com resumo final
4. **Se bloqueado**: Adicionar label "blocked" e explicação

### Padrão de Cards (em inglês)
- **Title**: Ação clara (ex: "Implement RAG system")
- **Description**: Technical details and acceptance criteria
- **Labels**: bug, feature, enhancement, urgent, blocked
- **Comments**: Progress updates in English

### Template de Atualização
```
[DATE TIME] Progress Update:
- Completed: [what was done]
- Blockers: [if any]
- Next: [next steps]
```

### Comandos Rápidos para Claude
- "trabalhando em [tarefa]" → Move para "Valdair Is Working On it"
- "completei [tarefa]" → Move para "Completed"
- "bloqueado em [tarefa]" → Adiciona label "blocked"
- "nova tarefa [descrição]" → Cria card em "Valdair"

## Notas Importantes
- O MCP Trello está corretamente configurado
- As credenciais estão válidas e funcionando
- O board "Liftlio" está acessível
- Apenas falta disponibilizar as ferramentas MCP na sessão do Claude

## Troubleshooting
Se as ferramentas MCP não aparecerem após reiniciar:
1. Verificar logs do Claude Desktop
2. Confirmar que o servidor Node.js está rodando
3. Verificar se não há conflitos de porta
4. Testar com `npm test` no diretório do MCP Trello