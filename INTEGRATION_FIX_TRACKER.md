# 📋 INTEGRATION FIX TRACKER
## Correção do ProcessingWrapper bloqueando Integrations

**Data de Início:** 17/09/2025
**Status Geral:** 🔄 Em Progresso

---

## 🎯 PROBLEMA IDENTIFICADO
- ProcessingWrapper aparece na página de Integrations quando projeto tem status ≤ 5
- Bloqueia usuário de configurar integração em projetos novos
- Usuários com múltiplos projetos precisam fazer OAuth toda vez (sem reutilização)

---

## 📝 ETAPAS DE CORREÇÃO

### ✅ ETAPA 0: ANÁLISE COMPLETA
**Status:** ✅ CONCLUÍDA
**Descrição:** Análise profunda do problema
**Resultado:**
- Identificado ProcessingWrapper em 4 rotas (Dashboard, Monitoring, Mentions, Integrations)
- Integrations não precisa de ProcessingWrapper (página de configuração, não de dados)
- Cada projeto tem integração separada (não compartilha tokens entre projetos)

---

### ✅ ETAPA 1: CORRIGIR ORDEM DE VERIFICAÇÃO EM getLayoutType() + NAVEGAÇÃO NO DROPDOWN
**Status:** ✅ IMPLEMENTADA E MELHORADA
**Arquivos:**
- `src/App.tsx` (linhas 865-878)
- `src/components/Header.tsx` (linhas 1371-1383)

**PROBLEMA REAL IDENTIFICADO:**
- A função getLayoutType() verificava status ANTES de verificar integrações
- Isso fazia projetos novos (status 0) irem para dashboard em vez de /integrations
- ProcessingWrapper aparecia bloqueando a configuração

**MUDANÇA CORRETA:**
```jsx
// ANTES (ordem errada - linhas 865-878):
const projectStatus = parseInt(currentProject?.status || '0', 10);
if (currentProject && projectStatus <= 5) {
  return 'dashboard'; // ❌ Vai pro dashboard ANTES de verificar integrações
}
if (currentProject && !projectHasIntegrations) {
  return 'integration-setup'; // ❌ Nunca chegava aqui para projetos novos
}

// DEPOIS (ordem correta):
if (currentProject && !projectHasIntegrations) {
  return 'integration-setup'; // ✅ Verifica integrações PRIMEIRO
}
const projectStatus = parseInt(currentProject?.status || '0', 10);
if (currentProject && projectStatus <= 5) {
  return 'dashboard'; // ✅ Só vai pro dashboard se já tem integração
}
```

**MELHORIAS ADICIONADAS:**
1. **Header.tsx (linhas 1371-1388)**: Navegação automática ao trocar projeto no dropdown
   - Sem integração → /integrations
   - Com integração → /dashboard (sempre)

2. **App.tsx (linha 1074)**: Removido ProcessingWrapper de /integrations
   - Integrations não precisa de ProcessingWrapper

3. **App.tsx (linhas 924-939)**: useEffect para detectar mudanças de layout
   - Navega automaticamente quando muda entre projetos
   - Garante que sidebar apareça em projetos com dados
   - Corrigido erro ESLint: hook movido antes dos returns condicionais

**TESTE NECESSÁRIO:**
1. ✅ Criar novo projeto - vai direto para /integrations
2. ✅ Trocar entre projetos no dropdown - navega automaticamente
3. Configurar integração YouTube
4. Verificar se após configurar, vai para Dashboard com ProcessingWrapper
5. Testar alternância entre projetos com diferentes status

**✅ Testado?** [X] Implementado com navegação automática
**Resultado:** Correção completa - ordem de verificação + navegação automática no dropdown

---

### ⏸️ ETAPA 2: CRIAR FUNÇÃO SQL - Buscar Integrações do Usuário
**Status:** 🔜 PRÓXIMA
**Descrição:** Função para buscar todas integrações ativas de um usuário (cross-project)

**SQL PARA EXECUTAR NO SUPABASE:**
```sql
-- FUNÇÃO: get_user_integrations
-- Busca todas as integrações ativas de um usuário em todos os seus projetos

DROP FUNCTION IF EXISTS get_user_integrations(text);

CREATE OR REPLACE FUNCTION get_user_integrations(user_email text)
RETURNS TABLE (
    integration_id bigint,
    project_id bigint,
    project_name text,
    integration_type text,
    is_active boolean,
    token_exists boolean,
    last_updated timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        i.id as integration_id,
        i."PROJETO id" as project_id,
        p."Project name" as project_name,
        i."Tipo de integração" as integration_type,
        i.ativo as is_active,
        (i."Token" IS NOT NULL) as token_exists,
        i."Ultima atualização" as last_updated
    FROM "Integrações" i
    JOIN "Projeto" p ON i."PROJETO id" = p.id
    WHERE p.user = user_email
      AND i.ativo = true
      AND i."Token" IS NOT NULL
    ORDER BY i."Ultima atualização" DESC;
END;
$$;

-- Teste da função (substituir email):
-- SELECT * FROM get_user_integrations('usuario@email.com');
```

**✅ Testado?** [ ] Sim [ ] Não
**Resultado:** _____________

---

### ⏸️ ETAPA 3: CRIAR FUNÇÃO SQL - Copiar Integração
**Status:** 🔜 AGUARDANDO
**Descrição:** Função para copiar tokens de integração de um projeto para outro

**SQL PARA EXECUTAR NO SUPABASE:**
```sql
-- FUNÇÃO: copy_integration_to_project
-- Copia uma integração existente para um novo projeto

DROP FUNCTION IF EXISTS copy_integration_to_project(bigint, bigint, text);

CREATE OR REPLACE FUNCTION copy_integration_to_project(
    source_integration_id bigint,
    target_project_id bigint,
    user_email text
)
RETURNS TABLE (
    success boolean,
    message text,
    new_integration_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source_data record;
    v_target_exists boolean;
    v_new_id bigint;
BEGIN
    -- Verificar se integração fonte existe e pertence ao usuário
    SELECT i.*, p.user as project_owner
    INTO v_source_data
    FROM "Integrações" i
    JOIN "Projeto" p ON i."PROJETO id" = p.id
    WHERE i.id = source_integration_id
      AND p.user = user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Integração fonte não encontrada ou não pertence ao usuário', NULL::bigint;
        RETURN;
    END IF;

    -- Verificar se projeto destino já tem integração do mesmo tipo
    SELECT EXISTS (
        SELECT 1 FROM "Integrações"
        WHERE "PROJETO id" = target_project_id
          AND "Tipo de integração" = v_source_data."Tipo de integração"
    ) INTO v_target_exists;

    IF v_target_exists THEN
        RETURN QUERY SELECT false, 'Projeto destino já possui integração deste tipo', NULL::bigint;
        RETURN;
    END IF;

    -- Copiar integração
    INSERT INTO "Integrações" (
        "PROJETO id",
        "Tipo de integração",
        "Token",
        "Refresh token",
        "expira em",
        "ativo",
        "Ultima atualização"
    )
    VALUES (
        target_project_id,
        v_source_data."Tipo de integração",
        v_source_data."Token",
        v_source_data."Refresh token",
        v_source_data."expira em",
        true,
        NOW()
    )
    RETURNING id INTO v_new_id;

    RETURN QUERY SELECT true, 'Integração copiada com sucesso', v_new_id;
END;
$$;

-- Teste da função (substituir IDs e email):
-- SELECT * FROM copy_integration_to_project(1, 2, 'usuario@email.com');
```

**✅ Testado?** [ ] Sim [ ] Não
**Resultado:** _____________

---

### ⏸️ ETAPA 4: MODIFICAR Integrations.tsx - Detectar Integrações Existentes
**Status:** 🔜 AGUARDANDO
**Arquivo:** `src/pages/Integrations.tsx`

**CÓDIGO A ADICIONAR:**
```typescript
// Adicionar após linha 703 (após estados)
const [existingIntegrations, setExistingIntegrations] = useState<any[]>([]);
const [showReuseModal, setShowReuseModal] = useState(false);
const [selectedExistingIntegration, setSelectedExistingIntegration] = useState<any>(null);

// Adicionar novo useEffect para buscar integrações do usuário
useEffect(() => {
  fetchUserIntegrations();
}, []);

// Nova função para buscar todas integrações do usuário
const fetchUserIntegrations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data, error } = await supabase
      .rpc('get_user_integrations', { user_email: user.email });

    if (!error && data) {
      // Filtrar apenas integrações de OUTROS projetos
      const otherProjectIntegrations = data.filter(
        (i: any) => i.project_id !== currentProject?.id
      );
      setExistingIntegrations(otherProjectIntegrations);
    }
  } catch (error) {
    console.error('Erro ao buscar integrações do usuário:', error);
  }
};
```

**✅ Testado?** [ ] Sim [ ] Não
**Resultado:** _____________

---

### ⏸️ ETAPA 5: ADICIONAR MODAL DE REUTILIZAÇÃO
**Status:** 🔜 AGUARDANDO
**Arquivo:** `src/pages/Integrations.tsx`

**CÓDIGO DO MODAL:**
```jsx
// Adicionar antes do return final do componente
// Modal de reutilização (adicionar após linha 1314)
{showReuseModal && existingIntegrations.length > 0 && (
  <ModalOverlay>
    <ModalContent ref={modalRef}>
      <ModalCloseButton onClick={() => setShowReuseModal(false)}>
        {renderIcon(FaTimes)}
      </ModalCloseButton>

      <ModalHeader>
        <ModalIconWrapper bgColor="#FF0000">
          {renderIcon(FaYoutube)}
        </ModalIconWrapper>
        <ModalTitle>YouTube Integration Options</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <ModalText>
          We found existing YouTube connections in your other projects.
          Would you like to use one of them?
        </ModalText>

        <div style={{ marginTop: '20px' }}>
          {existingIntegrations.map((integration) => (
            <div
              key={integration.integration_id}
              style={{
                padding: '15px',
                marginBottom: '10px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedExistingIntegration?.integration_id === integration.integration_id
                  ? 'rgba(139, 92, 246, 0.1)'
                  : 'transparent'
              }}
              onClick={() => setSelectedExistingIntegration(integration)}
            >
              <div style={{ fontWeight: 'bold' }}>
                {integration.project_name}
              </div>
              <div style={{ fontSize: '12px', color: 'gray' }}>
                Last updated: {new Date(integration.last_updated).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowReuseModal(false);
              setSelectedIntegration(integrations.find(i => i.id === 'youtube'));
              setModalOpen(true);
            }}
            style={{ width: '100%' }}
          >
            Connect a Different YouTube Account
          </Button>
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalButton variant="secondary" onClick={() => setShowReuseModal(false)}>
          Cancel
        </ModalButton>

        <ModalButton
          variant="primary"
          disabled={!selectedExistingIntegration}
          onClick={handleReuseIntegration}
        >
          Use Selected Account {renderIcon(FaCheck)}
        </ModalButton>
      </ModalFooter>
    </ModalContent>
  </ModalOverlay>
)}
```

**✅ Testado?** [ ] Sim [ ] Não
**Resultado:** _____________

---

### ⏸️ ETAPA 6: IMPLEMENTAR LÓGICA DE REUTILIZAÇÃO
**Status:** 🔜 AGUARDANDO
**Arquivo:** `src/pages/Integrations.tsx`

**CÓDIGO A ADICIONAR:**
```typescript
// Adicionar após função handleConnect (linha ~960)
const handleReuseIntegration = async () => {
  if (!selectedExistingIntegration || !currentProject?.id) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data, error } = await supabase.rpc('copy_integration_to_project', {
      source_integration_id: selectedExistingIntegration.integration_id,
      target_project_id: currentProject.id,
      user_email: user.email
    });

    if (error) throw error;

    if (data && data[0]?.success) {
      setShowReuseModal(false);
      setShowSuccessMessage(true);
      fetchIntegrations(); // Recarregar integrações

      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      alert(data[0]?.message || 'Erro ao reutilizar integração');
    }
  } catch (error) {
    console.error('Erro ao reutilizar integração:', error);
    alert('Erro ao reutilizar integração');
  }
};

// Modificar handleConnect para verificar integrações existentes primeiro
const handleConnectModified = (integration: any) => {
  if (integration.id === 'youtube' && existingIntegrations.length > 0) {
    setShowReuseModal(true);
  } else {
    handleConnect(integration); // Função original
  }
};
```

**✅ Testado?** [ ] Sim [ ] Não
**Resultado:** _____________

---

## 📊 RESUMO DE TESTES

| Etapa | Testado | Funcionando | Observações |
|-------|---------|-------------|-------------|
| 1     | ⏳      | -           | -           |
| 2     | ⏳      | -           | -           |
| 3     | ⏳      | -           | -           |
| 4     | ⏳      | -           | -           |
| 5     | ⏳      | -           | -           |
| 6     | ⏳      | -           | -           |

---

## 📝 NOTAS E OBSERVAÇÕES

- Cada etapa deve ser testada individualmente
- Sempre usar DROP FUNCTION antes de CREATE para evitar duplicatas
- Testar em ambiente de desenvolvimento primeiro
- Fazer backup antes de aplicar mudanças em produção

---

## ✅ CHECKLIST FINAL

- [ ] Todos os testes passaram
- [ ] Nenhum erro no console
- [ ] ProcessingWrapper não aparece em Integrations
- [ ] Reutilização de integração funciona
- [ ] Dashboard continua mostrando ProcessingWrapper quando necessário
- [ ] Navegação entre páginas funciona corretamente

**Última Atualização:** 17/09/2025