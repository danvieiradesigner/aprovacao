-- ============================================
-- Tabelas de listas (substituem Google Sheets)
-- ============================================
-- bases, codigos, fornecedores, formas_pagamento, bases_centro_custo, numeros_referencia

-- Bases (SP, RJ, ADM, etc)
CREATE TABLE IF NOT EXISTS list_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Códigos de despesa (ALM, TRA, MKT, etc)
CREATE TABLE IF NOT EXISTS list_codigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE IF NOT EXISTS list_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Formas de pagamento (PIX, Boleto, etc)
CREATE TABLE IF NOT EXISTS list_formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bases de Pagamento / Centros de Custo
CREATE TABLE IF NOT EXISTS list_bases_centro_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nºs de Referência do app de orçamento
CREATE TABLE IF NOT EXISTS list_numeros_referencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_referencia TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_list_bases_ativo ON list_bases(ativo);
CREATE INDEX IF NOT EXISTS idx_list_codigos_ativo ON list_codigos(ativo);
CREATE INDEX IF NOT EXISTS idx_list_fornecedores_ativo ON list_fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_list_formas_pagamento_ativo ON list_formas_pagamento(ativo);
CREATE INDEX IF NOT EXISTS idx_list_bases_centro_custo_ativo ON list_bases_centro_custo(ativo);
CREATE INDEX IF NOT EXISTS idx_list_numeros_referencia_ativo ON list_numeros_referencia(ativo);

-- Dados iniciais (exemplos - ajuste conforme sua planilha)
INSERT INTO list_bases (nome, descricao, ordem) VALUES
  ('SP', 'São Paulo', 1),
  ('RJ', 'Rio de Janeiro', 2),
  ('ADM', 'Administrativo', 3),
  ('FRE', 'Frete', 4)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO list_codigos (codigo, descricao, ordem) VALUES
  ('ALM', 'Alimentação', 1),
  ('TRA', 'Transporte', 2),
  ('MKT', 'Marketing', 3),
  ('ADM', 'Administrativo', 4),
  ('FRE', 'Frete/Entrega', 5)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO list_formas_pagamento (nome, ordem) VALUES
  ('PIX', 1),
  ('Boleto', 2),
  ('Transferência', 3),
  ('Cartão', 4)
ON CONFLICT (nome) DO NOTHING;

COMMENT ON TABLE list_bases IS 'Lista de bases (substitui Google Sheets)';
COMMENT ON TABLE list_codigos IS 'Códigos de despesa (ALM, TRA, etc)';
COMMENT ON TABLE list_fornecedores IS 'Lista de fornecedores';
COMMENT ON TABLE list_formas_pagamento IS 'Formas de pagamento (PIX, Boleto, etc)';
COMMENT ON TABLE list_bases_centro_custo IS 'Bases de Pagamento e Centros de Custo';
COMMENT ON TABLE list_numeros_referencia IS 'Nºs de Referência do app de orçamento';
