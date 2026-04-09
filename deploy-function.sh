#!/bin/bash
# Deploy da Edge Function get-lists-data via CLI
#
# 1. Crie um Access Token em: https://supabase.com/dashboard/account/tokens
# 2. Execute: SUPABASE_ACCESS_TOKEN=sbp_seu_token ./deploy-function.sh

cd "$(dirname "$0")"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "ERRO: Access Token não informado."
    echo ""
    echo "1. Acesse: https://supabase.com/dashboard/account/tokens"
    echo "2. Crie um novo token"
    echo "3. Execute: SUPABASE_ACCESS_TOKEN=sbp_seu_token ./deploy-function.sh"
    exit 1
fi

echo "Fazendo deploy de get-lists-data..."
supabase functions deploy get-lists-data --project-ref mrgnfzxjkhnrdxkfkuxc

if [ $? -eq 0 ]; then
    echo "Deploy concluído com sucesso!"
else
    echo "Deploy falhou. Verifique o token e as permissões."
    exit 1
fi
