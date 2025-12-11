-- ============================================
-- MIGRAÇÃO 002 - ADICIONAR APPROVER_ID
-- ============================================
-- Execute esta migração se já executou a 001_init.sql anteriormente

-- Adiciona coluna approver_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approval_requests' 
        AND column_name = 'approver_id'
    ) THEN
        ALTER TABLE approval_requests 
        ADD COLUMN approver_id UUID REFERENCES users(id) ON DELETE SET NULL;
        
        -- Cria índice para performance
        CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(approver_id);
        
        RAISE NOTICE 'Coluna approver_id adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna approver_id já existe';
    END IF;
END $$;

