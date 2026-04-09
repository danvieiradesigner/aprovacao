# Deploy da Edge Function get-lists-data via CLI
# 
# 1. Crie um Access Token em: https://supabase.com/dashboard/account/tokens
# 2. Execute: $env:SUPABASE_ACCESS_TOKEN="sbp_seu_token_aqui"; .\deploy-function.ps1
#    OU: .\deploy-function.ps1 -Token "sbp_seu_token_aqui"

param(
    [string]$Token = $env:SUPABASE_ACCESS_TOKEN
)

if (-not $Token) {
    Write-Host "ERRO: Access Token nao informado." -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Acesse: https://supabase.com/dashboard/account/tokens"
    Write-Host "2. Crie um novo token"
    Write-Host "3. Execute:" -ForegroundColor Yellow
    Write-Host '   $env:SUPABASE_ACCESS_TOKEN="sbp_seu_token"; .\deploy-function.ps1'
    Write-Host ""
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $Token
Set-Location $PSScriptRoot

Write-Host "Fazendo deploy de get-lists-data..." -ForegroundColor Cyan
supabase functions deploy get-lists-data --project-ref mrgnfzxjkhnrdxkfkuxc

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Deploy falhou. Verifique o token e as permissoes." -ForegroundColor Red
    exit 1
}
