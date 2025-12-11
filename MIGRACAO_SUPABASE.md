# 🚀 Guia de Migração: Backend → Supabase Completo

## 📊 Resumo: O que você pode remover

### ❌ **PODE REMOVER COMPLETAMENTE:**
- ✅ `backend/src/routes/auth.ts` → Substituído por Supabase Auth
- ✅ `backend/src/middleware/auth.ts` → Substituído por RLS (Row Level Security)
- ✅ `backend/src/utils/jwt.ts` → Supabase gera tokens automaticamente
- ✅ `backend/src/routes/users.ts` → Gerenciamento via Supabase Auth + tabela de perfis
- ✅ `backend/src/index.ts` → Apenas se migrar tudo para Edge Functions

### ⚠️ **PRECISA MIGRAR (mas pode simplificar):**
- `backend/src/routes/requests.ts` → Pode virar Edge Functions ou chamadas diretas do frontend com RLS
- `backend/src/routes/reports.ts` → Pode ser query direta do frontend com RLS
- `backend/src/routes/history.ts` → Pode ser query direta do frontend com RLS

## 🎯 Arquitetura Nova (100% Supabase)

### **Opção 1: Frontend Direto (Recomendado para começar)**
```
Frontend → Supabase Client → Supabase Auth + RLS → PostgreSQL
```

**Vantagens:**
- ✅ Zero backend para manter
- ✅ Mais rápido
- ✅ Menos custos
- ✅ Escalável automaticamente

**Desvantagens:**
- ⚠️ Lógica de negócio no frontend (mas pode usar Edge Functions depois)

### **Opção 2: Edge Functions (Para lógica complexa)**
```
Frontend → Supabase Edge Functions → Supabase Auth + RLS → PostgreSQL
```

**Vantagens:**
- ✅ Lógica de negócio isolada
- ✅ Mais seguro para operações sensíveis
- ✅ Ainda sem servidor para gerenciar

## 📝 Passo a Passo da Migração

### **1. Configurar Supabase Auth**

#### 1.1. Ativar Email/Password no Supabase
- No painel: Authentication → Providers → Email
- Ativar "Enable email provider"

#### 1.2. Criar tabela de perfis (substitui a tabela `users`)
```sql
-- Adicionar coluna role na tabela auth.users não é possível diretamente
-- Criar tabela de perfis vinculada ao auth.users

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'REQUESTER', 'APPROVER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'REQUESTER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **2. Configurar Row Level Security (RLS)**

#### 2.1. Habilitar RLS nas tabelas
```sql
-- Habilitar RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: ADMIN pode ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Política: APPROVER vê apenas suas solicitações atribuídas
CREATE POLICY "Approvers see assigned requests"
  ON approval_requests FOR SELECT
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Política: REQUESTER vê apenas suas solicitações
CREATE POLICY "Requesters see own requests"
  ON approval_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'APPROVER')
    )
  );

-- Política: APPROVER pode atualizar status de suas solicitações
CREATE POLICY "Approvers can update assigned requests"
  ON approval_requests FOR UPDATE
  USING (
    approver_id = auth.uid() AND status IN ('PENDING', 'NEEDS_INFO')
  )
  WITH CHECK (
    approver_id = auth.uid()
  );

-- Política: ADMIN pode fazer tudo
CREATE POLICY "Admins can do everything"
  ON approval_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Política: Usuários podem ver eventos de solicitações que têm acesso
CREATE POLICY "Users see events of accessible requests"
  ON request_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests
      WHERE id = request_events.request_id
      AND (
        requester_id = auth.uid() OR
        approver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
    )
  );

-- Política: Usuários podem criar eventos em solicitações que têm acesso
CREATE POLICY "Users can create events in accessible requests"
  ON request_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM approval_requests
      WHERE id = request_events.request_id
      AND (
        requester_id = auth.uid() OR
        approver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
    )
  );
```

### **3. Atualizar Frontend para usar Supabase Auth**

#### 3.1. Instalar Supabase no frontend
```bash
cd frontend
npm install @supabase/supabase-js
```

#### 3.2. Criar cliente Supabase
```typescript
// frontend/src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 3.3. Atualizar AuthContext
```typescript
// frontend/src/contexts/AuthContext.tsx
import { supabase } from '../services/supabase';
import { User, Session } from '@supabase/supabase-js';

// Substituir login por:
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // ...
};

// Substituir logout por:
const signOut = async () => {
  await supabase.auth.signOut();
  // ...
};
```

### **4. Migrar Queries do Backend para Frontend**

Todas as queries que estavam no backend podem ser feitas diretamente do frontend:

```typescript
// Exemplo: Buscar solicitações
const { data, error } = await supabase
  .from('approval_requests')
  .select(`
    *,
    requester:user_profiles!approval_requests_requester_id_fkey(id, username),
    approver:user_profiles!approval_requests_approver_id_fkey(id, username)
  `)
  .order('created_at', { ascending: false });
```

O RLS garante que cada usuário só vê o que tem permissão!

## 🎯 O que você PRECISA manter (opcional)

### **Edge Functions (se precisar de lógica complexa)**

Se precisar de lógica que não pode ser feita no frontend (ex: geração de Excel, processamento pesado), crie Edge Functions:

```typescript
// supabase/functions/generate-report/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Sua lógica aqui
  return new Response(JSON.stringify({ data: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## ✅ Checklist de Migração

- [ ] Criar tabela `user_profiles` no Supabase
- [ ] Configurar trigger para criar perfil automaticamente
- [ ] Habilitar RLS em todas as tabelas
- [ ] Criar políticas RLS para cada role
- [ ] Atualizar frontend para usar Supabase Auth
- [ ] Migrar queries do backend para frontend
- [ ] Testar permissões (ADMIN, APPROVER, REQUESTER)
- [ ] Remover backend (ou manter mínimo para Edge Functions)

## 🚨 Importante

1. **Migração de dados:** Se já tem usuários no sistema antigo, precisa migrar:
   - Criar usuários no Supabase Auth
   - Criar perfis correspondentes na tabela `user_profiles`

2. **Senhas:** Não dá para migrar senhas hasheadas. Precisa resetar ou criar novos usuários.

3. **Service Role Key:** Use apenas em Edge Functions ou scripts administrativos. **NUNCA** no frontend!

## 📚 Próximos Passos

1. Quer que eu crie os arquivos de migração SQL?
2. Quer que eu atualize o frontend para usar Supabase Auth?
3. Quer que eu crie Edge Functions para lógica específica?

