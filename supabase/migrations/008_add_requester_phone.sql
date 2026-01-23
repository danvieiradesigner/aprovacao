-- ============================================
-- MIGRAÇÃO 008 - ADICIONAR REQUESTER_PHONE
-- ============================================
-- Adiciona campo para armazenar número de telefone do contato que enviou a solicitação
-- O número de telefone é o identificador único na tabela contacts

ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS requester_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_phone ON approval_requests(requester_phone);

COMMENT ON COLUMN approval_requests.requester_phone IS 'Número de telefone do contato que enviou a solicitação (identificador único na tabela contacts)';
