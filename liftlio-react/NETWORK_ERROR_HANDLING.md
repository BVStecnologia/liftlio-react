# Tratamento de Erros de Rede e Interferência de Extensões

## Problema Identificado

A aplicação estava apresentando erros `Failed to fetch` quando:
1. O usuário mudava de rede de internet
2. Extensões do navegador (como `chrome-extension://hoklmmgfnpapgjgcpechhaamimifchmp`) interceptavam as requisições

## Solução Implementada

### 1. Wrapper de Fetch Seguro (`src/utils/fetchWrapper.ts`)

Criamos um wrapper robusto que:
- Detecta erros causados por extensões do navegador
- Implementa retry automático com backoff exponencial
- Fornece fallback para XMLHttpRequest quando fetch é bloqueado
- Adiciona timeout configurável para requisições

### 2. Melhorias no Cliente Supabase (`src/lib/supabaseClient.ts`)

- Integração do `safeFetch` para todas as chamadas RPC e Edge Functions
- Detecção precoce de problemas com extensões
- Retry automático em todas as requisições

### 3. Componente de Aviso ao Usuário (`src/components/ExtensionWarning.tsx`)

- Banner de aviso quando detecta interferência de extensões
- Instruções claras para o usuário
- Opções para abrir modo incógnito ou gerenciar extensões
- Aparece apenas uma vez por sessão

### 4. Melhorias no AuthContext

- Usa `retryNetworkRequest` para recuperar sessão
- Fallback para sessão em cache quando offline
- Melhor tratamento de erros de rede

## Como Funciona

1. **Detecção**: O sistema monitora erros globais e identifica padrões de extensões
2. **Retry Automático**: Quando uma requisição falha, tenta novamente até 3 vezes
3. **Fallback**: Se fetch continua falhando, usa XMLHttpRequest como alternativa
4. **Cache de Sessão**: Mantém sessão em cache para acesso offline
5. **Notificação**: Informa o usuário sobre problemas e oferece soluções

## Configuração

### Timeouts Padrão
- Requisições normais: 30 segundos
- Edge Functions: 60 segundos
- Retry delay: 1 segundo (com backoff exponencial)

### Storage Keys
- Sessão Supabase: `sb-suqjifkhmekcdflwowiw-auth-token`
- Aviso de extensão mostrado: `extensionWarningShown` (sessionStorage)

## Testando a Solução

1. **Teste de mudança de rede**:
   - Conecte-se à aplicação
   - Mude de WiFi para dados móveis
   - A aplicação deve continuar funcionando com retry automático

2. **Teste de extensão**:
   - Instale uma extensão que intercepta requisições
   - Acesse a aplicação
   - Deve aparecer o banner de aviso

## Troubleshooting

### Se os erros persistirem:

1. **Verifique o console** para mensagens detalhadas sobre qual extensão está causando problemas
2. **Tente modo incógnito** para confirmar se é problema de extensão
3. **Verifique a rede** - alguns proxies corporativos podem bloquear requisições
4. **Limpe o cache** do navegador se a sessão estiver corrompida

### Extensões conhecidas que causam problemas:

- Algumas extensões de VPN
- Bloqueadores de anúncios agressivos
- Extensões de desenvolvimento que modificam requisições
- Extensões de segurança corporativa

## Manutenção Futura

1. **Monitorar logs** para identificar novas extensões problemáticas
2. **Ajustar timeouts** conforme necessário
3. **Atualizar detecção** quando surgirem novos padrões de erro
4. **Considerar WebSockets** como alternativa para comunicação em tempo real