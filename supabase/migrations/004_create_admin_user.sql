-- ============================================
-- SCRIPT PARA CRIAR USUÁRIO ADMIN
-- ============================================
-- Execute este script APÓS criar o usuário no painel do Supabase Auth
-- 
-- INSTRUÇÕES:
-- 1. Vá em Authentication → Users → Add user
-- 2. Crie um usuário com:
--    - Email: admin@exemplo.com (ou o email que preferir)
--    - Password: (sua senha)
--    - Auto Confirm User: ✅ (marcar)
-- 3. Copie o ID do usuário criado
-- 4. Execute este script substituindo 'USER_ID_AQUI' pelo ID do usuário

-- Função helper para criar/atualizar perfil admin
CREATE OR REPLACE FUNCTION public.create_admin_profile(
  user_id UUID,
  username_param TEXT DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário existe no auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado no auth.users. Crie o usuário primeiro no painel do Supabase.';
  END IF;

  -- Inserir ou atualizar perfil
  INSERT INTO user_profiles (id, username, role)
  VALUES (user_id, username_param, 'ADMIN')
  ON CONFLICT (id) 
  DO UPDATE SET 
    username = username_param,
    role = 'ADMIN';
    
  RAISE NOTICE 'Perfil admin criado/atualizado com sucesso para usuário %', user_id;
END;
$$;

-- Para usar a função, execute:
-- SELECT public.create_admin_profile('USER_ID_AQUI', 'admin');

-- OU atualize diretamente (substitua USER_ID_AQUI pelo ID do usuário):
-- UPDATE user_profiles 
-- SET role = 'ADMIN', username = 'admin'
-- WHERE id = 'USER_ID_AQUI';

-- Se o perfil não existir, insira:
-- INSERT INTO user_profiles (id, username, role)
-- VALUES ('USER_ID_AQUI', 'admin', 'ADMIN')
-- ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', username = 'admin';

COMMENT ON FUNCTION public.create_admin_profile IS 'Cria ou atualiza perfil de usuário para ADMIN. Use após criar usuário no Supabase Auth.';

