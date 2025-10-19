# Waitlist Form - SQL Functions

Sistema de inscrição na fila de espera do Liftlio (beta).

## 📋 Ordem de Execução

Execute os arquivos **nesta ordem exata** no SQL Editor do Supabase:

### 1️⃣ `01_create_waitlist_table.sql`
Cria a tabela principal `waitlist`.

**Testar:**
```sql
SELECT * FROM waitlist;
```

---

### 2️⃣ `02_send_waitlist_email.sql`
Cria função que envia email de confirmação.

**Testar:**
```sql
SELECT send_waitlist_email('valdair3d@gmail.com', 'Valdair');
```

Verifique o email em valdair3d@gmail.com.

---

### 3️⃣ `03_add_to_waitlist.sql`
Função principal de inscrição (chama a função de email automaticamente).

**Testar:**
```sql
SELECT add_to_waitlist(
    'Valdair',
    'valdair3d@gmail.com',
    'https://liftlio.com',
    'LinkedIn'
);
```

**Verificar dados:**
```sql
SELECT * FROM waitlist;
```

---

## ✅ Checklist

- [ ] Arquivo 01 executado sem erros
- [ ] Arquivo 02 executado sem erros
- [ ] Arquivo 03 executado sem erros
- [ ] Teste retornou `"success": true`
- [ ] Email chegou com design roxo responsivo
- [ ] Dados salvos na tabela `waitlist`

---

## 📧 Template de Email

O template `waitlist-confirmation` já foi inserido na tabela `email_templates` pelo agente Supabase.

**Características:**
- Responsivo (mobile-first)
- Em inglês
- Gradiente roxo (#7c3aed → #a855f7)
- Frase de impacto: "Turn YouTube into Your Lead Generation Machine"
- 1 CTA: https://liftlio.com

---

## 🔧 Estrutura da Tabela

```sql
waitlist (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  website_url TEXT,
  discovery_source TEXT (Twitter/X, LinkedIn, Referral, YouTube, Google, Other),
  status TEXT DEFAULT 'pending' (pending, approved, rejected),
  position_in_queue INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  notes TEXT
)
```
