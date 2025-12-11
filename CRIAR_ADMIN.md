# 👤 Como Criar o Primeiro Usuário Admin

## Método 1: Via Painel do Supabase (Recomendado)

### Passo 1: Criar Usuário no Supabase Auth

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Clique em **Add user** → **Create new user**
5. Preencha:
   - **Email:** `admin@exemplo.com` (ou o email que preferir)
   - **Password:** (sua senha segura)
   - **Auto Confirm User:** ✅ (marque esta opção)
6. Clique em **Create user**
7. **Copie o ID do usuário** (aparece na lista de usuários)

### Passo 2: Criar Perfil Admin

Agora você tem duas opções:

#### Opção A: Via SQL Editor (Mais Rápido)

1. No painel do Supabase, vá em **SQL Editor**
2. Execute este comando (substitua `USER_ID_AQUI` pelo ID copiado):

```sql
SELECT public.create_admin_profile('USER_ID_AQUI', 'admin');
```

Ou diretamente:

```sql
INSERT INTO user_profiles (id, username, role)
VALUES ('USER_ID_AQUI', 'admin', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', username = 'admin';
```

#### Opção B: Via MCP (Se estiver usando)

Posso executar o comando para você! Me passe o ID do usuário criado.

## Método 2: Via Frontend (Após criar primeiro admin)

Depois de ter um admin, você pode criar outros usuários pelo frontend na página **Users**.

## Método 3: Via Edge Function (Avançado)

Se você fez deploy da Edge Function `create-user`, pode criar usuários via API.

## ✅ Verificar se Funcionou

Execute no SQL Editor:

```sql
SELECT 
  u.id,
  u.email,
  p.username,
  p.role,
  p.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
WHERE p.role = 'ADMIN';
```

Você deve ver o usuário admin listado.

## 🔐 Fazer Login

1. Acesse o frontend: `http://localhost:5173`
2. Use o email e senha que você criou
3. Você deve conseguir fazer login como ADMIN

## 🆘 Problemas Comuns

**Erro: "Usuário não encontrado"**
- Certifique-se de que criou o usuário no painel primeiro
- Verifique se copiou o ID correto

**Erro: "Trigger não executou"**
- O trigger `handle_new_user` pode ter criado o perfil automaticamente
- Verifique se o perfil já existe antes de criar

**Não consigo fazer login**
- Verifique se o email está correto
- Verifique se o usuário está confirmado (Auto Confirm User)
- Limpe o localStorage do navegador

---

**Dica:** Se você me passar o ID do usuário criado, posso executar o comando SQL para você via MCP! 🚀




