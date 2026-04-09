# Classificador - Fluxo Concreto

## Arquivo

**`classificador-fluxo-concreto.json`** — Workflow n8n pronto para importar.

## Como importar

1. Abra o n8n
2. Menu **Workflows** → **Import from File** (ou Ctrl+O)
3. Selecione `classificador-fluxo-concreto.json`
4. Configure as credenciais nos nós que exigirem

## Credenciais necessárias

| Nó | Credencial |
|----|------------|
| Get Session Step | Redis |
| Get Session Data | Redis |
| Save Session Step | Redis |
| Save Session Data | Redis |
| Reset Session | Redis |
| Text Memory | Redis |
| Store Receipt Link1 | Redis |
| Get Receipt Link1 | Redis |
| Upload file1 | Google Drive |
| Analyse Image1 | OpenAI API |

## URLs e variáveis

Ajuste conforme seu ambiente:

- **Get Contact**: URL do `get-or-create-contact`
- **Get Lists from Supabase** (Fetch List for Message): URL do `get-lists-data`
- **Append Lançamento**: URL do `n8n-webhook`
- **Send Text1**: Evolution API (server_url, instance, apikey vêm do Data Handler)

## Chaves Redis

O fluxo usa as chaves:

- `{identifier}:sessao:step` — etapa atual (1–14)
- `{identifier}:sessao:data` — JSON com dados coletados
- `{identifier}` (receipt_link) — link do comprovante no Drive

## Fluxo de cadastro (primeira vez)

Quando o contato não existe, o fluxo envia:

> "Para cadastro, envie: nome, email e base (um por linha). Em seguida você poderá registrar despesas."

Para implementar o cadastro completo, é necessário:

1. Criar endpoint de cadastro (ou usar o existente)
2. Adicionar lógica para parsear nome, email e base
3. Salvar no Redis e avançar para step 1

## Código do Process Step

O nó **Process Step** contém o código compactado. Para usar a versão completa e legível:

1. Abra o arquivo `workflows/process-step-code.js`
2. Copie o conteúdo
3. Cole no nó **Process Step** do workflow, substituindo o código atual

## Ativação

1. Ative o workflow no n8n
2. Use a mesma URL do webhook do fluxo anterior (ex.: `filtro-notas`)
3. Configure o Evolution API para apontar para essa URL

## Diferenças em relação ao fluxo com agente

| Antes (agente) | Depois (fluxo concreto) |
|----------------|--------------------------|
| IA decide o que perguntar | Etapas fixas e previsíveis |
| Risco de alucinação | Sem decisões livres da IA |
| Pode pular perguntas | Ordem garantida |
| Validação implícita | Validação explícita por etapa |
