-- ============================================
-- Adiciona coluna base em list_numeros_referencia
-- e permite filtrar Nºs de referência por base
-- ============================================

ALTER TABLE list_numeros_referencia
  ADD COLUMN IF NOT EXISTS base TEXT;

CREATE INDEX IF NOT EXISTS idx_list_numeros_referencia_base ON list_numeros_referencia(base);

COMMENT ON COLUMN list_numeros_referencia.base IS 'Base associada ao Nº de referência (para filtrar lista por base)';
