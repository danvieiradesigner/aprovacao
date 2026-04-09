# Fluxo Concreto por Estado (State Machine)

## Objetivo

Substituir o fluxo baseado em **agente de IA** por um **fluxo determinístico** onde cada pergunta é uma etapa fixa. Isso elimina:
- **Alucinação**: o agente não decide mais o que perguntar
- **Pular perguntas obrigatórias**: a ordem é garantida pelo fluxo
- **Inconsistência**: validação explícita em cada etapa

## Arquitetura

### Estado no Redis

Para cada sessão de despesa (por `identifier` = remoteJid do WhatsApp):

| Chave | Tipo | Descrição |
|-------|------|-----------|
| `{identifier}:sessao:step` | string | Número da etapa atual (0 a 14) |
| `{identifier}:sessao:data` | JSON | Dados coletados até o momento |

### Etapas do Fluxo (Steps)

| Step | Nome | Obrigatório | Validação | Próxima ação |
|------|------|-------------|-----------|--------------|
| 0 | **cadastro** | Sim (se novo) | Nome, email, base válidos | Save Contact → step 1 |
| 1 | **base** | Sim | Valor da lista `bases` (get-lists-data) | step 2 |
| 2 | **imagem** | Sim | Imagem recebida OU link já salvo | step 3 |
| 3 | **data_entrada** | Sim | YYYY-MM-DD | step 4 |
| 4 | **fornecedor** | Sim | Texto ou valor da lista `fornecedores` | step 5 |
| 5 | **descritivo** | Sim | 3-10 palavras | step 6 |
| 6 | **valor** | Sim | Número > 0 (aceitar R$ 1.234,56) | step 7 |
| 7 | **nf** | Não | Texto ou "não tenho" | step 8 |
| 8 | **forma_pagamento** | Sim | Valor da lista `formas_pagamento` | step 9 ou 10 |
| 9 | **data_vencimento_boleto** | Se Boleto | YYYY-MM-DD | step 10 |
| 10 | **base_centro_custo** | Sim | Valor da lista `bases_centro_custo` | step 11 |
| 11 | **numero_referencia** | Não | Valor da lista `numeros_referencia` filtrado por base | step 12 |
| 12 | **codigo** | Sim | Valor da lista `codigos` | step 13 |
| 13 | **preview** | Sim | "sim" ou "não" | step 14 ou editar |
| 14 | **confirmar** | - | Append Lançamento | Reset step → 1 (nova despesa) |

### Fluxo de Execução (por mensagem)

```
Webhook recebe mensagem
    ↓
Get Contact (verifica se existe)
    ↓
Check Contact Exists
    ├─ NÃO → Fluxo Cadastro (step 0) → Save Contact → step = 1
    └─ SIM → Continuar
    ↓
Get Session State (Redis: step, data)
    ↓
Switch (por step)
    ├─ step 1 → Processar Base
    ├─ step 2 → Processar Imagem
    ├─ step 3 → Processar Data Entrada
    ...
    └─ step 14 → Append Lançamento
    ↓
Para cada step:
  1. Validar resposta do usuário
  2. Se válido: salvar em data, step++
  3. Se inválido: enviar mensagem de erro, manter step
  4. Buscar lista (se necessário) via get-lists-data
  5. Montar mensagem da próxima pergunta
  6. Send Text (WhatsApp)
  7. Save Session State (Redis)
```

### Uso de IA (apenas para extração)

A IA é usada **apenas** quando necessário para **extrair** dados de texto livre ou imagem:

| Momento | Uso da IA | Propósito |
|---------|-----------|-----------|
| Imagem recebida | Analyse Image | Extrair descricao, valor, data, nf da nota |
| Valor em texto | Parser/Regex | Normalizar "R$ 129,90" → 129.90 |
| Descritivo | Nenhum | Usuário digita; validar tamanho |
| Código por descrição | Sugestão opcional | "compra ração" → sugerir códigos relacionados |

**Não** usar IA para:
- Decidir qual pergunta fazer
- Interpretar se o usuário "já respondeu" algo
- Pular etapas

### Validações por Etapa

```javascript
// Exemplo de validações (lógica para n8n Code node ou sub-workflow)
const validacoes = {
  base: (v, lista) => lista.some(x => x.Base === v || x.nome === v),
  data_entrada: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)),
  valor: (v) => {
    const n = parseValorBR(v); // "129,90" → 129.90
    return typeof n === 'number' && n > 0;
  },
  forma_pagamento: (v, lista) => lista.some(x => x.Forma === v || x.nome === v),
  // ...
};
```

### Mensagens Padrão por Etapa

| Step | Mensagem |
|------|----------|
| 1 | "Para qual base vai registrar esta despesa?\n\n{lista bases}" |
| 2 | "Por favor, envie o comprovante (print ou foto da nota)." |
| 3 | "Qual a data da compra? (formato: DD/MM/AAAA)" |
| 4 | "Qual o fornecedor?\n\n{lista ou} Digite o nome:" |
| 5 | "Descreva em poucas palavras sobre o que foi a compra (ex: Almoço iFood):" |
| 6 | "Qual o valor? (ex: 129,90)" |
| 7 | "Qual o número da Nota Fiscal? (ou diga 'não tenho')" |
| 8 | "Qual a forma de pagamento?\n\n{lista}" |
| 9 | "Qual a data de vencimento do boleto? (DD/MM/AAAA)" |
| 10 | "Qual o centro de custo?\n\n{lista}" |
| 11 | "Qual o Nº de referência? (opcional)\n\n{lista}" |
| 12 | "Escolha o código:\n\n{lista codigos}" |
| 13 | "Vou registrar assim:\n{resumo}\n\nConfirmar? (sim/não)" |

## Implementação no n8n

### Opção A: Code Node como Orquestrador

Um único nó **Code** que:
1. Lê step e data do Redis (via input)
2. Identifica o step atual
3. Valida a resposta do usuário para esse step
4. Retorna: `{ nextStep, data, message, valid, listType? }`
5. O fluxo continua com: HTTP (get-lists-data se listType), Set (salvar Redis), Send Text

### Opção B: Switch + Branch por Step

Um nó **Switch** com 15 saídas (step 0 a 14). Cada branch:
- Valida o input
- Chama get-lists-data se precisar de lista
- Monta mensagem
- Salva estado
- Envia resposta

Mais verboso, mas mais visual e fácil de debugar.

### Opção C: Sub-workflow "Processar Step"

Um sub-workflow que recebe: `{ step, userInput, sessionData, contact }` e retorna:
`{ nextStep, sessionData, message, listType?, error? }`.

O workflow principal chama esse sub-workflow e depois executa as ações (HTTP, Redis, Send).

## Implementação: Mapeamento Step → ListType (para fetch antes do Code)

O workflow deve buscar listas **antes** de chamar o Code, para validação:

| Step | listType para fetch |
|------|---------------------|
| 1 | bases |
| 4 | fornecedores |
| 8 | formas_pagamento |
| 10 | bases_centro_custo |
| 11 | numeros_referencia (com base) |
| 12 | codigos (com base) |

## Arquivos Criados

- `workflows/process-step-code.js` — Código completo para o nó Code do n8n. Cole no nó e ajuste as variáveis de ambiente (URL do get-lists-data).

## Migração

1. **Manter** o fluxo atual (classificador.json) como backup
2. **Criar** novo workflow `classificador-fluxo-concreto.json`
3. **Reutilizar**: Webhook, Get Contact, Data Handler, Upload imagem, Analyse Image, Send Text
4. **Substituir**: Secretária1 (agent) → Roteador de Estado (Code node com `process-step-code.js`)
5. **Adicionar**: Get Session State, Save Session State (Redis)
6. **Testar** com cenários: novo contato, despesa completa, despesa com boleto, erro de validação

## Campos Obrigatórios (Checklist)

Antes de chamar Append Lançamento, validar:

- [ ] base
- [ ] description (descritivo)
- [ ] amount (valor)
- [ ] forma_pagamento
- [ ] base_centro_custo
- [ ] codigo
- [ ] data_entrada
- [ ] fornecedor
- [ ] data_vencimento_boleto (se forma_pagamento === "Boleto")
- [ ] link_comprovante (receipt_url)
