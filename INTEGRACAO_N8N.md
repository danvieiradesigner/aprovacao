# Integração com n8n

Este documento descreve como configurar e usar a integração entre o sistema de aprovação e o n8n.

## Visão Geral

A integração permite:
- **Receber dados do n8n**: O n8n pode enviar solicitações de aprovação para o sistema
- **Enviar atualizações para n8n**: O sistema notifica o n8n quando há mudanças de status nas solicitações

## Configuração

### 1. Variáveis de Ambiente

Adicione no arquivo `.env` do backend:

```env
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/atualizacoes
```

Esta URL será usada para enviar notificações de atualizações de status para o n8n.

### 2. Endpoint para Receber Dados do n8n

O sistema expõe uma **Edge Function do Supabase** para receber dados do n8n:

**URL**: `POST https://[SEU_PROJETO].supabase.co/functions/v1/n8n-webhook`

**Autenticação**: Requer header `apikey` com a chave anon do Supabase (ou service role para bypass RLS)

**Headers necessários**:
```
apikey: [SUA_SUPABASE_ANON_KEY]
Content-Type: application/json
```

**Exemplo de Payload**:

```json
{
  "id_code": "REQ-2024-0001",
  "requester_id": "uuid-do-requester",
  "requester_email": "usuario@exemplo.com",
  "approver_id": "uuid-do-approver",
  "approver_email": "aprovador@exemplo.com",
  "base": "SP",
  "description": "Despesa de viagem",
  "amount": 1500.50,
  "note": "Observações adicionais",
  "receipt_url": "https://drive.google.com/file/d/123456789/view",
  "status": "PENDING",
  "data_entrada": "2024-01-15",
  "fornecedor": "Fornecedor XYZ",
  "nf": "123456",
  "forma_pagamento": "PIX",
  "data_vencimento_boleto": "2024-01-20",
  "base_centro_custo": "SP - Administrativo",
  "numero_referencia": "REF-001"
}
```

**Campos Obrigatórios**:
- `base`: Base da solicitação
- `description`: Descrição da solicitação
- `amount`: Valor numérico positivo
- `requester_id` OU `requester_email`: Identificação do solicitante

**Campos Opcionais**:
- `id_code`: Código único da solicitação (gerado automaticamente se não fornecido)
- `approver_id` ou `approver_email`: Aprovador atribuído
- `note`: Observações
- `receipt_url`: URL do comprovante no Google Drive
- `status`: Status inicial (padrão: PENDING)
- `data_entrada`: Data da compra/despesa (YYYY-MM-DD)
- `fornecedor`: Nome do fornecedor
- `nf`: Número da Nota Fiscal
- `forma_pagamento`: PIX, Boleto, etc
- `data_vencimento_boleto`: Data de vencimento do boleto (YYYY-MM-DD)
- `base_centro_custo`: Base de Pagamento / Centro de Custo
- `numero_referencia`: Nº de Referência do app de orçamento

**Resposta de Sucesso**:

```json
{
  "success": true,
  "request": {
    "id": "uuid",
    "id_code": "REQ-2024-0001",
    "requester_id": "uuid",
    "approver_id": "uuid",
    "base": "SP",
    "description": "Despesa de viagem",
    "amount": "1500.50",
    "note": "Observações adicionais",
    "receipt_url": "https://drive.google.com/file/d/123456789/view",
    "status": "PENDING",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Resposta de Erro**:

```json
{
  "error": "Mensagem de erro",
  "details": []  // Array com detalhes de validação (se houver)
}
```

### 3. Notificações para o n8n

Quando uma solicitação é atualizada (aprovada, rejeitada, cancelada, etc.), o sistema automaticamente envia uma notificação para o webhook configurado em `N8N_WEBHOOK_URL`.

**Payload Enviado**:

```json
{
  "request_id": "uuid",
  "id_code": "REQ-2024-0001",
  "requester_id": "uuid",
  "requester_email": "usuario@exemplo.com",
  "approver_id": "uuid",
  "approver_email": "aprovador@exemplo.com",
  "base": "SP",
  "description": "Despesa de viagem",
  "amount": "1500.50",
  "note": "Observações adicionais",
  "receipt_url": "https://drive.google.com/file/d/123456789/view",
  "status": "APPROVED",
  "event": {
    "action": "APPROVE",
    "status": "APPROVED",
    "message": "Aprovado pelo gestor",
    "timestamp": "2024-01-15T11:00:00Z"
  }
}
```

**Eventos que Disparam Notificações**:
- `APPROVE`: Solicitação aprovada
- `REJECT`: Solicitação rejeitada
- `NEEDS_INFO`: Solicitação precisa de esclarecimento
- `CANCEL`: Solicitação cancelada
- `UPDATE_NOTE`: Nota atualizada

## Configuração no n8n

### Workflow 1: Enviar Solicitação para o Sistema

1. Crie um novo workflow no n8n
2. Adicione um nó **HTTP Request**
3. Configure:
   - **Method**: POST
   - **URL**: `https://[SEU_PROJETO].supabase.co/functions/v1/n8n-webhook`
   - **Headers**:
     - `apikey`: [SUA_SUPABASE_ANON_KEY]
     - `Content-Type`: `application/json`
   - **Body**: JSON com os dados da solicitação
   
**Exemplo de configuração no n8n**:
```
URL: https://abcdefghijklmnop.supabase.co/functions/v1/n8n-webhook
Method: POST
Headers:
  - apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  - Content-Type: application/json
Body (JSON):
{
  "base": "SP",
  "description": "Despesa de viagem",
  "amount": 1500.50,
  "requester_email": "usuario@exemplo.com",
  "approver_email": "aprovador@exemplo.com",
  "receipt_url": "https://drive.google.com/file/d/123456789/view"
}
```

### Workflow 2: Receber Atualizações do Sistema

1. Crie um novo workflow no n8n
2. Adicione um nó Webhook
3. Configure o webhook para receber POST requests
4. Copie a URL do webhook gerada
5. Configure essa URL na variável `N8N_WEBHOOK_URL` do backend

## Exemplo de Uso

### Enviar Solicitação do n8n para o Sistema

```javascript
// No n8n, use um nó HTTP Request
{
  "base": "SP",
  "description": "Despesa de viagem para reunião",
  "amount": 1500.50,
  "requester_email": "joao@exemplo.com",
  "approver_email": "maria@exemplo.com",
  "receipt_url": "https://drive.google.com/file/d/abc123/view",
  "note": "Viagem aprovada pelo gestor"
}
```

### Processar Atualização Recebida do Sistema

No n8n, você pode processar as atualizações recebidas e executar ações como:
- Enviar email de notificação
- Atualizar planilhas
- Integrar com outros sistemas
- Criar tarefas em sistemas de gestão

## Segurança

⚠️ **Importante**: O endpoint `/api/n8n/webhook` é público e não requer autenticação. Para maior segurança em produção:

1. Implemente validação de origem (IP whitelist)
2. Use tokens de autenticação no header
3. Configure HTTPS
4. Valide assinaturas de webhook

## Troubleshooting

### Notificações não estão sendo enviadas

1. Verifique se `N8N_WEBHOOK_URL` está configurado corretamente
2. Verifique os logs do backend para erros
3. Teste a URL do webhook manualmente

### Erro ao criar solicitação

1. Verifique se o `requester_email` existe no sistema
2. Verifique se os campos obrigatórios estão presentes
3. Verifique o formato do `amount` (deve ser número positivo)

### Comprovante não aparece

1. Verifique se o `receipt_url` é uma URL válida do Google Drive
2. Certifique-se de que o link do Drive está configurado como "Qualquer pessoa com o link pode ver"

