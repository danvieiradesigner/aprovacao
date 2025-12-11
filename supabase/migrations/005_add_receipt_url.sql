-- ============================================
-- MIGRAÇÃO 005 - ADICIONAR CAMPO DE COMPROVANTE
-- ============================================

-- Adicionar campo receipt_url para armazenar link da imagem do Google Drive
ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Comentário no campo
COMMENT ON COLUMN approval_requests.receipt_url IS 'URL do comprovante (imagem) armazenado no Google Drive';

