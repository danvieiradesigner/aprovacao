# 🚀 Deploy da Edge Function `send-response-webhook`

## ⚠️ Importante

**Edge Functions** são diferentes de **Database Functions**!

- **Edge Function** = Código TypeScript/Deno que roda no servidor (o que você precisa)
- **Database Function** = Código SQL/PostgreSQL que roda no banco (não é isso!)

## 📋 Pré-requisitos

1. **Supabase CLI instalado**
2. **Acesso ao seu projeto Supabase**

## 🔧 Instalação do Supabase CLI

Se ainda não tiver instalado:

```bash
# Windows (PowerShell)
npm install -g supabase

# Linux/Mac
npm install -g supabase
```

## 🚀 Deploy da Edge Function

### 1. Fazer Login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para autenticação.

### 2. Linkar ao Projeto

```bash
# No diretório do projeto
cd e:\bk danilo\PROJECT\AIIO\aprovacao

# Linkar ao projeto (substitua pelo seu project-ref)
supabase link --project-ref seu-project-ref
```

**Como encontrar o project-ref:**
- Acesse o dashboard do Supabase
- Vá em **Settings** → **General**
- O **Reference ID** é o seu `project-ref`

### 3. Fazer Deploy

```bash
supabase functions deploy send-response-webhook
```

### 4. Verificar Deploy

Após o deploy, você verá algo como:

```
Deployed Function send-response-webhook
URL: https://seu-projeto.supabase.co/functions/v1/send-response-webhook
```

## ✅ Testar a Edge Function

Você pode testar usando curl ou Postman:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-response-webhook \
  -H "Authorization: Bearer sua-anon-key" \
  -H "apikey: sua-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "aprovar",
    "descricao": "Teste",
    "request_id": "test-id",
    "id_code": "REQ-2024-0001",
    "telefone": "5511999999999"
  }'
```

## 🐛 Troubleshooting

### Erro: "Command not found: supabase"

```bash
npm install -g supabase
```

### Erro: "Not logged in"

```bash
supabase login
```

### Erro: "Project not linked"

```bash
supabase link --project-ref seu-project-ref
```

### Ver logs da Edge Function

```bash
supabase functions logs send-response-webhook
```

## 📝 Notas

- A Edge Function já está criada em `supabase/functions/send-response-webhook/index.ts`
- Você só precisa fazer o deploy usando o CLI
- Não precisa criar nada no dashboard do Supabase
- O frontend já está configurado para chamar esta função
