# Solução do Problema OAuth - Liftlio

## Problema Identificado

O fluxo OAuth do YouTube estava falhando em produção (https://liftlio.com) devido a uma **race condition** entre componentes React:

### Sintomas:
- Google retornava para https://liftlio.com/?code=xxx&state=80
- Ao invés de processar o código OAuth, o app redirecionava para a landing page
- Perda completa do contexto OAuth

### Causa Raiz:

1. **Race Condition**: Dois componentes competiam para processar a URL na rota raiz (`/`):
   - `LandingPageHTML.tsx`: Redirecionava para `/landing-page.html` após detectar ausência de OAuth
   - `OAuthHandler` no `App.tsx`: Tentava processar OAuth params com delay

2. **Timing Issues**: Em produção, a latência de rede causava:
   - LandingPageHTML executava primeiro
   - Redirecionamento completo (`window.location.href`) matava o processo OAuth
   - OAuthHandler nunca tinha chance de processar

3. **Inconsistência no redirect_uri**: Múltiplas lógicas para determinar o redirect URI

## Solução Implementada

### 1. Componente Dedicado `OAuthProcessor`

Criado `/src/components/OAuthProcessor.tsx`:
- Componente isolado e reutilizável para processar OAuth
- Gerencia todo o fluxo de troca de código por token
- UI dedicada com feedback visual
- Tratamento robusto de erros

### 2. Refatoração do `LandingPageHTML`

Modificado para:
- Detectar OAuth params imediatamente
- Se OAuth detectado: renderizar `OAuthProcessor`
- Se não: aguardar 500ms antes de redirecionar (evita race condition)
- Estado gerenciado com `useState` para controle preciso

### 3. Remoção do `OAuthHandler` Global

- Removido OAuthHandler do App.tsx
- Elimina processamento duplicado
- Reduz complexidade e pontos de falha

### 4. Padronização do Redirect URI

Lógica unificada em todos os pontos:
```javascript
const hostname = window.location.hostname;
const protocol = window.location.protocol;
const port = window.location.port;

const redirectUri = port && port !== '80' && port !== '443'
  ? `${protocol}//${hostname}:${port}`
  : `${protocol}//${hostname}`;
```

## Benefícios da Solução

1. **Eliminação de Race Conditions**: Processamento OAuth tem prioridade absoluta
2. **Melhor UX**: Feedback visual claro durante processamento
3. **Manutenibilidade**: Código OAuth isolado e reutilizável
4. **Robustez**: Tratamento de erros centralizado
5. **Consistência**: URI de redirecionamento sempre correto

## Configuração no Google Cloud Console

Certifique-se de que os seguintes URIs estão configurados como "Authorized redirect URIs":

- `https://liftlio.com` (produção principal)
- `https://liftlio.fly.dev` (produção alternativa)
- `http://localhost:3000` (desenvolvimento)

## Fluxo Completo

1. **Iniciação** (Integrations.tsx):
   - Usuário clica em "Connect YouTube"
   - Redirect para Google OAuth com state=projectId

2. **Retorno** (Google → App):
   - Google retorna para `https://liftlio.com/?code=xxx&state=projectId`
   - LandingPageHTML detecta OAuth params

3. **Processamento** (OAuthProcessor):
   - Troca código por token
   - Salva integração no Supabase
   - Atualiza status do projeto
   - Mostra feedback visual

4. **Conclusão**:
   - Navega para `/overview`
   - ProcessingWrapper inicia análise dos vídeos

## Testes Necessários

1. ✅ OAuth em desenvolvimento (localhost:3000)
2. ✅ OAuth em produção (liftlio.com)
3. ✅ Refresh da página durante OAuth
4. ✅ Múltiplas tentativas de conexão
5. ✅ Tratamento de erros (token inválido, etc.)

## Arquivos Modificados

- `/src/components/OAuthProcessor.tsx` - NOVO
- `/src/pages/LandingPageHTML.tsx` - MODIFICADO
- `/src/pages/Integrations.tsx` - MODIFICADO
- `/src/App.tsx` - MODIFICADO (removido OAuthHandler)

## Notas de Deploy

Após deploy, verificar:
1. Console logs no browser para debug
2. Network tab para verificar redirect URI
3. Supabase logs para confirmar criação de integração
4. Status do projeto mudando para "0" (processamento)