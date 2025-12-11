-- ============================================
-- MIGRAÇÃO INICIAL - CONTROLE DE ALCADA
-- ============================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'REQUESTER', 'APPROVER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de solicitações
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_code TEXT UNIQUE NOT NULL,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    base TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CANCELED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de eventos (timeline/auditoria)
CREATE TABLE IF NOT EXISTS request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'APPROVE', 'REJECT', 'NEEDS_INFO', 'CANCEL', 'UPDATE_NOTE')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de contadores para id_code sequencial
CREATE TABLE IF NOT EXISTS request_counters (
    year INTEGER PRIMARY KEY,
    seq INTEGER NOT NULL DEFAULT 0
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created ON approval_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_request_events_request ON request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_request_events_actor ON request_events(actor_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabela opcional de regras de alçada (para futuras expansões)
CREATE TABLE IF NOT EXISTS approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base TEXT NOT NULL,
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    required_role TEXT NOT NULL CHECK (required_role IN ('APPROVER', 'ADMIN')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Usuários do sistema com diferentes roles';
COMMENT ON TABLE approval_requests IS 'Solicitações de aprovação de despesas';
COMMENT ON TABLE request_events IS 'Histórico de eventos/auditoria das solicitações';
COMMENT ON TABLE request_counters IS 'Contador sequencial para geração de id_code';
COMMENT ON TABLE approval_rules IS 'Regras de alçada para aprovação (opcional)';

