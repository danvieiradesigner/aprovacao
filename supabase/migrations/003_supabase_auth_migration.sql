-- ============================================
-- MIGRAÇÃO 003 - SUPABASE AUTH + RLS
-- ============================================
-- Esta migração configura Supabase Auth e Row Level Security
-- Execute após configurar Supabase Auth no painel

-- 1. Criar tabela de perfis de usuário (vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'REQUESTER', 'APPROVER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atualizar tabela approval_requests para usar user_profiles
-- Primeiro, verificar se precisa migrar dados da tabela users antiga
DO $$
BEGIN
    -- Se a tabela users ainda existe e tem dados, migrar para user_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Migrar usuários existentes (você precisará criar usuários no Supabase Auth primeiro)
        -- Esta parte deve ser feita manualmente ou via script
        RAISE NOTICE 'Tabela users encontrada. Migre os dados manualmente para auth.users e user_profiles';
    END IF;
END $$;

-- 3. Atualizar foreign keys para usar user_profiles
DO $$
BEGIN
    -- Atualizar approval_requests.requester_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approval_requests' 
        AND column_name = 'requester_id'
        AND data_type = 'uuid'
    ) THEN
        -- Verificar se a constraint já existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'approval_requests_requester_id_fkey'
            AND table_name = 'approval_requests'
        ) THEN
            ALTER TABLE approval_requests
            DROP CONSTRAINT IF EXISTS approval_requests_requester_id_fkey,
            ADD CONSTRAINT approval_requests_requester_id_fkey 
            FOREIGN KEY (requester_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Atualizar approval_requests.approver_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approval_requests' 
        AND column_name = 'approver_id'
    ) THEN
        ALTER TABLE approval_requests
        DROP CONSTRAINT IF EXISTS approval_requests_approver_id_fkey,
        ADD CONSTRAINT approval_requests_approver_id_fkey 
        FOREIGN KEY (approver_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;

    -- Atualizar request_events.actor_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'request_events' 
        AND column_name = 'actor_id'
    ) THEN
        ALTER TABLE request_events
        DROP CONSTRAINT IF EXISTS request_events_actor_id_fkey,
        ADD CONSTRAINT request_events_actor_id_fkey 
        FOREIGN KEY (actor_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Trigger para criar perfil automaticamente ao criar usuário no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'REQUESTER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 7. Políticas RLS para approval_requests
DROP POLICY IF EXISTS "Approvers see assigned requests" ON approval_requests;
CREATE POLICY "Approvers see assigned requests"
  ON approval_requests FOR SELECT
  USING (
    approver_id = auth.uid() OR
    requester_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Approvers can update assigned requests" ON approval_requests;
CREATE POLICY "Approvers can update assigned requests"
  ON approval_requests FOR UPDATE
  USING (
    (approver_id = auth.uid() AND status IN ('PENDING', 'NEEDS_INFO')) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Requesters can update own requests" ON approval_requests;
CREATE POLICY "Requesters can update own requests"
  ON approval_requests FOR UPDATE
  USING (
    requester_id = auth.uid() AND status = 'NEEDS_INFO'
  )
  WITH CHECK (
    requester_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can do everything on requests" ON approval_requests;
CREATE POLICY "Admins can do everything on requests"
  ON approval_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 8. Políticas RLS para request_events
DROP POLICY IF EXISTS "Users see events of accessible requests" ON request_events;
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

DROP POLICY IF EXISTS "Users can create events in accessible requests" ON request_events;
CREATE POLICY "Users can create events in accessible requests"
  ON request_events FOR INSERT
  WITH CHECK (
    actor_id = auth.uid() AND
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

-- 9. Função helper para obter role do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 10. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_profile ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_profile ON approval_requests(approver_id);

-- Comentários
COMMENT ON TABLE user_profiles IS 'Perfis de usuário vinculados ao Supabase Auth';
COMMENT ON FUNCTION public.handle_new_user() IS 'Cria perfil automaticamente ao criar usuário no Supabase Auth';
COMMENT ON FUNCTION public.get_user_role() IS 'Retorna a role do usuário autenticado';

