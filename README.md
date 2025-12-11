# 🚀 Controle de Alçada de Aprovação

Sistema completo de controle de alçada para aprovação de despesas, com workflow de aprovação, relatórios e exportação para Excel.

**✨ Nova Arquitetura: 100% Supabase (Sem Backend Node.js!)**

## 📋 Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase (gratuita)
- Git

## 🗄️ Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Anote as credenciais:
   - Vá em **Settings** → **API**
   - Copie a **Project URL** (ex: `https://xxxxx.supabase.co`)
   - Copie a **anon/public** key (para o frontend)
   - Copie a **service_role** key (para Edge Functions - NUNCA no frontend!)

### 2. Executar Migrações

1. No painel do Supabase, vá em **SQL Editor**
2. Execute as migrações na ordem:
   - `supabase/migrations/001_init.sql` - Criação inicial das tabelas
   - `supabase/migrations/002_add_approver_id.sql` - Adiciona coluna approver_id (se necessário)
   - `supabase/migrations/003_supabase_auth_migration.sql` - Configura Auth + RLS

3. Verifique se as tabelas foram criadas em **Table Editor**

### 3. Configurar Supabase Auth

1. No painel do Supabase, vá em **Authentication** → **Providers**
2. Ative o provider **Email**
3. Configure conforme necessário (recomendado: desativar "Confirm email" para desenvolvimento)

### 4. Deploy da Edge Function (Opcional - para criar usuários)

Se quiser usar a funcionalidade de criar usuários pelo frontend:

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Deploy da função
supabase functions deploy create-user
```

**Nota:** A Edge Function é opcional. Você pode criar usuários diretamente no painel do Supabase se preferir.

## 🎨 Configuração do Frontend

1. Entre na pasta `frontend`:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

4. Edite o `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

## 👤 Criar Primeiro Usuário Admin

### Opção 1: Via Painel do Supabase (Recomendado)

1. No painel do Supabase, vá em **Authentication** → **Users**
2. Clique em **Add user** → **Create new user**
3. Preencha:
   - **Email:** admin@exemplo.com
   - **Password:** (sua senha)
   - **Auto Confirm User:** ✅ (marcar)
4. Após criar, vá em **SQL Editor** e execute:

```sql
-- Atualizar perfil do usuário criado para ADMIN
UPDATE user_profiles 
SET role = 'ADMIN', username = 'admin'
WHERE id = 'ID_DO_USUARIO_CRIADO';
```

### Opção 2: Via Edge Function

Se você fez deploy da Edge Function, pode criar usuários pelo frontend (apenas ADMIN).

## 🏗️ Arquitetura

```
Frontend (React) 
  ↓
Supabase Client
  ↓
Supabase Auth + RLS (Row Level Security)
  ↓
PostgreSQL (Supabase)
```

**Vantagens:**
- ✅ Zero backend para manter
- ✅ Autenticação e autorização nativas
- ✅ Segurança com RLS (Row Level Security)
- ✅ Escalável automaticamente
- ✅ Menos custos

## 🔐 Permissões e Roles

O sistema usa **Row Level Security (RLS)** do Supabase para controlar acesso:

- **ADMIN:** Acesso total (usuários, solicitações, aprovações)
- **APPROVER:** Vê apenas suas próprias solicitações atribuídas e pode aprovar/rejeitar/esclarecer
- **REQUESTER:** Vê apenas suas próprias solicitações

**Nota:** Esta plataforma é apenas para aprovação. Solicitações devem ser criadas por outro sistema e atribuídas a aprovadores através do campo `approver_id`.

## 📊 Funcionalidades

- ✅ Login com Supabase Auth
- ✅ Dashboard com métricas
- ✅ Visualização de solicitações atribuídas a cada aprovador
- ✅ Workflow de aprovação (Aprovar, Rejeitar, Esclarecer, Cancelar)
- ✅ Relatórios com filtros avançados
- ✅ Exportação para Excel (.xlsx)
- ✅ Timeline de eventos por solicitação
- ✅ Command Palette (Ctrl+K)
- ✅ Tema escuro com estética neon

## 🛠️ Scripts Disponíveis

### Frontend
- `npm run dev` - Inicia Vite dev server
- `npm run build` - Build para produção
- `npm run preview` - Preview do build

## 🔒 Segurança

- ✅ Autenticação via Supabase Auth
- ✅ Row Level Security (RLS) para controle de acesso
- ✅ Validação de dados no banco
- ✅ CORS configurado automaticamente
- ✅ Senhas hasheadas automaticamente pelo Supabase

## 📝 Notas Importantes

- O `id_code` das solicitações segue o formato: `ALC-YYYY-XXXXXX`
- Cada ação gera um evento na tabela `request_events`
- O sistema mantém histórico completo de todas as ações
- **NUNCA** exponha a `service_role` key no frontend!
- Use apenas a `anon` key no frontend

## 🐛 Troubleshooting

**Erro de conexão com Supabase:**
- Verifique se a URL e Anon Key estão corretas no `.env`
- Certifique-se de que as migrações foram executadas
- Verifique se o RLS está habilitado nas tabelas

**Erro de autenticação:**
- Limpe o localStorage do navegador e faça login novamente
- Verifique se o usuário foi criado corretamente no Supabase Auth
- Verifique se o perfil foi criado na tabela `user_profiles`

**Erro de permissão:**
- Verifique se as políticas RLS estão corretas
- Verifique se o usuário tem a role correta na tabela `user_profiles`

**Erro ao criar usuário:**
- Se estiver usando Edge Function, verifique se fez deploy
- Verifique se a service_role key está configurada na Edge Function
- Crie usuários diretamente no painel do Supabase como alternativa

## 📄 Licença

Este projeto foi desenvolvido para fins de demonstração.

## 🚀 Migração do Backend Antigo

Se você estava usando o backend Node.js anterior:

1. ✅ Execute a migração `003_supabase_auth_migration.sql`
2. ✅ Migre os usuários existentes para Supabase Auth
3. ✅ Atualize o frontend para usar Supabase diretamente
4. ✅ Remova o backend (não é mais necessário!)

Veja `MIGRACAO_SUPABASE.md` para detalhes completos da migração.
