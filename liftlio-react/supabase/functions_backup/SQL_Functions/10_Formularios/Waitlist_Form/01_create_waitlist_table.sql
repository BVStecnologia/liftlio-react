-- =============================================
-- ARQUIVO 01: Criar Tabela waitlist
-- =============================================
--
-- DESCRIÇÃO:
-- Este arquivo cria a tabela principal 'waitlist' que armazena
-- as inscrições na fila de espera do Liftlio durante o beta.
--
-- ORDEM DE EXECUÇÃO: 1º (executar PRIMEIRO)
--
-- =============================================
-- COMO TESTAR APÓS EXECUTAR
-- =============================================
--
-- TESTE 1: Verificar estrutura da tabela
-- (Copie e cole no SQL Editor)
--
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'waitlist'
ORDER BY ordinal_position;
--
-- RESULTADO ESPERADO:
-- 10 linhas mostrando: id, name, email, website_url, discovery_source,
-- status, position_in_queue, created_at, updated_at, notes
--
-- =============================================
--
-- TESTE 2: Verificar RLS policies
-- (Copie e cole no SQL Editor)
--
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'waitlist';
--
-- RESULTADO ESPERADO:
-- 4 policies:
-- 1. Anyone can insert waitlist entry (INSERT)
-- 2. Users can view their own waitlist entry (SELECT)
-- 3. Only service role can update waitlist (UPDATE)
-- 4. Only service role can delete waitlist (DELETE)
--
-- =============================================
--
-- TESTE 3: Confirmar que tabela está vazia
-- (Copie e cole no SQL Editor)
--
SELECT * FROM waitlist;
--
-- RESULTADO ESPERADO:
-- 0 linhas (tabela vazia, sem erros)
--
-- =============================================
--
-- TESTE 4 (OPCIONAL): Inserir dados de teste manualmente
-- (Use este teste APENAS se quiser validar estrutura antes de criar as funções)
--
INSERT INTO waitlist (name, email, website_url, discovery_source)
VALUES ('Valdair Test', 'valdair3d@gmail.com', 'https://liftlio.com', 'LinkedIn');
--
SELECT * FROM waitlist;
--
-- RESULTADO ESPERADO:
-- 1 linha com seus dados, position_in_queue=1, status='pending'
--
-- LIMPAR DADOS DE TESTE:
DELETE FROM waitlist WHERE email = 'valdair3d@gmail.com';
--
-- =============================================

-- Criar tabela waitlist
CREATE TABLE IF NOT EXISTS public.waitlist (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  website_url TEXT,
  discovery_source TEXT NOT NULL CHECK (discovery_source IN ('Twitter/X', 'LinkedIn', 'Referral', 'YouTube', 'Google', 'Other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  position_in_queue INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Comentários para documentação
COMMENT ON TABLE public.waitlist IS 'Waitlist for Liftlio beta access';
COMMENT ON COLUMN public.waitlist.name IS 'Full name of the user';
COMMENT ON COLUMN public.waitlist.email IS 'Unique email address';
COMMENT ON COLUMN public.waitlist.website_url IS 'User website/product URL (optional)';
COMMENT ON COLUMN public.waitlist.discovery_source IS 'How user discovered Liftlio';
COMMENT ON COLUMN public.waitlist.status IS 'pending, approved, or rejected';
COMMENT ON COLUMN public.waitlist.position_in_queue IS 'Position in waitlist (auto-calculated)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON public.waitlist(position_in_queue);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_waitlist_timestamp ON public.waitlist;
CREATE TRIGGER trg_update_waitlist_timestamp
    BEFORE UPDATE ON public.waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_waitlist_updated_at();

-- RLS policies (Row Level Security)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (no auth required for signup)
DROP POLICY IF EXISTS "Anyone can insert waitlist entry" ON public.waitlist;
CREATE POLICY "Anyone can insert waitlist entry"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Policy: Users can only see their own entry
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.waitlist;
CREATE POLICY "Users can view their own waitlist entry"
  ON public.waitlist FOR SELECT
  USING (
    auth.email() = email
    OR
    auth.role() = 'service_role'
  );

-- Policy: Only service_role can update (for approval/rejection)
DROP POLICY IF EXISTS "Only service role can update waitlist" ON public.waitlist;
CREATE POLICY "Only service role can update waitlist"
  ON public.waitlist FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service_role can delete
DROP POLICY IF EXISTS "Only service role can delete waitlist" ON public.waitlist;
CREATE POLICY "Only service role can delete waitlist"
  ON public.waitlist FOR DELETE
  USING (auth.role() = 'service_role');
