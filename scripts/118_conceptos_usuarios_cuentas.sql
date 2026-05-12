-- 118_conceptos_usuarios_cuentas.sql
-- Permite restringir un concepto:
--   - Por usuario (concepto_usuarios): solo esos usuarios lo ven en el dropdown
--     de concepto en Registros / Ajustes. Si la tabla está vacía para un
--     concepto, el concepto es visible para todos (compatibilidad hacia atrás).
--   - Por cuentas contables permitidas (concepto_cuentas_permitidas): cuando
--     el usuario carga un comprobante con ese concepto, la cuenta contable
--     del comprobante debe ser una de:
--       a) cuenta_contable_ingresos del concepto
--       b) cuenta_contable_egresos del concepto
--       c) alguna en concepto_cuentas_permitidas

-- usuarios.id es INTEGER (bigserial). El FK debe ser BIGINT para coincidir.
CREATE TABLE IF NOT EXISTS concepto_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto_id UUID NOT NULL REFERENCES conceptos_registro_caja(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (concepto_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_concepto_usuarios_concepto ON concepto_usuarios(concepto_id);
CREATE INDEX IF NOT EXISTS idx_concepto_usuarios_usuario ON concepto_usuarios(usuario_id);

CREATE TABLE IF NOT EXISTS concepto_cuentas_permitidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto_id UUID NOT NULL REFERENCES conceptos_registro_caja(id) ON DELETE CASCADE,
  cuenta_codigo VARCHAR(100) NOT NULL,
  cuenta_nombre VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (concepto_id, cuenta_codigo)
);

CREATE INDEX IF NOT EXISTS idx_concepto_cuentas_concepto ON concepto_cuentas_permitidas(concepto_id);

-- RLS: permitir todo a usuarios autenticados (igual que el resto del módulo finanzas).
ALTER TABLE concepto_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepto_cuentas_permitidas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepto_usuarios' AND policyname = 'allow_all_authenticated') THEN
    CREATE POLICY allow_all_authenticated ON concepto_usuarios
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepto_cuentas_permitidas' AND policyname = 'allow_all_authenticated') THEN
    CREATE POLICY allow_all_authenticated ON concepto_cuentas_permitidas
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
