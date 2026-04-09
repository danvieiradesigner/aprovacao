# Fluxo de Despesas - Novos Campos

## Campos do Fluxo

| Campo | Descrição | Origem |
|------|-----------|--------|
| **Data Entrada** | Data que a pessoa inclui no bot | Usuário |
| **Fornecedor** | Sugestões de lista pré-cadastrada; se não tiver, usuário informa | Get Sheets Data (fornecedores) ou texto livre |
| **Descritivo** | Descrição da compra | Usuário / extração da imagem |
| **Valor** | Valor da despesa | Usuário / extração da imagem |
| **NF** | Número da Nota Fiscal | Usuário / extração da imagem |
| **Forma de Pagamento** | PIX, Boleto, etc | Lista (Get Sheets Data) |
| **Data Vencimento Boleto** | Quando forma = Boleto | Usuário |
| **Base/Centro de Custo** | Base de Pagamento e Centro de Custo | Lista (Get Sheets Data) |
| **Nº de Referência** | Nºs do app de orçamento | Lista (Get Sheets Data) |
| **Data de Pagamento** | Preenchido pelas usuárias (aprovadoras) | Dashboard/Frontend |

## Sub-workflows Necessários

### Get Sheets Data
Estender para aceitar `tipo`:
- `bases` - Bases
- `codigos` - Códigos
- `fornecedores` - Lista de fornecedores
- `formas_pagamento` - PIX, Boleto, etc
- `bases_centro_custo` - Bases de Pagamento e Centros de Custo
- `numeros_referencia` - Nºs de Referência do app de orçamento

### Registrar Lançamento no Dash (workflow S2YKyux4BnzzaXJl)
O sub-workflow precisa aceitar e repassar ao n8n-webhook do Supabase os parâmetros:

**Existentes:** base, description, amount, receipt_url, note, codigo, numero

**Novos (adicionar):**
- `data_entrada` → `data_entrada`
- `fornecedor` → `fornecedor`
- `nf` → `nf`
- `forma_pagamento` → `forma_pagamento`
- `data_vencimento_boleto` → `data_vencimento_boleto`
- `base_centro_custo` → `base_centro_custo`
- `numero_referencia` → `numero_referencia`

No nó HTTP Request que chama o Supabase n8n-webhook, inclua esses campos no body JSON.
