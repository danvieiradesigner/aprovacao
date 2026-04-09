-- ============================================
-- MIGRAÇÃO 013 - TABELA DE SESSÕES WHATSAPP
-- ============================================
-- Armazena o estado da conversa com cada usuário para o fluxo de despesas

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    phone_number TEXT PRIMARY KEY,
    step INTEGER DEFAULT 1,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage whatsapp sessions" ON whatsapp_sessions;
CREATE POLICY "Service role can manage whatsapp sessions"
  ON whatsapp_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER trigger_update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_sessions_updated_at();

COMMENT ON TABLE whatsapp_sessions IS 'Estado da conversa (máquina de estados) para preenchimento de despesas via WhatsApp';
