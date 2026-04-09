# Migração: Get Sheets Data → Supabase

## Visão geral

O fluxo **Get Sheets Data** que lia dados do Google Sheets foi migrado para usar o **Supabase** como fonte de dados.

## O que foi criado

### 1. Tabelas no Supabase (`010_create_list_tables.sql`)

| Tabela | Uso |
|--------|-----|
| `list_bases` | Bases (SP, RJ, ADM, etc) |
| `list_codigos` | Códigos de despesa (ALM, TRA, MKT, etc) |
| `list_fornecedores` | Fornecedores |
| `list_formas_pagamento` | PIX, Boleto, Transferência, etc |
| `list_bases_centro_custo` | Bases de Pagamento / Centros de Custo |
| `list_numeros_referencia` | Nºs de Referência do app de orçamento |

Cada tabela tem: `id`, `nome`/`codigo`/`numero_referencia`, `descricao` (quando aplicável), `ordem`, `ativo`.

### 2. Edge Function `get-lists-data`

**URL:** `POST https://[SEU_PROJETO].supabase.co/functions/v1/get-lists-data`

**Body:**
```json
{ "tipo": "bases" }
```
ou, para filtrar Nºs de referência por base:
```json
{ "tipo": "numeros_referencia", "base": "Caiman" }
```

**Tipos aceitos:**
- `bases`
- `codigos`
- `fornecedores`
- `formas_pagamento`
- `bases_centro_custo`
- `numeros_referencia`

**Resposta:**
```json
{
  "success": true,
  "tipo": "bases",
  "data": [
    { "Base": "SP", "Descrição": "São Paulo" },
    { "Base": "RJ", "Descrição": "Rio de Janeiro" }
  ],
  "count": 2
}
```

### 3. Workflow n8n atualizado

O arquivo `Get Sheets Data` foi alterado para:
1. Receber `tipo` do workflow pai
2. Fazer POST na Edge Function `get-lists-data`
3. Transformar a resposta em itens para o agente de IA

## Passos para migrar

### 1. Executar a migration

No SQL Editor do Supabase ou via CLI:

```bash
supabase db push
```

Ou execute manualmente o conteúdo de `supabase/migrations/010_create_list_tables.sql`.

### 2. Fazer deploy da Edge Function

```bash
supabase functions deploy get-lists-data
```

### 3. Migrar os dados do Google Sheets

Exporte os dados da planilha e insira no Supabase:

```sql
-- Exemplo: bases (ajuste os valores conforme sua planilha)
INSERT INTO list_bases (nome, descricao, ordem) VALUES
  ('SP', 'São Paulo', 1),
  ('RJ', 'Rio de Janeiro', 2);

-- Exemplo: códigos
INSERT INTO list_codigos (codigo, descricao, ordem) VALUES
  ('ALM', 'Alimentação', 1),
  ('TRA', 'Transporte', 2);

-- Exemplo: fornecedores
INSERT INTO list_fornecedores (nome, ordem) VALUES
  ('Fornecedor A', 1),
  ('Fornecedor B', 2);

-- Exemplo: formas de pagamento
INSERT INTO list_formas_pagamento (nome, ordem) VALUES
  ('PIX', 1),
  ('Boleto', 2);

-- Exemplo: bases/centro de custo
INSERT INTO list_bases_centro_custo (nome, descricao, ordem) VALUES
  ('SP - Administrativo', 'Centro de custo SP', 1);

-- Exemplo: números de referência
INSERT INTO list_numeros_referencia (numero_referencia, descricao, ordem) VALUES
  ('REF-001', 'Projeto X', 1);
```

### 4. Configurar o workflow no n8n

1. Importe o novo `Get Sheets Data` no n8n (ou substitua o existente).
2. No nó **Get Lists from Supabase**, configure:
   - **URL:** `https://[SEU_PROJETO].supabase.co/functions/v1/get-lists-data`
   - **Header Authorization:** `Bearer [SUA_SUPABASE_ANON_KEY]`
3. Ou defina as variáveis de ambiente no n8n:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### 5. Gerenciar listas pelo Supabase

As listas passam a ser editadas diretamente no Supabase (Table Editor ou SQL), sem depender do Google Sheets. Você pode criar uma interface no frontend para CRUD dessas tabelas, se quiser.
