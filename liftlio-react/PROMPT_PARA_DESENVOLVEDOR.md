# 🚀 PROMPT PARA OUTRO DESENVOLVEDOR - Google Imagen API

## 📋 COPIE E COLE ESTE PROMPT COMPLETO:

---

**"Preciso que você implemente a integração da API Google Imagen 4.0 no projeto Liftlio seguindo esta documentação completa:**

### 🎯 TASK: Implementar Google Imagen 4.0 API

**API Key com faturamento**: `AIzaSyBdOOV1fxo7B5ogOtIcxXkHu60UNXlEjeE`

### 📁 ARQUIVOS PARA CRIAR/VERIFICAR:

1. **Script Principal**: `.claude/scripts/imagen-api.sh`
2. **Edge Function**: `supabase/functions/generate-image/index.ts`  
3. **Componente React**: `src/components/ImageGenerator.tsx`
4. **Pasta de imagens**: `generated-images/`

### 🔧 PASSOS OBRIGATÓRIOS:

1. **Ler documentação completa**: `/liftlio-react/GOOGLE_IMAGEN_SETUP.md`
2. **Criar estrutura de pastas**:
   ```bash
   mkdir -p .claude/scripts generated-images
   ```
3. **Implementar script bash** com a API key fornecida
4. **Testar geração local** com prompt de exemplo
5. **Criar Edge Function** para integração Supabase
6. **Configurar API key no Vault** do Supabase:
   ```sql
   INSERT INTO vault.secrets (name, secret)
   VALUES ('GOOGLE_IMAGEN_API_KEY', 'AIzaSyBdOOV1fxo7B5ogOtIcxXkHu60UNXlEjeE');
   ```
7. **Deploy e testar** a Edge Function
8. **Criar componente React** funcional
9. **Integrar no frontend** do Liftlio

### ✅ CRITÉRIOS DE SUCESSO:

- [ ] Script local gera imagens com sucesso
- [ ] Edge Function responde corretamente
- [ ] Componente React renderiza imagens
- [ ] API key protegida no Supabase Vault
- [ ] Estrutura de arquivos organizada
- [ ] Documentação atualizada

### 🎨 TESTE FINAL:
Gerar uma imagem com prompt: `"modern dashboard UI with analytics charts, blue neon theme"`

### 📚 REFERÊNCIAS:
- Documentação completa: `/liftlio-react/GOOGLE_IMAGEN_SETUP.md`
- Arquivo de APIs: `/liftlio-react/IMAGE_APIS.md`
- Padrão do projeto: Seguir estrutura do `/liftlio-react/CLAUDE.md`

### ⚠️ IMPORTANTE:
- Seguir padrões de organização MCP do projeto
- Salvar cópias na pasta MCP se criar funções Supabase
- Manter segurança da API key
- Testar todos os componentes antes de finalizar

**Por favor, implemente tudo seguindo essa documentação e confirme quando cada etapa estiver concluída.**"

---

## 🎯 VERSÃO RESUMIDA (para chat rápido):

"Implemente Google Imagen 4.0 no Liftlio:
- API Key: AIzaSyBdOOV1fxo7B5ogOtIcxXkHu60UNXlEjeE  
- Siga: /liftlio-react/GOOGLE_IMAGEN_SETUP.md
- Crie: script bash + Edge Function + componente React
- Teste: geração de imagem funcional
- Organize: estrutura de pastas padrão MCP"