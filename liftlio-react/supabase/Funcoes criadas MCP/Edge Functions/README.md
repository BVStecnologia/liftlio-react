# Edge Functions - Deno/Supabase

## 📌 Arquivos com extensão `.ts.bak`

Os arquivos têm extensão `.ts.bak` ao invés de `.ts` para evitar erros no VSCode.

### Para visualizar o código:
- Abra normalmente no VSCode
- O syntax highlighting funciona
- Não há erros de TypeScript

### Para usar no Supabase:
- O código está correto
- Copie o conteúdo quando precisar
- Ou renomeie para `.ts` temporariamente

## ⚠️ Por que não usar `.ts`?

Os arquivos `.ts` desta pasta são **Edge Functions do Deno**, não arquivos TypeScript comuns do React.

### Por que aparecem erros?

O VSCode mostra erros como:
- "Não é possível localizar o módulo 'https://deno.land/...'"
- "Não é possível encontrar o nome 'Deno'"

Isso é **normal** porque:
1. São imports específicos do Deno (URLs ao invés de pacotes npm)
2. O objeto `Deno` só existe no runtime do Deno, não no Node.js
3. O VSCode está configurado para TypeScript/Node.js, não para Deno

### Como resolver os erros no editor?

**Opção 1: Ignorar os erros**
- Os arquivos funcionam perfeitamente no Supabase
- São apenas avisos do editor, não erros reais

**Opção 2: Instalar extensão Deno para VSCode**
1. Instalar a extensão "Deno" no VSCode
2. Criar um arquivo `.vscode/settings.json` nesta pasta:
```json
{
  "deno.enable": true,
  "deno.unstable": true
}
```

**Opção 3: Adicionar comentário para desabilitar checagem**
Adicione no topo de cada arquivo:
```typescript
// @ts-nocheck
```

### Como usar essas funções?

Essas funções já estão deployadas no Supabase e podem ser chamadas via HTTP:

```javascript
// Exemplo de chamada do React
const response = await fetch(
  'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/process-rag-embeddings',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      table: 'Videos',
      limit: 10
    })
  }
);
```

### Funções disponíveis:

1. **agente-liftlio**: Assistente AI com Claude
2. **process-rag-embeddings**: Processa embeddings em batch
3. **search-rag**: Busca semântica nos embeddings

---

**Nota**: Estes arquivos são apenas para referência e backup. As funções reais estão rodando no Supabase Edge Runtime.