# Deploy da Edge Function get-lists-data

O erro **404 - Requested function was not found** significa que a função ainda não foi publicada no Supabase.

## Opção 1: Supabase CLI com Access Token (recomendado)

O 403 "Forbidden resource" ocorre quando o CLI não está autenticado. Use um **Access Token**:

1. **Crie um token:** https://supabase.com/dashboard/account/tokens → "Generate new token"
2. **Execute no PowerShell:**
   ```powershell
   cd "e:\bk danilo\PROJECT\AIIO\aprovacao"
   $env:SUPABASE_ACCESS_TOKEN = "sbp_seu_token_aqui"
   supabase functions deploy get-lists-data --project-ref mrgnfzxjkhnrdxkfkuxc
   ```
3. **Ou use o script:** `.\deploy-function.ps1 -Token "sbp_seu_token"`

## Opção 2: Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/mrgnfzxjkhnrdxkfkuxc/functions
2. Clique em **Create a new function**
3. Nome: `get-lists-data`
4. Cole o código de `supabase/functions/get-lists-data/index.ts`
5. Clique em **Deploy**

## Opção 3: Via GitHub (se o projeto estiver conectado)

Se o repositório estiver conectado ao Supabase, as Edge Functions podem ser deployadas automaticamente nos pushes.

## Verificar se está funcionando

Após o deploy, teste:

```bash
curl -X POST "https://mrgnfzxjkhnrdxkfkuxc.supabase.co/functions/v1/get-lists-data" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZ25menhqa2hucmR4a2ZrdXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzA1NzQsImV4cCI6MjA4MDk0NjU3NH0.jn-tV7wjB8KgVv8KapEJ5sWHT5btHqfVzMBKZ4CzKrU" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"bases"}'
```

Resposta esperada: `{"success":true,"tipo":"bases","data":[...],"count":33}`
