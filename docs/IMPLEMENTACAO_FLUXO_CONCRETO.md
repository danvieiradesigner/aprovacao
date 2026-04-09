# Implementação do Fluxo Concreto no n8n

Este guia descreve como substituir o agente de IA pelo fluxo determinístico (state machine) no workflow do classificador.

## Visão Geral

**Antes:** O agente "Secretária1" decide o que perguntar com base no contexto. Risco de alucinação e pular perguntas.

**Depois:** Cada etapa é fixa. O fluxo avança apenas quando a resposta é válida. Sem IA para orquestração.

## Estrutura do Novo Fluxo

```
Webhook → Wait → Data Handler → Get Contact → Set Contact Data → Check Contact Exists
                                                                      │
                    ┌─────────────────────────────────────────────────┴──────────────────────┐
                    │                                                                        │
                    ▼ (contato existe)                                              ▼ (novo)
            Get Session Redis                                                    Save Contact
                    │                                                                        │
                    ▼                                                                        │
            Fetch List (se step precisa) ◄── mapeamento step → listType                        │
                    │                                                                        │
                    ▼                                                                        │
            Code: Process Step (workflows/process-step-code.js)                               │
                    │                                                                        │
                    ├── appendLancamento? ──► Call "Registrar Lançamento" ──► Reset Session   │
                    │                                                                        │
                    └── não ──► Fetch List (se listType) ──► Format Message ──► Send Text    │
                                    │                                                       │
                                    └──────────────────────► Save Session Redis ────────────┘
```

## Passo a Passo

### 1. Criar chaves no Redis para sessão

- `{identifier}:sessao:step` — número 1-14
- `{identifier}:sessao:data` — JSON com dados coletados

Use `identifier` = `data.remoteJid` (ex: `5513991698163@s.whatsapp.net`).

### 2. Nó "Get Session State"

Após **Edit Fields7** (que prepara Mensagemtratada, identifier, contact_exists, etc.):

- **Redis Get** com key `={{ $json.identifier }}:sessao:step`
- **Redis Get** com key `={{ $json.identifier }}:sessao:data`
- **Set** para montar objeto: `{ step: $json.value || 1, sessionData: JSON.parse($json.data?.value || '{}') }`

### 3. Nó "Fetch List for Step"

**Switch** ou **IF** baseado em `step`:
- step 1 → HTTP POST get-lists-data `{ tipo: "bases" }`
- step 4 → `{ tipo: "fornecedores" }`
- step 8 → `{ tipo: "formas_pagamento" }`
- step 10 → `{ tipo: "bases_centro_custo" }`
- step 11 → `{ tipo: "numeros_referencia", base: sessionData.base }`
- step 12 → `{ tipo: "codigos", base: sessionData.base }`

Ou um único **HTTP Request** com URL dinâmica e body:
```json
{
  "tipo": "={{ step === 1 ? 'bases' : step === 4 ? 'fornecedores' : step === 8 ? 'formas_pagamento' : step === 10 ? 'bases_centro_custo' : step === 11 ? 'numeros_referencia' : step === 12 ? 'codigos' : '' }}",
  "base": "={{ step === 11 || step === 12 ? sessionData.base : '' }}"
}
```

Só execute se `listType` for não vazio para o step atual.

### 4. Nó "Process Step" (Code)

**Entrada:** Objeto com:
- `step`, `sessionData`, `userInput`, `hasImage`, `imageData`, `link_comprovante`, `contact`, `identifier`
- `listBases`, `listFornecedores`, `listFormasPagamento`, `listBasesCentroCusto`, `listNumerosReferencia`, `listCodigos` (arrays da resposta do get-lists-data)

**Código:** Copiar de `workflows/process-step-code.js`

**Saída:** `{ nextStep, sessionData, message, listType, listBase, valid, appendLancamento }`

### 5. Nó "Branch Append ou Send"

**IF** `appendLancamento === true`:
- **True:** Chamar sub-workflow "Registrar Lançamento no Dash" com os campos de `sessionData`
- Depois: **Redis Set** para limpar sessão (`step` = 1, `data` = {})
- **Send Text:** "Despesa registrada com sucesso!"

- **False:** Continuar para enviar a próxima pergunta

### 6. Nó "Fetch List for Message"

Se `listType` não vazio no retorno do Code:
- HTTP POST get-lists-data com `{ tipo: listType, base: listBase }`
- Formatar mensagem: `message + "\n\n" + formatList(data)`

### 7. Nó "Send Text"

Enviar `message` via Evolution API (mesmo nó **Send Text1** do fluxo atual).

### 8. Nó "Save Session Redis"

- **Redis Set** key `={{ identifier }}:sessao:step` value `={{ nextStep }}`
- **Redis Set** key `={{ identifier }}:sessao:data` value `={{ JSON.stringify(sessionData) }}`

## Tratamento de Imagem

Quando **Message Type** = imagem:
- Fluxo: Convert to File → Upload Drive → Analyse Image → Store Receipt Link
- Antes de ir para o Code, incluir no payload:
  - `hasImage: true`
  - `imageData: { descricao, valor, data, nf }` (do Analyse Image)
  - `link_comprovante` (do Upload Drive)

O Code, no step 2, valida se `hasImage && link_comprovante` e avança para step 3.

## Fluxo de Cadastro (Primeira Vez)

Manter o fluxo atual para **Save Contact** quando `contact_exists === false`. Após salvar, definir `step = 1` e `sessionData = {}` no Redis para esse identifier, para que a próxima mensagem inicie o fluxo de despesa.

## Checklist de Validação

Antes de chamar Append Lançamento, o Code garante:
- base, descritivo, valor, forma_pagamento, base_centro_custo, codigo, data_entrada, fornecedor
- data_vencimento_boleto (se forma_pagamento = Boleto)
- link_comprovante

## Testes Sugeridos

1. **Novo contato:** Enviar nome, email, base → Save Contact → step 1
2. **Despesa completa:** Seguir todas as etapas em ordem
3. **Validação:** Enviar valor inválido em step 6 → deve repetir pergunta
4. **Boleto:** Em step 8 escolher Boleto → step 9 (data vencimento) → step 10
5. **Imagem:** Enviar imagem em step 2 → deve avançar com dados extraídos
