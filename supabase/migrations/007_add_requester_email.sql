-- ============================================
-- MIGRAÇÃO 007 - ADICIONAR REQUESTER_EMAIL
-- ============================================
-- Adiciona campo para armazenar email do contato que enviou a solicitação

ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS requester_email TEXT;

CREATE INDEX IF NOT EXISTS idx_approval_requests_requester_email ON approval_requests(requester_email);

COMMENT ON COLUMN approval_requests.requester_email IS 'Email do contato que enviou a solicitação (para buscar nome na tabela contacts)';
