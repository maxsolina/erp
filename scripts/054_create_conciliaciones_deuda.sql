-- 054: Crear tablas para historial de Conciliaciones de Deuda de clientes
-- Permite persistir cada ejecución de conciliación con sus aplicaciones débito/crédito

-- ─── Encabezado de conciliación ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conciliaciones_deuda (
  id              BIGSERIAL PRIMARY KEY,
  fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_id      INTEGER NOT NULL REFERENCES public.clientes(id),
  total_conciliado DECIMAL(18,2) NOT NULL DEFAULT 0,
  usuario         TEXT,
  sucursal_id     INTEGER REFERENCES public.sucursales(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Líneas de aplicación (un par débito/crédito por fila) ──────────────────
CREATE TABLE IF NOT EXISTS public.conciliaciones_deuda_aplicaciones (
  id               BIGSERIAL PRIMARY KEY,
  conciliacion_id  BIGINT NOT NULL REFERENCES public.conciliaciones_deuda(id) ON DELETE CASCADE,
  debito_tipo      TEXT,
  debito_numero    TEXT,
  credito_tipo     TEXT,
  credito_numero   TEXT,
  monto            DECIMAL(18,2) NOT NULL
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conciliaciones_deuda_cliente
  ON public.conciliaciones_deuda(cliente_id);

CREATE INDEX IF NOT EXISTS idx_conciliaciones_deuda_fecha
  ON public.conciliaciones_deuda(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_conciliaciones_deuda_apl_conciliacion
  ON public.conciliaciones_deuda_aplicaciones(conciliacion_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.conciliaciones_deuda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliaciones_deuda_aplicaciones ENABLE ROW LEVEL SECURITY;

-- Política de acceso: todos los roles (consistent con patrón del proyecto)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conciliaciones_deuda' AND policyname = 'allow_all_conciliaciones_deuda'
  ) THEN
    CREATE POLICY "allow_all_conciliaciones_deuda"
      ON public.conciliaciones_deuda
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conciliaciones_deuda_aplicaciones' AND policyname = 'allow_all_conciliaciones_deuda_apl'
  ) THEN
    CREATE POLICY "allow_all_conciliaciones_deuda_apl"
      ON public.conciliaciones_deuda_aplicaciones
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
