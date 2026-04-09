-- ============================================
-- MIGRAÇÃO 014 - BUCKET DE RECIBOS
-- ============================================
-- Cria o bucket 'receipts' no Supabase Storage caso não exista

INSERT INTO storage.buckets (id, name, public)
SELECT 'receipts', 'receipts', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'receipts'
);

-- Políticas de acesso ao bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Service Role Access" ON storage.objects;
CREATE POLICY "Service Role Access" ON storage.objects
  FOR ALL USING (bucket_id = 'receipts') WITH CHECK (bucket_id = 'receipts');
