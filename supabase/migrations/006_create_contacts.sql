-- ============================================
-- MIGRAÇÃO 006 - TABELA DE CONTATOS/PESSOAS
-- ============================================
-- Armazena dados das pessoas que interagem via WhatsApp

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    base TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_base ON contacts(base);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all contacts" ON contacts;
CREATE POLICY "Users can view all contacts"
  ON contacts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage contacts" ON contacts;
CREATE POLICY "Service role can manage contacts"
  ON contacts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contacts_updated_at ON contacts;
CREATE TRIGGER trigger_update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

COMMENT ON TABLE contacts IS 'Contatos/pessoas que interagem via WhatsApp';
COMMENT ON COLUMN contacts.phone_number IS 'Número do WhatsApp (identificador único)';
COMMENT ON COLUMN contacts.base IS 'Base padrão da pessoa (ex: SP, RJ, ADM)';
