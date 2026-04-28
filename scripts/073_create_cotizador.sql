-- ============================================================
-- Cotizador de equipos (Plan Canje)
-- Soporta:
--   - Cotizador interno del módulo Toma de Equipo
--   - Cotizador público de la web (fase posterior)
-- Las 4 tablas son la fuente única de criterios.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- cotizador_categorias
-- Categorías de evaluación (Pantalla, Batería, Carteles, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cotizador_categorias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL UNIQUE,
  orden       INTEGER NOT NULL DEFAULT 0,
  accion      TEXT NOT NULL CHECK (accion IN ('descuento', 'whatsapp', 'cartel_sistema')),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_cotizador_categorias_updated_at ON public.cotizador_categorias;
CREATE TRIGGER trg_cotizador_categorias_updated_at
  BEFORE UPDATE ON public.cotizador_categorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- cotizador_modelos
-- Modelos de equipo cotizables (FK al maestro de productos).
-- valor_base_usd = precio si el equipo está impecable.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cotizador_modelos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id     BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  valor_base_usd  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_base_usd >= 0),
  marca           TEXT NOT NULL DEFAULT 'Apple',
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  orden           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (producto_id)
);

CREATE INDEX IF NOT EXISTS idx_cotizador_modelos_producto_id
  ON public.cotizador_modelos (producto_id);
CREATE INDEX IF NOT EXISTS idx_cotizador_modelos_activo
  ON public.cotizador_modelos (activo) WHERE activo = TRUE;

DROP TRIGGER IF EXISTS trg_cotizador_modelos_updated_at ON public.cotizador_modelos;
CREATE TRIGGER trg_cotizador_modelos_updated_at
  BEFORE UPDATE ON public.cotizador_modelos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- cotizador_criterios
-- Opciones de evaluación por modelo+categoría con su descuento
-- nominal en USD. El % se calcula en runtime, no se guarda.
--
-- Regla: cada (modelo, categoría) debe tener al menos una opción
-- con descuento_usd = 0 (estado impecable). Validación a nivel
-- de aplicación, no de DB, para no bloquear inserciones parciales.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cotizador_criterios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id      UUID NOT NULL REFERENCES public.cotizador_modelos(id) ON DELETE CASCADE,
  categoria_id   UUID NOT NULL REFERENCES public.cotizador_categorias(id) ON DELETE RESTRICT,
  etiqueta       TEXT NOT NULL,
  descuento_usd  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (descuento_usd >= 0),
  orden          INTEGER NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (modelo_id, categoria_id, etiqueta)
);

CREATE INDEX IF NOT EXISTS idx_cotizador_criterios_modelo
  ON public.cotizador_criterios (modelo_id);
CREATE INDEX IF NOT EXISTS idx_cotizador_criterios_categoria
  ON public.cotizador_criterios (categoria_id);

DROP TRIGGER IF EXISTS trg_cotizador_criterios_updated_at ON public.cotizador_criterios;
CREATE TRIGGER trg_cotizador_criterios_updated_at
  BEFORE UPDATE ON public.cotizador_criterios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- cotizador_exclusiones
-- Condiciones que bloquean la cotización (mojado, bloqueado, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cotizador_exclusiones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion  TEXT NOT NULL UNIQUE,
  orden        INTEGER NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_cotizador_exclusiones_updated_at ON public.cotizador_exclusiones;
CREATE TRIGGER trg_cotizador_exclusiones_updated_at
  BEFORE UPDATE ON public.cotizador_exclusiones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS
-- Por ahora todo autenticado (web pública es fase posterior).
-- ============================================================
ALTER TABLE public.cotizador_categorias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizador_modelos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizador_criterios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizador_exclusiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotizador_categorias_all"  ON public.cotizador_categorias  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cotizador_modelos_all"     ON public.cotizador_modelos     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cotizador_criterios_all"   ON public.cotizador_criterios   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cotizador_exclusiones_all" ON public.cotizador_exclusiones FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seeds: solo catálogos fijos (categorías + exclusiones).
-- Modelos y criterios los carga el operador desde el ERP.
-- ============================================================

INSERT INTO public.cotizador_categorias (nombre, orden, accion) VALUES
  ('Pantalla',         1, 'descuento'),
  ('Batería',          2, 'descuento'),
  ('Tapa Trasera',     3, 'descuento'),
  ('Carteles Sistema', 4, 'cartel_sistema'),
  ('Carcasa',          5, 'whatsapp'),
  ('Cámaras',          6, 'whatsapp')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.cotizador_exclusiones (descripcion, orden) VALUES
  ('Equipo mojado',                  1),
  ('Equipo bloqueado (iCloud lock)', 2),
  ('Sin señal',                      3),
  ('Sin WiFi / Bluetooth',           4),
  ('No prende',                      5),
  ('Repuestos faltantes',            6)
ON CONFLICT (descripcion) DO NOTHING;
