-- ============================================
-- Novos campos para fluxo de despesas (bot)
-- ============================================
-- Data Entrada, Fornecedor, NF, Forma de Pagamento, 
-- Data Vencimento Boleto, Base/Centro de Custo, Nº Referência, Data de Pagamento

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS data_entrada DATE,
  ADD COLUMN IF NOT EXISTS fornecedor TEXT,
  ADD COLUMN IF NOT EXISTS nf TEXT,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS data_vencimento_boleto DATE,
  ADD COLUMN IF NOT EXISTS base_centro_custo TEXT,
  ADD COLUMN IF NOT EXISTS numero_referencia TEXT,
  ADD COLUMN IF NOT EXISTS data_pagamento DATE;

COMMENT ON COLUMN approval_requests.data_entrada IS 'Data que a pessoa incluiu no bot (data da compra/despesa)';
COMMENT ON COLUMN approval_requests.fornecedor IS 'Fornecedor - da lista pré-cadastrada ou informado pelo usuário';
COMMENT ON COLUMN approval_requests.nf IS 'Número da Nota Fiscal';
COMMENT ON COLUMN approval_requests.forma_pagamento IS 'Forma de pagamento: PIX, Boleto, etc';
COMMENT ON COLUMN approval_requests.data_vencimento_boleto IS 'Data de vencimento do boleto (quando forma = Boleto)';
COMMENT ON COLUMN approval_requests.base_centro_custo IS 'Base de Pagamento / Centro de Custo';
COMMENT ON COLUMN approval_requests.numero_referencia IS 'Nº de Referência do app de orçamento';
COMMENT ON COLUMN approval_requests.data_pagamento IS 'Data de pagamento - preenchido pelas usuárias (aprovadoras)';

CREATE INDEX IF NOT EXISTS idx_approval_requests_fornecedor ON approval_requests(fornecedor);
CREATE INDEX IF NOT EXISTS idx_approval_requests_data_entrada ON approval_requests(data_entrada);
CREATE INDEX IF NOT EXISTS idx_approval_requests_data_pagamento ON approval_requests(data_pagamento);
