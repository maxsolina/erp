-- ============================================================
-- 113 · Linkar caja_bancos_permitidos ↔ caja_valores via FK + triggers
--
-- Hasta hoy: "Bancos Permitidos" era una tabla aislada que nadie consumía.
-- Ahora: cada fila de caja_bancos_permitidos genera AUTOMÁTICAMENTE un
-- caja_valor de tipo='banco_cheques' subtipo='banco', y lo mantiene en
-- sync (insert/update/delete). El picker de medios de pago lee solo de
-- caja_valores, así que ahora "agregar un banco permitido" es suficiente
-- para que el banco aparezca en pagos sin tener que duplicar config.
--
-- Diseño:
--   • caja_valores.banco_permitido_id (FK) marca al valor como "auto-
--     generado". NULL = valor manual (Efectivo, Tarjeta, etc.).
--   • ON DELETE CASCADE en la FK: borrar el banco_permitido borra el
--     caja_valor. Si el caja_valor tiene movimientos, otras FKs
--     (movimientos_caja → caja_valores) lo bloquean — el error sube
--     al frontend que muestra "tiene movimientos, no se puede borrar".
--   • Triggers en INSERT y UPDATE para mantener sync.
--
-- Idempotente: IF NOT EXISTS, ON CONFLICT DO NOTHING.
-- ============================================================

-- ─── 1. Columna FK + back-reference ─────────────────────────
ALTER TABLE public.caja_valores
  ADD COLUMN IF NOT EXISTS banco_permitido_id UUID
  REFERENCES public.caja_bancos_permitidos(id) ON DELETE CASCADE;

-- Índice para que el sync trigger sea rápido (busca por banco_permitido_id)
CREATE INDEX IF NOT EXISTS idx_caja_valores_banco_permitido
  ON public.caja_valores(banco_permitido_id);

-- Asegurar que cada banco_permitido genera UN solo caja_valor
-- (no múltiples filas para el mismo banco_permitido).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caja_valores_banco_permitido_unique'
  ) THEN
    ALTER TABLE public.caja_valores
      ADD CONSTRAINT caja_valores_banco_permitido_unique UNIQUE (banco_permitido_id);
  END IF;
END $$;


-- ─── 2. Trigger: AFTER INSERT en caja_bancos_permitidos ─────
-- Crea el caja_valor correspondiente automáticamente.
CREATE OR REPLACE FUNCTION public.fn_crear_caja_valor_banco_permitido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_codigo TEXT;
BEGIN
  -- Codigo único: BAN- + primeros 8 chars del UUID del banco_permitido.
  -- Garantizado único porque el UUID lo es.
  v_codigo := 'BAN-' || UPPER(LEFT(NEW.id::text, 8));

  INSERT INTO public.caja_valores
    (caja_id, nombre, codigo, tipo, subtipo, moneda, activo, banco_permitido_id)
  VALUES (
    NEW.caja_id,
    NEW.banco_nombre,
    v_codigo,
    'banco_cheques',
    'banco',
    COALESCE(NEW.moneda, 'ARS'),
    true,
    NEW.id
  )
  ON CONFLICT (codigo) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crear_caja_valor_banco_permitido ON public.caja_bancos_permitidos;
CREATE TRIGGER trg_crear_caja_valor_banco_permitido
AFTER INSERT ON public.caja_bancos_permitidos
FOR EACH ROW EXECUTE FUNCTION public.fn_crear_caja_valor_banco_permitido();


-- ─── 3. Trigger: AFTER UPDATE en caja_bancos_permitidos ─────
-- Mantiene sincronizados nombre y moneda del caja_valor.
CREATE OR REPLACE FUNCTION public.fn_sync_caja_valor_banco_permitido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.banco_nombre IS DISTINCT FROM NEW.banco_nombre
     OR OLD.moneda      IS DISTINCT FROM NEW.moneda THEN
    UPDATE public.caja_valores
       SET nombre = NEW.banco_nombre,
           moneda = COALESCE(NEW.moneda, moneda)
     WHERE banco_permitido_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_caja_valor_banco_permitido ON public.caja_bancos_permitidos;
CREATE TRIGGER trg_sync_caja_valor_banco_permitido
AFTER UPDATE ON public.caja_bancos_permitidos
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_caja_valor_banco_permitido();


-- ─── 4. Backfill: bancos permitidos viejos sin caja_valor ───
-- Para los registros que ya existían antes de este script.
INSERT INTO public.caja_valores
  (caja_id, nombre, codigo, tipo, subtipo, moneda, activo, banco_permitido_id)
SELECT
  bp.caja_id,
  bp.banco_nombre,
  'BAN-' || UPPER(LEFT(bp.id::text, 8)),
  'banco_cheques',
  'banco',
  COALESCE(bp.moneda, 'ARS'),
  true,
  bp.id
FROM public.caja_bancos_permitidos bp
WHERE NOT EXISTS (
  SELECT 1 FROM public.caja_valores cv WHERE cv.banco_permitido_id = bp.id
)
ON CONFLICT (codigo) DO NOTHING;


-- ─── 5. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
